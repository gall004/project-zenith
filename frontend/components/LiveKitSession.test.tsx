import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
}));

// Mock the API fetch
vi.mock("@/lib/api/livekit", () => ({
  fetchLiveKitToken: vi.fn().mockResolvedValue("mock-token")
}));

describe("LiveKitSession", () => {
  it("forces explicit user interaction before connecting to prevent autoplay exceptions", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LiveKitSession roomName="test" identity="user" multimodalEvent={null} />);
    
    // Assert - The autoplay constraint requires we do NOT automatically boot the Room
    // It must explicitly request user permission first
    const joinBtn = screen.getByRole("button", { name: /initialize/i });
    expect(joinBtn).toBeInTheDocument();
    expect(screen.queryByTestId("livekit-room")).not.toBeInTheDocument();
    
    // Act - User gesture
    await act(async () => {
      await user.click(joinBtn);
    });
    
    // Assert - State transitions after the user gesture
    expect(screen.queryByRole("button", { name: /initialize/i })).not.toBeInTheDocument();
  });
});
