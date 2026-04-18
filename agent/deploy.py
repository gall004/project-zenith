import json
import logging
import sys
import httpx
from google.auth import default
from google.auth.transport.requests import Request as AuthRequest

# Setup minimal rigorous logging per backend rules
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

CONFIG_FILE_PATH = "config.json"
BASE_CES_URL = "https://ces.googleapis.com/v1"

def deploy_gecx_agent():
    logger.info("Initiating GECX Agent deployment pipeline (idempotent)...")
    
    # 1. Google Auth (ADC)
    try:
        credentials, project_id = default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        credentials.refresh(AuthRequest())
        token = credentials.token
    except Exception as e:
        logger.error(f"Failed to acquire GCP Application Default Credentials: {e}")
        sys.exit(1)
        
    # 2. Read Configuration (Single Source of Truth)
    try:
        with open(CONFIG_FILE_PATH, 'r') as f:
            agent_payload = json.load(f)
    except FileNotFoundError:
        logger.error(f"Agent configuration file not found at: {CONFIG_FILE_PATH}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        logger.error(f"Agent configuration is not valid JSON: {e}")
        sys.exit(1)
        
    agent_name = agent_payload.get("name")
    if not agent_name:
        logger.error("Configuration payload missing required 'name' field.")
        sys.exit(1)

    # 3. Inject Actual Project ID if Using Default Template
    if project_id and "projects/default-project" in agent_name:
        logger.info(f"Injecting GCP project ID '{project_id}' into payload...")
        agent_name = agent_name.replace("projects/default-project", f"projects/{project_id}")
        agent_payload["name"] = agent_name

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    agent_url = f"{BASE_CES_URL}/{agent_name}"
    
    # 4. Execute Network Checks and Sync
    logger.info(f"Checking state of agent at: {agent_url}")
    with httpx.Client(timeout=10.0) as client:
        try:
            get_response = client.get(agent_url, headers=headers)
            get_response.raise_for_status()
            agent_exists = True
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                agent_exists = False
            else:
                logger.error(f"API Error checking agent state. Status {e.response.status_code}: {e.response.text}")
                sys.exit(1)
        except httpx.RequestError as e:
            logger.error(f"Network error querying CES API: {e}")
            sys.exit(1)
            
        try:
            if agent_exists:
                logger.info("Agent exists. Updating (PATCH)...")
                # Common REST convention: patching with updateMask
                update_mask = ",".join([key for key in agent_payload.keys() if key != "name"])
                patch_url = f"{agent_url}?updateMask={update_mask}"
                
                response = client.patch(patch_url, json=agent_payload, headers=headers)
                response.raise_for_status()
                logger.info("Agent successfully patched to desired state.")
            else:
                logger.info("Agent does not exist. Creating (POST)...")
                # Split parent resource from agent ID
                parts = agent_name.split("/agents/")
                if len(parts) != 2:
                    logger.error(f"Malformed agent name structure: {agent_name}")
                    sys.exit(1)
                
                parent, agent_id = parts[0], parts[1]
                post_url = f"{BASE_CES_URL}/{parent}/agents?agentId={agent_id}"
                
                response = client.post(post_url, json=agent_payload, headers=headers)
                response.raise_for_status()
                logger.info("Agent successfully created with desired state.")
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Deployment rejected by CES API. Status {e.response.status_code}: {e.response.text}")
            sys.exit(1)
        except httpx.RequestError as e:
            logger.error(f"Deploy network failure: {e}")
            sys.exit(1)

if __name__ == "__main__":
    deploy_gecx_agent()
