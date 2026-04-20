# GECX Agent (Orchestrator Sandbox)

This directory is the **Configuration-as-Code (IaC)** sandbox for the Project Zenith Google Cloud CX Agent Studio Deployment. 

Unlike the `backend` folder (which runs the live execution code for WebRTC and Pipecat), this folder does not run a continuous server. It is executed purely to map, configure, and push the XML system instructions and OpenAPI tool formats over to the remote Google Cloud environment.

## Directory Structure
- **`/definitions/prompts/`**: The XML files containing the strict Persona, Instructions, and Format (PIF) tags that define the GECX agent architecture.
- **`/definitions/tools/`**: The OpenAPI YAML schemas defining the webhooks between Google Cloud and our local backend server.
- **`/scripts/`**: The Bash orchestration and Python utility scripts that automatically handle provisioning payloads seamlessly over REST.

## Why is there a `pyproject.toml` here?
To prevent polluting our main Pipecat `backend` server with Google Cloud deployment CLI tools (like `google-auth` and `pyyaml`), we isolate deployment dependencies in this directory. 

When you run `bash scripts/deploy.sh`, the terminal leverages `uv` to instantly generate an ephemeral Python environment, securely pinging the Google Cloud APIs to bootstrap your configurations.
