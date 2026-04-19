# End-to-End Feature Build: The Hallway Demo Pivot

## Product Definition

**Goal:** Pivot the agent's persona from a restrictive "IoT router support" domain to a context-agnostic **Universal Technical Concierge** suitable for varied, unplanned, "hallway" demonstration environments (e.g., Google Next floor). Critically, this pivot introduces the decoupling of the system brains: GECX becomes the Text/Orchestration Agent, and Pipecat becomes the Specialized Multimodal Agent.

### P0 (Must Have): Architectural Decoupling & Persona Shift

**Scenario 1: Decoupling Agent Instructions**
- [x] **Given** GECX and Pipecat currently share a monolithic `system_instruction.xml`
- [x] **When** the architecture is updated
- [x] **Then** the instruction files must be split into two separate entities (e.g., `gecx_system.xml` and `pipecat_system.xml`)
- [x] **And** GECX's instructions must be strictly restricted to text chat logic and escalation orchestration
- [x] **And** Pipecat's instructions must be strictly restricted to live audio/video analysis and natural spoken delivery

**Scenario 2: Updating Persona to Universal Technical Concierge**
- [x] **Given** the new split instruction domains
- [x] **When** the prompts are written
- [x] **Then** both personas must behave as enthusiastic "Universal Technical Concierges"
- [x] **And** all previous boundaries restricting troubleshooting to Zenith-branded IoT routers must be removed

**Scenario 3: Enthusiastic Visual Acknowledgement of Random Objects (Pipecat ONLY)**
- [x] **Given** a user escalates to a live Gemini Multimodal session with their camera on
- [x] **When** the user points the camera at an arbitrary, non-technical object (e.g., a Starbucks cup, a coffee pen, shoes)
- [x] **Then** the Pipecat agent must playfully and enthusiastically acknowledge the object
- [x] **And** without breaking character, offer pseudo-troubleshooting or engaging commentary on said object

### P1 (Should Have): Resiliency in Hallway Conditions

**Scenario 4: Handling Stream Instability in High-Density Networks**
- [x] **Given** the LiveKit WebRTC pipeline is active in a busy conference hallway (poor network conditions)
- [x] **When** the stream experiences packet loss or video frame degradation
- [x] **Then** the application logic must tolerate the degradation without hard-crashing
- [x] **And** the Pipecat agent must gracefully handle the interruption, meeting a sub-500ms recovery and response SLA when the network stabilizes

### P2 (Nice to Have): Visual Context Polish

**Scenario 5: Handling Complete Lack of Visual Context**
- [x] **Given** the WebRTC camera session starts
- [x] **When** the camera view is completely blank, dark, or obscured
- [x] **Then** the Pipecat agent must politely ask the user to adjust lighting or camera positioning
- [x] **And** maintain spoken natural language flow (no markdown)
