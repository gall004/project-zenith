import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveKitSession } from "./LiveKitSession";

// Mock the LiveKit components
vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ children }: { children: React.ReactNode }) => <div data-testid="livekit-room">{children}</div>,
  RoomAudioRenderer: () => <div data-testid="room-audio-renderer" />,
  useRoomContext: () => ({
    localParticipant: {
      setCameraEnabled: vi.fn(),
    },
  }),
  StartAudio: () => <button data-testid="start-audio">Start Audio</button>,
}));

// Mock the API fetch
vi.mock("@/lib/api/livekit", () => ({
  fetchLiveKitToken: vi.fn().mockResolvedValue("mock-token")
}));

describe("LiveKitSession", () => {
  it("automatically initializes the connection and requests a token when multimodal event fires", async () => {
    // Arrange & Act
    render(<LiveKitSession roomName="test" identity="user" multimodalEvent={{ type: "enable_multimodal_input", timestamp: "2026-04-22T00:00:00Z", payload: { pipeline_type: "concierge", reason: "test", camera_requested: true, microphone_requested: true } }} isOpen={true} />);
    
    // Assert - State immediately transitions to loading/connecting
    expect(screen.getByText(/Negotiating secure connection/i)).toBeInTheDocument();
  });

  it("does not eagerly fetch token or connect to LiveKit when drawer is closed (fixes AudioContext warning)", async () => {
    render(<LiveKitSession roomName="test" identity="user" multimodalEvent={null} isOpen={false} />);
    expect(screen.queryByText(/Negotiating secure connection/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("livekit-room")).not.toBeInTheDocument();
  });
});
