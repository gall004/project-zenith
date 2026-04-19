/**
 * ChatContainer Tests (US-07, US-08, US-09)
 *
 * Validates chat UI rendering, message display, input behavior,
 * and empty/active state transitions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatContainer } from "@/components/ChatContainer";

import type { ConnectionStatus } from "@/types/websocket";

// Mock the useZenithSocket hook
const mockSendMessage = vi.fn();
const mockSocketReturn = {
  isConnected: true,
  connectionStatus: "connected" as ConnectionStatus,
  reconnectAttempt: 0,
  lastMessage: null,
  sendMessage: mockSendMessage,
};

vi.mock("@/hooks/useZenithSocket", () => ({
  useZenithSocket: () => mockSocketReturn,
}));

describe("US-07: ChatContainer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketReturn.isConnected = true;
    mockSocketReturn.connectionStatus = "connected";
    mockSocketReturn.lastMessage = null;
  });

  it("should render the chat container with aria label", () => {
    // Arrange & Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    const container = screen.getByLabelText("Chat");
    expect(container).toBeInTheDocument();
  });

  it("should render the empty state guidance when no messages exist", () => {
    // Arrange & Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    expect(
      screen.getByText(/how can i assist you today/i)
    ).toBeInTheDocument();
  });

  it("should render a text input field with accessible label", () => {
    // Arrange & Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    const input = screen.getByLabelText("Chat message input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("should render a submit button", () => {
    // Arrange & Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    const button = screen.getByLabelText("Send message");
    expect(button).toBeInTheDocument();
  });

  it("should disable submit button when input is empty", () => {
    // Arrange & Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    const button = screen.getByLabelText("Send message");
    expect(button).toBeDisabled();
  });

  it("should have a unique id on the input field", () => {
    // Arrange & Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    const input = screen.getByLabelText("Chat message input");
    expect(input).toHaveAttribute("id", "chat-input");
  });

  it("should have a unique id on the submit button", () => {
    // Arrange & Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    const button = screen.getByLabelText("Send message");
    expect(button).toHaveAttribute("id", "chat-submit");
  });
});

describe("US-09: Chat Message Wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketReturn.isConnected = true;
    mockSocketReturn.connectionStatus = "connected";
    mockSocketReturn.lastMessage = null;
  });

  it("should enable submit button when input has text", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ChatContainer roomName="test-room" />);
    const input = screen.getByLabelText("Chat message input");

    // Act
    await user.type(input, "Hello");

    // Assert
    const button = screen.getByLabelText("Send message");
    expect(button).not.toBeDisabled();
  });

  it("should call sendMessage and clear input on submit", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ChatContainer roomName="test-room" />);
    const input = screen.getByLabelText("Chat message input");

    // Act
    await user.type(input, "Hello Zenith{Enter}");

    // Assert
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const sentEvent = mockSendMessage.mock.calls[0][0];
    expect(sentEvent.type).toBe("chat_message");
    expect(sentEvent.payload.text).toBe("Hello Zenith");
    expect(sentEvent.payload.sender).toBe("user");
    
    await vi.waitFor(() => {
      const activeInput = screen.getByLabelText("Chat message input");
      expect(activeInput).toHaveValue("");
    });
  });

  it("should render user message optimistically after submit", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ChatContainer roomName="test-room" />);
    const input = screen.getByLabelText("Chat message input");

    // Act
    await user.type(input, "My order status");
    await user.keyboard("{Enter}");

    // Assert
    expect(screen.getByText("My order status")).toBeInTheDocument();
  });

  it("should not submit when input is only whitespace", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ChatContainer roomName="test-room" />);
    const input = screen.getByLabelText("Chat message input");

    // Act
    await user.type(input, "   ");
    await user.keyboard("{Enter}");

    // Assert
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

describe("US-12: Connection Status Indicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketReturn.lastMessage = null;
  });

  it("should display 'Secure Connection Active' status when connected", () => {
    // Arrange
    mockSocketReturn.connectionStatus = "connected";

    // Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    expect(screen.getByText("Secure Connection Active")).toBeInTheDocument();
  });

  it("should display 'Link Severed' status when disconnected", () => {
    // Arrange
    mockSocketReturn.connectionStatus = "disconnected";
    mockSocketReturn.isConnected = false;

    // Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    expect(screen.getByText("Link Severed")).toBeInTheDocument();
  });

  it("should display reconnect attempt count when reconnecting", () => {
    // Arrange
    mockSocketReturn.connectionStatus = "reconnecting";
    mockSocketReturn.isConnected = false;
    mockSocketReturn.reconnectAttempt = 2;

    // Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    expect(
      screen.getByText("Re-establishing link... (2/5)")
    ).toBeInTheDocument();
  });

  it("should use role='status' and aria-live='polite' on indicator", () => {
    // Arrange
    mockSocketReturn.connectionStatus = "connected";

    // Act
    render(<ChatContainer roomName="test-room" />);

    // Assert
    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveAttribute("aria-live", "polite");
  });
});
