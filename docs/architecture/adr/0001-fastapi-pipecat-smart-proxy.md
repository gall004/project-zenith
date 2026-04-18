# Adoption of FastAPI and Pipecat as Smart Proxy Middleware

**Status:** Accepted

**Context:**
Project Zenith requires a backend proxy to mediate between the frontend application and the Google Gemini Enterprise for CX (GECX) AI models. It also must orchestrate WebRTC connectivity for real-time voice using LiveKit. We needed a highly scalable, asynchronous backend capable of handling continuous data streams with strict latency budgets.

**Decision:**
We will implement the Smart Proxy backend using **Python 3.12**, **FastAPI**, and the **Pipecat AI** framework. LiveKit egress and ingress streams will be handled by Pipecat media pipelines, while FastAPI serves standard HTTP REST endpoints for provisioning WebRTC rooms and providing health probes.

**Alternatives Considered:**
1. **Node.js / TS:** Although Node.js is excellent for async connections, the voice AI framework ecosystem (specifically pipelines marrying LLMs to WebRTC) is significantly more mature in Python. Building custom media transports in Node.js would impose high engineering overhead.
2. **Go:** Outstanding raw performance for LiveKit natively, but lacks the rich, rapidly-evolving GenAI and NLP ecosystem available in standard Python.
3. **Django:** Too heavyweight and historically coupled to synchronous ORMs. FastAPI's native ASGI support and strict Pydantic integration perfectly aligns with our "Fail-Fast Defensive Design" requirements.

**Consequences:**
- **Positive:** Immediate access to the Python AI ecosystem and a purpose-built framework (Pipecat) for scaling conversational voice agents.
- **Negative:** We must strictly adhere to "Async Purity" rules. Because of Python's Event Loop architecture, a single poorly implemented synchronous blocking call (like `requests.get` or `time.sleep`) could stall the main thread, resulting directly in dropped voice packets and high latency.
