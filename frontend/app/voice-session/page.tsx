/**
 * Voice Session Page — Dual-channel interface (US-07, US-13)
 *
 * Combines text chat (ChatContainer) with the LiveKit voice/video
 * session. Users can type while camera/mic are streaming.
 */

import { VoiceSessionClient } from "./VoiceSessionClient";

export default function VoiceSessionPage(): React.JSX.Element {
  return (
    <main className="flex flex-1 flex-col h-screen bg-background">
      <VoiceSessionClient />
    </main>
  );
}
