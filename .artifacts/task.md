# End-to-End Feature Build: Emotionally Intelligent Sentiment Demo

## Product Definition

**Goal:** Expand the "Universal Technical Concierge" into an emotionally intelligent conversational partner. The agent should be able to analyze user facial expressions across the video feed, adapt its tone and responses to match user sentiment, and provide a visual manifestation (an avatar/orb) to create a sense of conversational presence rather than talking "into outer space."

### P0 (Must Have): Facial Expression Sentiment Analysis

**Scenario 1: Emotionally Reactive Persona Modifications**
- [x] **Given** the user is in an active multimodal Pipecat session
- [x] **When** the camera captures the user's face (e.g., smiling, frowning, looking confused)
- [x] **Then** the agent must accurately detect the user's facial expression and emotional state natively via Pipecat video frames
- [x] **And** dynamically adjust its spoken response to acknowledge and match or soothe the user's emotional state (e.g., "You look a bit frustrated, let's take this slow...")

### P1 (Must Have): Reactive Visual Avatar

**Scenario 2: Creating Conversational Presence**
- [x] **Given** a user is interacting with the agent via a live voice/video session
- [x] **When** the session connects successfully
- [x] **Then** the UI must render a visual representation of the agent (e.g., a dynamic orb, waveform, or Zenith-branded avatar) prominently on the screen
- [x] **And** this avatar must animate or pulse in direct correlation to the agent's real-time audio output stream to simulate "speaking"

### P2 (Nice to Have): Avatar State Management

**Scenario 3: Connecting Avatar States to WebRTC Lifecycle**
- [x] **Given** the visual avatar component is rendered
- [x] **When** pipeline lifecycle events occur (Connecting, Listening, Agent Thinking, Agent Speaking)
- [x] **Then** the avatar should visually change states to reflect what the agent is doing (e.g., pulsing while speaking, soft glow while listening, spinning/loading while connecting)
