#!/usr/bin/env bash
# ==================================================================
# Project Zenith — Production Teardown
# ==================================================================
# Destroys all GCP resources created by deploy.sh.
# Reads config from deploy-app.env. Confirms before destructive actions.
# Usage: ./scripts/teardown-app.sh
# ==================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Load config ───────────────────────────────────────────────────
if [ ! -f "${SCRIPT_DIR}/deploy-app.env" ]; then
  echo "ERROR: ${SCRIPT_DIR}/deploy-app.env not found."
  exit 1
fi
source "${SCRIPT_DIR}/deploy-app.env"

# ── Output helpers ────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'
log()  { echo -e "${GREEN}[TEARDOWN]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}     $1"; }

gcloud config set project "${PROJECT_ID}" --quiet 2>/dev/null

# ── Confirmation ──────────────────────────────────────────────────
echo ""
echo -e "${RED}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  WARNING: This will destroy ALL Zenith resources ║${NC}"
echo -e "${RED}║  in project: ${PROJECT_ID}            ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Resources to delete:"
echo "  • Cloud Run:    ${BACKEND_SERVICE}, ${FRONTEND_SERVICE}"
echo "  • Memorystore:  ${REDIS_INSTANCE}"
echo "  • VPC Connector: ${VPC_CONNECTOR}"
echo "  • Secrets:      ${SECRET_LIVEKIT_API_KEY}, ${SECRET_LIVEKIT_API_SECRET}, ${SECRET_GEMINI_API_KEY}"
echo "  • AR Repo:      ${AR_REPO}"
echo "  • Service Acct: ${BACKEND_SA}"
if [ -n "${FRONTEND_DOMAIN:-}" ]; then
  echo "  • Domain Map:   ${FRONTEND_DOMAIN}"
fi
echo ""
read -rp "Type 'destroy' to confirm: " CONFIRM
if [ "${CONFIRM}" != "destroy" ]; then
  echo "Aborted."
  exit 0
fi

# ── Delete domain mapping ────────────────────────────────────────
if [ -n "${FRONTEND_DOMAIN:-}" ]; then
  log "Removing domain mapping..."
  gcloud run domain-mappings delete \
    --domain="${FRONTEND_DOMAIN}" \
    --region="${REGION}" \
    --quiet 2>/dev/null || warn "Domain mapping not found."
fi

# ── Delete Cloud Run services ────────────────────────────────────
log "Deleting Cloud Run services..."
gcloud run services delete "${FRONTEND_SERVICE}" \
  --region="${REGION}" --quiet 2>/dev/null || warn "${FRONTEND_SERVICE} not found."
gcloud run services delete "${BACKEND_SERVICE}" \
  --region="${REGION}" --quiet 2>/dev/null || warn "${BACKEND_SERVICE} not found."

# ── Delete Memorystore ───────────────────────────────────────────
log "Deleting Memorystore Redis (this takes 1-2 minutes)..."
gcloud redis instances delete "${REDIS_INSTANCE}" \
  --region="${REGION}" --quiet 2>/dev/null || warn "${REDIS_INSTANCE} not found."

# ── Delete VPC Connector ─────────────────────────────────────────
log "Deleting VPC connector..."
gcloud compute networks vpc-access connectors delete "${VPC_CONNECTOR}" \
  --region="${REGION}" --quiet 2>/dev/null || warn "${VPC_CONNECTOR} not found."

# ── Delete secrets ────────────────────────────────────────────────
log "Deleting secrets..."
for secret_name in "${SECRET_LIVEKIT_API_KEY}" "${SECRET_LIVEKIT_API_SECRET}" "${SECRET_GEMINI_API_KEY}"; do
  gcloud secrets delete "${secret_name}" --quiet 2>/dev/null || warn "Secret '${secret_name}' not found."
done

# ── Delete Artifact Registry ─────────────────────────────────────
log "Deleting Artifact Registry repository (and all images)..."
gcloud artifacts repositories delete "${AR_REPO}" \
  --location="${REGION}" --quiet 2>/dev/null || warn "AR repo '${AR_REPO}' not found."

# ── Delete service account ───────────────────────────────────────
log "Deleting service account..."
SA_EMAIL="${BACKEND_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts delete "${SA_EMAIL}" \
  --quiet 2>/dev/null || warn "Service account not found."

# ── Done ──────────────────────────────────────────────────────────
echo ""
log "=========================================="
log "  Teardown Complete!"
log "=========================================="
log "All Zenith production resources have been removed."
log "DNS records (if any) must be removed manually."
log "=========================================="
