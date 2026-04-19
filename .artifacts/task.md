# End-to-End Feature Build: Persistent Multimodal Session Overlay

## Product Definition

**Goal:** Provide visual continuity and multi-tasking capabilities by persisting the user's WebRTC video feed and session status outside of the hidden drawer canvas.

### BDD Requirements

**Scenario 1: Closing the drawer maintains visual awareness of the active session**
- **Given** a user is in an active Gemini Live session with an initialized local video feed
- **When** the user closes the ZenithDrawer
- **Then** a global banner appears at the top of the screen indicating an active session
- **And** the local video feed (PiP) transitions to a floating window overlay on the main viewport

**Scenario 2: The floating video feed avoids obstructing underlying content**
- **Given** the user's local video feed is displaying as a global floating PiP overlay
- **When** the user clicks and drags the video feed
- **Then** the video snaps or moves to the new bounds
- **And** the user interface beneath it remains clickable and visually accessible

**Scenario 3: Returning to the drawer via the global banner**
- **Given** the user has closed the drawer and the active session banner is visible
- **When** the user clicks the "Return to Session" button in the global banner
- **Then** the ZenithDrawer re-opens seamlessly
- **And** the active session context is perfectly preserved

## Technical Implementation Notes
To achieve this, the `LiveKitRoom` context (currently isolated deep within `ZenithDrawer` -> `VoiceSessionClient`) must be hoisted to a higher layout level (or utilize React Portals) so that consumer hooks (`useTracks`, `useLocalParticipant`) can render the `<VideoTrack>` and the global banner independent of the Drawer's visibility state.
