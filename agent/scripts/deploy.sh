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
AGENT_DIR="$(dirname "${SCRIPT_DIR}")"

if [[ -f "${AGENT_DIR}/pyproject.toml" ]]; then
    echo "  Installing agent dependencies via uv..."
    cd "${AGENT_DIR}" && python3 -m uv sync --quiet 2>&1 | tail -1
    echo "  ✓ Agent dependencies installed"
fi

echo ""

# ---------------------------------------------------------------------------
# Step 1: Collect configuration
# ---------------------------------------------------------------------------
read -rp "$(echo -e "${YELLOW}Enter your GCP Project ID:${NC} ")" GCP_PROJECT_ID
if [[ -z "${GCP_PROJECT_ID}" ]]; then
    echo -e "${RED}Error: GCP Project ID cannot be empty.${NC}"
    exit 1
fi

read -rp "$(echo -e "${YELLOW}Enter your GCP Region [us-central1]:${NC} ")" GCP_REGION
GCP_REGION="${GCP_REGION:-us-central1}"

read -rp "$(echo -e "${YELLOW}Enter your FastAPI backend URL [http://localhost:8000]:${NC} ")" FASTAPI_BACKEND_URL
FASTAPI_BACKEND_URL="${FASTAPI_BACKEND_URL:-http://localhost:8000}"

echo ""
echo -e "${CYAN}Deployment Plan:${NC}"
echo "  Project ID:     ${GCP_PROJECT_ID}"
echo "  Region:         ${GCP_REGION}"
echo "  Backend URL:    ${FASTAPI_BACKEND_URL}"
echo "  Auth:           ${ACTIVE_ACCOUNT}"
echo ""
echo -e "${CYAN}Resources to create/update:${NC}"
echo "  • Enable CES API (ces.googleapis.com)"
echo "  • CES App: zenith-gecx-orchestrator"
echo "  • CES Agent: zenith-gecx-root-agent"
echo "  • CES Toolset: request_visual_context"
echo ""
read -rp "$(echo -e "${YELLOW}Proceed with deployment? [y/N]:${NC} ")" CONFIRM
if [[ "${CONFIRM}" != "y" && "${CONFIRM}" != "Y" ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

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
PROJECT_ROOT="$(cd "${AGENT_DIR}/.." && pwd)"

set +e
cd "${PROJECT_ROOT}" && python3 -m uv run --directory agent python3 scripts/bootstrap_gecx.py \
    --webhook-url "${FASTAPI_BACKEND_URL}" 2>&1 | tee "${GECX_TMPFILE}"
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
echo "  CES App:        zenith-gecx-orchestrator"
echo "  CES App ID:     ${CES_APP_ID:-<see .env>}"
echo "  GECX Agent:     zenith-gecx-root-agent"
echo "  GECX Agent ID:  ${GECX_AGENT_ID:-<see .env>}"
echo "  Backend URL:    ${FASTAPI_BACKEND_URL}"
echo ""
