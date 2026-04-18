#!/usr/bin/env bash
# =============================================================================
# Project Zenith — GECX Agent Teardown Script
#
# Removes all CES resources provisioned by deploy.sh. Fully idempotent —
# safely re-runnable if a previous teardown was interrupted.
#
# Deletion order (respects dependency chain):
#   1. CES App (cascades agent + toolset deletion)
#   2. Local state cleanup (GECX_AGENT_ID from .env)
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
echo -e "${CYAN} Project Zenith — GECX Agent Teardown       ${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ---------------------------------------------------------------------------
# Pre-flight validation
# ---------------------------------------------------------------------------
echo -e "${GREEN}[0/3] Running pre-flight checks...${NC}"

if ! command -v gcloud &>/dev/null; then
    echo -e "${RED}Error: gcloud CLI not found.${NC}"
    exit 1
fi
echo "  ✓ gcloud CLI found"

if ! gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | grep -q "."; then
    echo -e "${RED}Error: No active gcloud authentication.${NC}"
    echo -e "${RED}Run: gcloud auth login${NC}"
    exit 1
fi
ACTIVE_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1)
echo "  ✓ Authenticated as: ${ACTIVE_ACCOUNT}"
echo ""

# ---------------------------------------------------------------------------
# Collect configuration
# ---------------------------------------------------------------------------
read -rp "Enter your GCP Project ID: " GCP_PROJECT_ID
if [[ -z "${GCP_PROJECT_ID}" ]]; then
    echo -e "${RED}Error: Project ID is required.${NC}"
    exit 1
fi

read -rp "Enter your GCP Region [us-central1]: " GCP_REGION
GCP_REGION="${GCP_REGION:-us-central1}"

# CES uses macro-regions
CES_REGION="${GCP_REGION%%-*}"

GECX_APP_DISPLAY_NAME="zenith-gecx-orchestrator"

# ---------------------------------------------------------------------------
# Confirmation gate
# ---------------------------------------------------------------------------
echo ""
echo -e "${RED}⚠  WARNING: This will permanently delete the following resources:${NC}"
echo ""
echo -e "  Project:    ${CYAN}${GCP_PROJECT_ID}${NC}"
echo -e "  Region:     ${CYAN}${CES_REGION}${NC}"
echo ""
echo "  • CES App:    ${GECX_APP_DISPLAY_NAME} (cascades agent + toolset)"
echo "  • Local .env:  GECX_AGENT_ID entry"
echo ""
read -rp "Proceed with teardown? [y/N]: " CONFIRM
if [[ "${CONFIRM}" != "y" && "${CONFIRM}" != "Y" ]]; then
    echo "Teardown cancelled."
    exit 0
fi
echo ""

gcloud config set project "${GCP_PROJECT_ID}" --quiet 2>/dev/null

# ---------------------------------------------------------------------------
# Step 1: Delete CES App (cascades agent + toolset)
# ---------------------------------------------------------------------------
echo -e "${GREEN}[1/3] Deleting CES app: ${GECX_APP_DISPLAY_NAME}...${NC}"

ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null || true)
if [[ -n "${ACCESS_TOKEN}" ]]; then
    CES_APP_NAME=$(curl -s \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        "https://ces.googleapis.com/v1beta/projects/${GCP_PROJECT_ID}/locations/${CES_REGION}/apps" \
        2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for app in data.get('apps', []):
        if app.get('displayName') == '${GECX_APP_DISPLAY_NAME}':
            print(app['name'])
            break
except: pass
" 2>/dev/null || true)

    if [[ -n "${CES_APP_NAME}" ]]; then
        curl -s -X DELETE \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            "https://ces.googleapis.com/v1beta/${CES_APP_NAME}" \
            2>/dev/null || true
        echo "  ✓ CES app deleted"
    else
        echo -e "${YELLOW}  CES app not found — skipping${NC}"
    fi
else
    echo -e "${YELLOW}  Could not get access token — skipping CES cleanup${NC}"
fi

# ---------------------------------------------------------------------------
# Step 2: Clean local state
# ---------------------------------------------------------------------------
echo -e "${GREEN}[2/3] Cleaning local state...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

if [[ -f "${ENV_FILE}" ]] && grep -q "GECX_AGENT_ID=" "${ENV_FILE}"; then
    sed -i.bak '/^GECX_AGENT_ID=/d' "${ENV_FILE}"
    rm -f "${ENV_FILE}.bak"
    echo "  ✓ Removed GECX_AGENT_ID from .env"
else
    echo "  - GECX_AGENT_ID not in .env"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo -e "${GREEN}[3/3] Teardown complete!${NC}"
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} GECX Agent Teardown Complete               ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "All GECX CES resources have been removed."
echo "Run 'bash agent/scripts/deploy.sh' to re-provision from scratch."
