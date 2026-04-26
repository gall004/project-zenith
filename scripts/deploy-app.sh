#!/usr/bin/env bash
# ==================================================================
# Project Zenith — Idempotent Production Deploy
# ==================================================================
# Reads all config from deploy-app.env. Safe to re-run at any time.
# Usage: ./scripts/deploy-app.sh
# ==================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Load config ───────────────────────────────────────────────────
if [ ! -f "${SCRIPT_DIR}/deploy-app.env" ]; then
  echo "ERROR: ${SCRIPT_DIR}/deploy-app.env not found. Copy deploy-app.env.example and fill in your values."
  exit 1
fi
# shellcheck source=deploy-app.env
source "${SCRIPT_DIR}/deploy-app.env"

# ── Output helpers ────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'
log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC}  $1"; }

# ── Prerequisite checks ──────────────────────────────────────────
command -v gcloud >/dev/null 2>&1 || err "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
command -v docker >/dev/null 2>&1 || err "docker not found. Install Docker Desktop."

log "Deploying Project Zenith to ${PROJECT_ID} (${REGION})"
gcloud config set project "${PROJECT_ID}" --quiet 2>/dev/null

# ── Step 1: Enable APIs ──────────────────────────────────────────
log "Step 1/9: Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  redis.googleapis.com \
  vpcaccess.googleapis.com \
  --quiet

# ── Step 2: Artifact Registry ────────────────────────────────────
log "Step 2/9: Artifact Registry..."
if gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" &>/dev/null; then
  info "Repository '${AR_REPO}' already exists."
else
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Project Zenith container images" \
    --quiet
  log "Created Artifact Registry: ${AR_REPO}"
fi

AR_PREFIX="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"

# Configure Docker auth for Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet 2>/dev/null

# ── Step 3: Service Account ──────────────────────────────────────
log "Step 3/9: Service Account..."
SA_EMAIL="${BACKEND_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "${SA_EMAIL}" &>/dev/null; then
  info "Service account '${BACKEND_SA}' already exists."
else
  gcloud iam service-accounts create "${BACKEND_SA}" \
    --display-name="Zenith Backend Service Account" \
    --quiet
  log "Created service account: ${BACKEND_SA}"
fi

# Grant required roles (idempotent)
for role in roles/secretmanager.secretAccessor roles/vpcaccess.user; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${role}" \
    --condition=None \
    --quiet 2>/dev/null
done

# ── Step 4: Secret Manager ───────────────────────────────────────
log "Step 4/9: Secret Manager..."
SECRETS_MISSING=false

create_or_update_secret() {
  local S_NAME=$1
  local S_VALUE=$2
  if gcloud secrets describe "${S_NAME}" &>/dev/null; then
    info "Secret '${S_NAME}' exists."
  else
    gcloud secrets create "${S_NAME}" --replication-policy="automatic" --quiet
    log "Created secret: ${S_NAME}"
  fi

  if [ -n "${S_VALUE:-}" ]; then
    echo -n "${S_VALUE}" | gcloud secrets versions add "${S_NAME}" --data-file=- --quiet
    log "Updated secret value for ${S_NAME}"
  elif ! gcloud secrets versions list "${S_NAME}" --limit=1 --format="value(name)" 2>/dev/null | grep -q .; then
    warn "Secret '${S_NAME}' has NO value set."
    SECRETS_MISSING=true
  fi
}

create_or_update_secret "${SECRET_LIVEKIT_API_KEY}" "${LIVEKIT_API_KEY:-}"
create_or_update_secret "${SECRET_LIVEKIT_API_SECRET}" "${LIVEKIT_API_SECRET:-}"
create_or_update_secret "${SECRET_GEMINI_API_KEY}" "${GEMINI_API_KEY:-}"

if [ "${SECRETS_MISSING}" = true ]; then
  warn "Some secrets have no values. Deploy will continue, but the backend will fail at runtime."
  warn "Populate secrets manually or add them to deploy-app.env and re-run this script."
fi

# ── Step 5: VPC Connector ────────────────────────────────────────
log "Step 5/9: Serverless VPC Access Connector..."
if gcloud compute networks vpc-access connectors describe "${VPC_CONNECTOR}" --region="${REGION}" &>/dev/null; then
  info "VPC connector '${VPC_CONNECTOR}' already exists."
else
  gcloud compute networks vpc-access connectors create "${VPC_CONNECTOR}" \
    --region="${REGION}" \
    --network="${VPC_NETWORK}" \
    --range="${VPC_RANGE}" \
    --min-instances=2 \
    --max-instances=3 \
    --quiet
  log "Created VPC connector: ${VPC_CONNECTOR}"
fi

# ── Step 6: Memorystore (Redis) ──────────────────────────────────
log "Step 6/9: Memorystore Redis..."
if gcloud redis instances describe "${REDIS_INSTANCE}" --region="${REGION}" &>/dev/null; then
  info "Memorystore '${REDIS_INSTANCE}' already exists."
else
  log "Creating Memorystore instance (this takes 3-5 minutes)..."
  gcloud redis instances create "${REDIS_INSTANCE}" \
    --region="${REGION}" \
    --tier="${REDIS_TIER}" \
    --size="${REDIS_SIZE_GB}" \
    --redis-version=redis_7_0 \
    --network="${VPC_NETWORK}" \
    --quiet
  log "Created Memorystore: ${REDIS_INSTANCE}"
fi

REDIS_HOST=$(gcloud redis instances describe "${REDIS_INSTANCE}" \
  --region="${REGION}" --format="value(host)")
REDIS_PORT=$(gcloud redis instances describe "${REDIS_INSTANCE}" \
  --region="${REGION}" --format="value(port)")
REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}/0"
info "Memorystore Redis: ${REDIS_URL}"

# ── Step 7: Build & push backend ─────────────────────────────────
log "Step 7/9: Building backend image..."
docker build \
  --platform linux/amd64 \
  -t "${AR_PREFIX}/${BACKEND_SERVICE}:latest" \
  -f "${PROJECT_ROOT}/backend/Dockerfile" \
  "${PROJECT_ROOT}/backend"

docker push "${AR_PREFIX}/${BACKEND_SERVICE}:latest"
log "Backend image pushed."

# ── Step 8: Deploy backend → get URL → build & deploy frontend ──
log "Step 8/9: Deploying backend to Cloud Run..."
gcloud run deploy "${BACKEND_SERVICE}" \
  --image="${AR_PREFIX}/${BACKEND_SERVICE}:latest" \
  --region="${REGION}" \
  --platform=managed \
  --service-account="${SA_EMAIL}" \
  --vpc-connector="${VPC_CONNECTOR}" \
  --vpc-egress=private-ranges-only \
  --memory="${BACKEND_MEMORY}" \
  --cpu="${BACKEND_CPU}" \
  --min-instances="${BACKEND_MIN_INSTANCES}" \
  --max-instances="${BACKEND_MAX_INSTANCES}" \
  --timeout="${BACKEND_TIMEOUT}" \
  --session-affinity \
  --no-use-http2 \
  --allow-unauthenticated \
  --set-env-vars="\
REDIS_URL=${REDIS_URL},\
GCP_PROJECT_ID=${PROJECT_ID},\
CES_APP_ID=${CES_APP_ID},\
CES_REGION=${CES_REGION},\
LIVEKIT_URL=${LIVEKIT_URL}" \
  --set-secrets="\
LIVEKIT_API_KEY=${SECRET_LIVEKIT_API_KEY}:latest,\
LIVEKIT_API_SECRET=${SECRET_LIVEKIT_API_SECRET}:latest,\
GEMINI_API_KEY=${SECRET_GEMINI_API_KEY}:latest" \
  --quiet

# Get the backend's public URL
BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" \
  --region="${REGION}" --format="value(status.url)")
log "Backend live: ${BACKEND_URL}"

if [ -n "${BACKEND_DOMAIN:-}" ]; then
  BACKEND_URL="https://${BACKEND_DOMAIN}"
  log "Using custom backend domain: ${BACKEND_URL}"
fi

# Update backend with self-referencing URLs and CORS origins
CORS_ORIGINS="https://${FRONTEND_DOMAIN:-localhost},http://localhost:3000"
gcloud run services update "${BACKEND_SERVICE}" \
  --region="${REGION}" \
  --update-env-vars="^@^FASTAPI_BACKEND_URL=${BACKEND_URL}@CORS_ORIGINS=${CORS_ORIGINS}" \
  --quiet

# Build frontend with the backend URL baked in
log "Building frontend image..."
docker build \
  --platform linux/amd64 \
  -t "${AR_PREFIX}/${FRONTEND_SERVICE}:latest" \
  --build-arg "NEXT_PUBLIC_API_BASE_URL=${BACKEND_URL}" \
  --build-arg "NEXT_PUBLIC_LIVEKIT_URL=${LIVEKIT_URL}" \
  -f "${PROJECT_ROOT}/frontend/Dockerfile" \
  "${PROJECT_ROOT}/frontend"

docker push "${AR_PREFIX}/${FRONTEND_SERVICE}:latest"
log "Frontend image pushed."

# Deploy frontend
log "Deploying frontend to Cloud Run..."
gcloud run deploy "${FRONTEND_SERVICE}" \
  --image="${AR_PREFIX}/${FRONTEND_SERVICE}:latest" \
  --region="${REGION}" \
  --platform=managed \
  --port=3000 \
  --memory="${FRONTEND_MEMORY}" \
  --cpu="${FRONTEND_CPU}" \
  --min-instances="${FRONTEND_MIN_INSTANCES}" \
  --max-instances="${FRONTEND_MAX_INSTANCES}" \
  --allow-unauthenticated \
  --quiet

FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" --format="value(status.url)")
log "Frontend live: ${FRONTEND_URL}"

# ── Step 9: Custom domain mapping ────────────────────────────────
log "Step 9/9: Custom domain mapping..."

map_domain() {
  local DOMAIN=$1
  local SERVICE=$2
  if gcloud run domain-mappings describe --domain="${DOMAIN}" --region="${REGION}" &>/dev/null; then
    info "Domain mapping for '${DOMAIN}' already exists."
  else
    gcloud run domain-mappings create \
      --service="${SERVICE}" \
      --domain="${DOMAIN}" \
      --region="${REGION}" \
      --quiet 2>/dev/null || \
    warn "Domain mapping failed. You may need to verify domain ownership first:"
    warn "  gcloud domains verify ${DOMAIN}"
  fi
  info "Ensure DNS CNAME: ${DOMAIN} → ghs.googlehosted.com"
}

if [ -n "${FRONTEND_DOMAIN:-}" ]; then
  map_domain "${FRONTEND_DOMAIN}" "${FRONTEND_SERVICE}"
fi

if [ -n "${BACKEND_DOMAIN:-}" ]; then
  map_domain "${BACKEND_DOMAIN}" "${BACKEND_SERVICE}"
fi

if [ -z "${FRONTEND_DOMAIN:-}" ] && [ -z "${BACKEND_DOMAIN:-}" ]; then
  log "Skipped (no domains configured)."
fi

# ── Summary ──────────────────────────────────────────────────────
echo ""
log "=========================================="
log "  Deployment Complete!"
log "=========================================="
info "Frontend:  ${FRONTEND_URL}"
info "Backend:   ${BACKEND_URL}"
info "Redis:     ${REDIS_URL}"
info "Health:    ${BACKEND_URL}/api/v1/health"
if [ -n "${FRONTEND_DOMAIN:-}" ]; then
  info "Frontend Domain: https://${FRONTEND_DOMAIN}"
  info "Frontend DNS:    CNAME ${FRONTEND_DOMAIN} → ghs.googlehosted.com"
fi
if [ -n "${BACKEND_DOMAIN:-}" ]; then
  info "Backend Domain:  https://${BACKEND_DOMAIN}"
  info "Backend DNS:     CNAME ${BACKEND_DOMAIN} → ghs.googlehosted.com"
fi
echo ""
info "CES Webhook URL (update in Agent Studio):"
info "  ${BACKEND_URL}/api/v1/agent/webhook"
log "=========================================="
