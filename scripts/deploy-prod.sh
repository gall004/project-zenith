#!/usr/bin/env bash
# ==================================================================
# Project Zenith — Idempotent Production Deploy
# ==================================================================
# Reads all config from deploy-prod.env. Safe to re-run at any time.
# Usage: ./scripts/deploy-prod.sh
# ==================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ── Load config ───────────────────────────────────────────────────
if [ ! -f "${SCRIPT_DIR}/deploy-prod.env" ]; then
  echo "ERROR: ${SCRIPT_DIR}/deploy-prod.env not found. Copy deploy-prod.env.example and fill in your values."
  exit 1
fi
# shellcheck source=deploy-prod.env
source "${SCRIPT_DIR}/deploy-prod.env"

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
log "Step 1/5: Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  ces.googleapis.com \
  --quiet

# ── Step 2: Artifact Registry ────────────────────────────────────
log "Step 2/5: Artifact Registry..."
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

# ── Step 3: Bootstrap GECX Agent ─────────────────────────────────
log "Step 3/5: Bootstrapping GECX Orchestrator for Production..."
GECX_TMPFILE=$(mktemp)
export GCP_PROJECT_ID="${PROJECT_ID}"
export GCP_REGION="${REGION}"
export CES_REGION="${CES_REGION}"
cd "${PROJECT_ROOT}" && uv run --directory gecx_agent python bootstrap.py \
  --app-name "${GECX_APP_NAME:-zenith-gecx-orchestrator-prod}" \
  --env-file scripts/deploy-prod.env 2>&1 | tee "${GECX_TMPFILE}"

NEW_CES_APP_ID=$(grep "CES_APP_ID=" "${GECX_TMPFILE}" | tail -1 | cut -d= -f2)
rm -f "${GECX_TMPFILE}"

if [ -n "${NEW_CES_APP_ID}" ] && [ "${NEW_CES_APP_ID}" != "${CES_APP_ID}" ]; then
    log "Captured new CES_APP_ID: ${NEW_CES_APP_ID}"
fi

# ── Step 4: Build & deploy frontend ──────────────────────────────
log "Step 4/5: Building frontend image..."
docker build \
  --platform linux/amd64 \
  -t "${AR_PREFIX}/${FRONTEND_SERVICE}:latest" \
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

# ── Step 5: Custom domain mapping ────────────────────────────────
log "Step 5/5: Custom domain mapping..."

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

if [ -z "${FRONTEND_DOMAIN:-}" ]; then
  log "Skipped (no domains configured)."
fi

# ── Summary ──────────────────────────────────────────────────────
echo ""
log "=========================================="
log "  Deployment Complete!"
log "=========================================="
info "Frontend:  ${FRONTEND_URL}"
if [ -n "${FRONTEND_DOMAIN:-}" ]; then
  info "Frontend Domain: https://${FRONTEND_DOMAIN}"
  info "Frontend DNS:    CNAME ${FRONTEND_DOMAIN} → ghs.googlehosted.com"
fi
echo ""
log "=========================================="
