import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { VoiceSessionClient } from "./VoiceSessionClient";
import React from "react";

// Mock Child Components
vi.mock("./ChatContainer", () => ({
  ChatContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-chat-container">{children}</div>
  ),
}));

vi.mock("./LiveKitSession", () => ({
  LiveKitSession: (props: any) => <div data-testid="mock-livekit-session" data-isopen={props.isOpen?.toString()} />,
}));

// Mock the session API client
const mockCreateSession = vi.fn();
const mockHydrateSession = vi.fn();
const mockGetSessionCookie = vi.fn();

vi.mock("@/lib/api/sessions", () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  hydrateSession: (...args: unknown[]) => mockHydrateSession(...args),
  endSession: vi.fn().mockResolvedValue(undefined),
  getSessionCookie: () => mockGetSessionCookie(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionCookie.mockReturnValue(null);
  mockCreateSession.mockResolvedValue({
    room_name: "session-new123",
    identity: "user-new456",
    status: "active",
  });
});

describe("VoiceSessionClient (Backend Session Hydration)", () => {
  it("should show loading state then create a new session when no cookie exists", async () => {
    render(<VoiceSessionClient />);

    // Initially shows loading
    expect(screen.getByText("Restoring session...")).toBeInTheDocument();

    // After hydration completes, shows the chat container
    await waitFor(() => {
      expect(screen.getByTestId("mock-chat-container")).toBeInTheDocument();
    });

    expect(mockCreateSession).toHaveBeenCalledOnce();
  });

  it("should resume an existing session from backend when cookie exists", async () => {
    mockGetSessionCookie.mockReturnValue("test-room-existing");
    mockHydrateSession.mockResolvedValue({
      room_name: "test-room-existing",
      identity: "user-existing",
      status: "active",
      multimodal_event: null,
      escalation_data: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(<VoiceSessionClient />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-chat-container")).toBeInTheDocument();
    });

    expect(mockHydrateSession).toHaveBeenCalledWith("test-room-existing");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("should hydrate escalation state from backend and render escalation banner", async () => {
    mockGetSessionCookie.mockReturnValue("test-room-escalated");
    mockHydrateSession.mockResolvedValue({
      room_name: "test-room-escalated",
      identity: "user-escalated",
      status: "escalated",
      multimodal_event: null,
      escalation_data: {
        event: "escalation",
        detail: "escalated",
        escalation_message: "Please wait for a live agent.",
        phone_transfer: "+18001234567",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(<VoiceSessionClient />);

    await waitFor(() => {
      expect(screen.getByText("Session Escalated")).toBeInTheDocument();
    });
    expect(screen.getByText("Please wait for a live agent.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call Support: +18001234567" })).toHaveAttribute("href", "tel:+18001234567");
  });

  it("should create a new session when cookie exists but backend returns 404", async () => {
    mockGetSessionCookie.mockReturnValue("expired-room");
    mockHydrateSession.mockResolvedValue(null);

    render(<VoiceSessionClient />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-chat-container")).toBeInTheDocument();
    });

    expect(mockHydrateSession).toHaveBeenCalledWith("expired-room");
    expect(mockCreateSession).toHaveBeenCalledOnce();
  });

  it("should maintain LiveKit connection (decoupled) even if drawer closes after initialization", async () => {
    mockGetSessionCookie.mockReturnValue("test-room-decoupled");
    mockHydrateSession.mockResolvedValue({
      room_name: "test-room-decoupled",
      identity: "user",
      status: "active",
      multimodal_event: null,
      escalation_data: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { rerender } = render(<VoiceSessionClient isOpen={false} />);
    await waitFor(() => {
      expect(screen.getByTestId("mock-livekit-session")).toBeInTheDocument();
    });

    // Verify it starts false
    expect(screen.getByTestId("mock-livekit-session")).toHaveAttribute("data-isopen", "false");

    // Act: User opens the drawer
    rerender(<VoiceSessionClient isOpen={true} />);
    expect(screen.getByTestId("mock-livekit-session")).toHaveAttribute("data-isopen", "true");

    // Act: User closes the drawer
    rerender(<VoiceSessionClient isOpen={false} />);

    // Assert: LiveKitSession must REMAIN open to preserve media streams
    expect(screen.getByTestId("mock-livekit-session")).toHaveAttribute("data-isopen", "true");
  });
});
