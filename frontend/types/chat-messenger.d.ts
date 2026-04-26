/**
 * Type declarations for the CES chat-messenger web component (v1.15).
 *
 * These custom elements are defined by the CX Agent Studio chat-messenger SDK.
 * Declaring them here prevents TypeScript errors when using them in JSX.
 */

import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "chat-messenger": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "language-code"?: string;
          "max-query-length"?: string;
          "url-allowlist"?: string;
          "logging-level"?: string;
        },
        HTMLElement
      >;
      "chat-messenger-container": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "chat-title"?: string;
          "chat-title-icon"?: string;
          "enable-file-upload"?: boolean;
          "enable-audio-input"?: boolean;
        },
        HTMLElement
      >;
      "chat-reset-session-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          slot?: string;
          "title-text"?: string;
        },
        HTMLElement
      >;
      "chat-toggle-dialog-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          slot?: string;
          "title-text-expanded"?: string;
          "title-text-collapsed"?: string;
        },
        HTMLElement
      >;
      "chat-messenger-close-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          slot?: string;
          "title-text"?: string;
        },
        HTMLElement
      >;
      "chat-messenger-chat-bubble": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "chat-title"?: string;
          "chat-title-icon"?: string;
          "enable-file-upload"?: string;
          "enable-audio-input"?: string;
        },
        HTMLElement
      >;
    }
  }
}

/**
 * Global augmentation for the CES chatSdk.
 */
interface CesContext {
  deploymentName: string;
  tokenBroker?: { enableTokenBroker: boolean };
}

interface ChatSdk {
  registerContext: (context: unknown) => void;
  prebuilts: {
    ces: {
      createContext: (config: CesContext) => unknown;
    };
  };
}

declare global {
  /**
   * Runtime interface for the chat-messenger DOM element.
   *
   * These methods are not officially documented but were confirmed
   * by decompiling chat-messenger.js v1.15.
   */
  interface ChatMessengerElement extends HTMLElement {
    /** Send a native CES event via SessionInput.event (preferred). */
    sendEvent?: (eventName: string, languageCode?: string) => Promise<void>;
    /** Send a text message as the user. Falls back to runSession with text input. */
    sendMessage?: (text: string) => void;
    /** Inject rich response cards into the chat stream. */
    renderCustomCard?: (cards: Array<Record<string, unknown>>) => void;
    /** Register a client-side function tool. */
    registerClientSideFunction?: (
      toolResourceName: string,
      toolId: string,
      handler: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
    ) => void;
    /** Internal presenter for session management. */
    presenter?: {
      sendImage?: (blob: Blob) => Promise<void>;
      sendEvent?: (eventName: string, languageCode?: string) => Promise<void>;
      toggleBidiSession?: () => void;
    };
    /** Set session variables on the widget. Values flow to CES session state. */
    setVariables?: (variables: Record<string, string | number | boolean>) => void;
  }

  interface Window {
    chatSdk?: ChatSdk;
  }
}
