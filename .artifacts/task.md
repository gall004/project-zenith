# Task: GECX Agent Idempotent Deployment Pipeline
## Objective
Build an idempotent deployment pipeline for the Gemini Enterprise for CX (GECX) agent to manage its configuration ("brain") as code using `httpx` and `google-auth` to interact with the Customer Engagement Services (CES) API.

## P0 — Must Have

### US-01: Agent Configuration as Code
- [x] **Given** the requirement to manage the agent's behavior and capabilities as code,
  **When** the engineer defines the configuration module,
  **Then** a structural JSON file is created at `agent/config.json` serving as the single source of truth, establishing its system instructions and explicitly defining a `request_visual_context` tool.

### US-02: Dependency Management
- [x] **Given** the backend deployment script requires specific libraries for authentication and HTTP requests,
  **When** the new libraries are added to the environment,
  **Then** `httpx` and `google-auth` (with necessary GCP ADC support) are installed and securely locked using `uv`.

### US-03: CES API Authentication
- [x] **Given** the deployment script needs to communicate securely with Google Cloud services,
  **When** the Python script at `agent/deploy.py` is executed,
  **Then** it successfully retrieves GCP Application Default Credentials (ADC) and generates valid Bearer tokens targeting `ces.googleapis.com`.

### US-04: Idempotent Agent Deployment Pipeline
- [x] **Given** the defined system configuration might evolve or be deployed on new environments,
  **When** `agent/deploy.py` runs,
  **Then** it checks if the agent exists on `ces.googleapis.com`, idempotently applying a `PATCH` request to update an existing agent or a `POST` request to create a new one based entirely on `agent/config.json`.

## P1 — Should Have

### US-05: Resilient Error Handling
- [x] **Given** external API calls are prone to timeouts and failures,
  **When** the deployment script interacts with `ces.googleapis.com`,
  **Then** network failures or Google API errors are caught, logged with the exact HTTP status codes and error payloads, and the script exits gracefully with a non-zero exit code.
