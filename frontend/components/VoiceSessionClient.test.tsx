import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoiceSessionClient } from "./VoiceSessionClient";
import React from "react";

// Mock Child Components
vi.mock("./ChatContainer", () => ({
  ChatContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-chat-container">{children}</div>
  ),
}));

vi.mock("./LiveKitSession", () => ({
  LiveKitSession: () => <div data-testid="mock-livekit-session" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("VoiceSessionClient (US-06, US-10)", () => {
  it("should hydrate escalationData and multimodalEvent from sessionStorage on mount (Bug Fix)", () => {
    // Arrange: Pre-populate sessionStorage with an escalated state
    const escalationPayload = {
      detail: "escalated",
      escalation_message: "Please wait for a live agent.",
      phone_transfer: "+18001234567"
    };

    const multimodalPayload = {
      type: "enable_multimodal_input",
      payload: { allow_camera: true },
      timestamp: new Date().toISOString()
    };

    sessionStorage.setItem("zenith_escalation", JSON.stringify(escalationPayload));
    sessionStorage.setItem("zenith_multimodal", JSON.stringify(multimodalPayload));
    sessionStorage.setItem("zenith_room", "test-room-123");

    // Act: Render client
    render(<VoiceSessionClient />);

    // Assert: Escalation banner should render automatically because state was hydrated
    expect(screen.getByText("Session Escalated")).toBeInTheDocument();
    expect(screen.getByText("Please wait for a live agent.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call Support: +18001234567" })).toHaveAttribute("href", "tel:+18001234567");
  });
});
