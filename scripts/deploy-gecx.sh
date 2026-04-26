#!/usr/bin/env bash
# =============================================================================
# Project Zenith — GECX Agent Deploy Script
#
# Provisions the GECX Frontend Orchestrator on CX Agent Studio.
# All operations are idempotent — safe to re-run.
#
# Steps:
#   0. Pre-flight validation (gcloud, ADC, Python, uv)
#   1. Collect configuration (Project ID, Region)
#   2. Enable CES API
#   3. Bootstrap GECX Agent via Python
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} Project Zenith — GECX Agent Deploy         ${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ---------------------------------------------------------------------------
# Step 0: Pre-flight validation
# ---------------------------------------------------------------------------
echo -e "${GREEN}[0/3] Running pre-flight checks...${NC}"

# Check gcloud
if ! command -v gcloud &>/dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed or not on PATH.${NC}"
    echo -e "${RED}Install it from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi
echo "  ✓ gcloud CLI found"

# Check Python
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}Error: python3 is not installed or not on PATH.${NC}"
    exit 1
fi
echo "  ✓ python3 found"

# Check active gcloud authentication
if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | grep -q "."; then
    echo -e "${RED}Error: No active gcloud authentication found.${NC}"
    echo -e "${RED}Run: gcloud auth login${NC}"
    exit 1
fi
ACTIVE_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1)
echo "  ✓ Authenticated as: ${ACTIVE_ACCOUNT}"

# Check Application Default Credentials (ADC)
ADC_PATH="${HOME}/.config/gcloud/application_default_credentials.json"
if [[ ! -f "${ADC_PATH}" ]]; then
    echo -e "${RED}Error: Application Default Credentials (ADC) not found.${NC}"
    echo -e "${RED}Run: gcloud auth application-default login${NC}"
    exit 1
fi
echo "  ✓ Application Default Credentials found"

# Ensure agent venv has dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
AGENT_DIR="${PROJECT_ROOT}/gecx_agent"
<<<<<<<< HEAD:scripts/deploy-dev.sh
ENV_FILE="${PROJECT_ROOT}/.env"

if [[ -f "${ENV_FILE}" ]]; then
    # Load .env to get GECX_APP_NAME
    set -a
    source "${ENV_FILE}"
    set +a
fi
========
>>>>>>>> origin/feature/cloud-run-production:scripts/deploy-gecx.sh

if [[ -f "${AGENT_DIR}/pyproject.toml" ]]; then
    echo "  Installing agent dependencies via uv..."
    cd "${AGENT_DIR}" && uv sync --quiet 2>&1 | tail -1
    echo "  ✓ Agent dependencies installed"
fi

echo ""

# ---------------------------------------------------------------------------
# Step 1: Collect configuration
# ---------------------------------------------------------------------------
if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
    echo -e "${RED}Error: GCP_PROJECT_ID is not set in .env.${NC}"
    exit 1
fi

GCP_REGION="${GCP_REGION:-us-central1}"

if [[ -z "${FASTAPI_BACKEND_URL:-}" ]]; then
    echo -e "${RED}Error: FASTAPI_BACKEND_URL is not set in .env.${NC}"
    exit 1
fi

APP_NAME="${GECX_APP_NAME:-zenith-gecx-orchestrator-dev}"

echo ""
echo -e "${CYAN}Deployment Plan:${NC}"
echo "  Project ID:     ${GCP_PROJECT_ID}"
echo "  Region:         ${GCP_REGION}"
echo "  Backend URL:    ${FASTAPI_BACKEND_URL}"
echo "  Auth:           ${ACTIVE_ACCOUNT}"
echo ""
echo -e "${CYAN}Resources to create/update:${NC}"
echo "  • Enable CES API (ces.googleapis.com)"
echo "  • CES App: ${APP_NAME}"
echo "  • CES Agent: ${APP_NAME}-root-agent"
echo "  • CES Toolset: request_visual_context"
echo ""

# ---------------------------------------------------------------------------
# Export environment variables for Python bootstrap
# ---------------------------------------------------------------------------
export GCP_PROJECT_ID
export GCP_REGION
export FASTAPI_BACKEND_URL

# ---------------------------------------------------------------------------
# Step 2: Enable CES API
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}[1/3] Setting active GCP project and enabling CES API...${NC}"
gcloud config set project "${GCP_PROJECT_ID}" --quiet
gcloud services enable ces.googleapis.com --quiet
echo "  ✓ CES API enabled"

# ---------------------------------------------------------------------------
# Step 3: Bootstrap GECX Agent
# ---------------------------------------------------------------------------
echo -e "${GREEN}[2/3] Bootstrapping GECX Frontend Orchestrator...${NC}"
echo ""

GECX_TMPFILE=$(mktemp)

set +e
cd "${PROJECT_ROOT}" && uv run --directory gecx_agent python ../scripts/bootstrap_gecx.py \
<<<<<<<< HEAD:scripts/deploy-dev.sh
    --webhook-url "${FASTAPI_BACKEND_URL}" \
    --app-name "${GECX_APP_NAME:-zenith-gecx-orchestrator-dev}" 2>&1 | tee "${GECX_TMPFILE}"
========
    --webhook-url "${FASTAPI_BACKEND_URL}" 2>&1 | tee "${GECX_TMPFILE}"
>>>>>>>> origin/feature/cloud-run-production:scripts/deploy-gecx.sh
GECX_EXIT=${PIPESTATUS[0]}
set -e

if [[ ${GECX_EXIT} -ne 0 ]]; then
    echo -e "${RED}Error: GECX agent bootstrap failed. See output above.${NC}"
    rm -f "${GECX_TMPFILE}"
    exit 1
fi

GECX_AGENT_ID=$(grep "GECX_AGENT_ID=" "${GECX_TMPFILE}" | tail -1 | cut -d= -f2)
CES_APP_ID=$(grep "CES_APP_ID=" "${GECX_TMPFILE}" | tail -1 | cut -d= -f2)
rm -f "${GECX_TMPFILE}"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}[3/3] Deploy complete!${NC}"
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} GECX Agent Deployment Complete             ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}Provisioned Resources:${NC}"
echo "  CES App:        ${APP_NAME}"
echo "  CES App ID:     ${CES_APP_ID:-<see .env>}"
echo "  GECX Agent:     ${APP_NAME}-root-agent"
echo "  GECX Agent ID:  ${GECX_AGENT_ID:-<see .env>}"
echo "  Backend URL:    ${FASTAPI_BACKEND_URL}"
echo ""
