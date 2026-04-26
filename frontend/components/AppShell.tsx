"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Radar, Star, Network, Banknote, Compass, Menu, X } from "lucide-react";
import { VideoFeed } from "@/components/VideoFeed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showVideoFeed, setShowVideoFeed] = useState(false);

  /**
   * Close the camera feed:
   * 1. Hide the VideoFeed overlay
   * 2. Deactivate the BidiRunSession (stop streaming)
   * 3. Signal the GECX vision agent that the visual session is complete
   */
  const handleCloseCamera = useCallback(() => {
    setShowVideoFeed(false);

    const messenger = document.querySelector('chat-messenger') as any;
    if (messenger?.presenter) {
      // Deactivate BidiRunSession — stop the WebSocket streaming connection
      messenger.presenter.toggleBidiSession(false);

      // Signal the GECX agent that the vision session is over.
      // The vision agent's HandleVisualSessionComplete handler will fire.
      messenger.presenter.sendQuery("I'm done sharing my camera.");
    }
  }, []);

  // Initialize the legacy V1 SDK because V2 doesn't support reCAPTCHA token brokers natively.
  useEffect(() => {
    const initWidget = () => {
      if (window.chatSdk) {
        window.chatSdk.registerContext(
          window.chatSdk.prebuilts.ces.createContext({
            deploymentName: process.env.NEXT_PUBLIC_CES_DEPLOYMENT_NAME || "projects/825463420635/locations/us/apps/3ef188f6-f7e8-4035-8a07-6a7dec9beab5/deployments/d2898b35-89e9-43e5-a667-844c94017c0c",
            tokenBroker: {
              enableTokenBroker: true,
            },
          }),
        );
      }
    };

    window.addEventListener("chat-messenger-loaded", initWidget);
    if (window.chatSdk) {
      initWidget();
    }
    return () => window.removeEventListener("chat-messenger-loaded", initWidget);
  }, []);

  /**
   * Register the `request_visual_context` client-side function on the widget.
   *
   * The CES Integration tab specifies the exact registration signature:
   *   chatMessenger.registerClientSideFunction(toolResourceName, toolId, handler)
   *
   * When the GECX vision agent calls this tool, we:
   * 1. Show the VideoFeed overlay (camera opens, frames start streaming)
   * 2. Return { camera_enabled: true } to the agent so it knows the camera is ready
   */
  // Vision configuration — controlled by the agent via tool parameters
  const [visionConfig, setVisionConfig] = useState<{
    mode: 'single_frame' | 'continuous';
    maxFrames: number;
    intervalSeconds: number;
  }>({ mode: 'single_frame', maxFrames: 1, intervalSeconds: 3 });

  useEffect(() => {
    // Tool resource identifiers — populated by deploy-dev.sh → bootstrap_gecx.py → .env
    // NEXT_PUBLIC_ prefix makes them available at build time in Next.js.
    const TOOL_RESOURCE_NAME = process.env.NEXT_PUBLIC_CES_VISION_TOOL_RESOURCE || '';
    const TOOL_ID = TOOL_RESOURCE_NAME.split('/tools/').pop() || '';

    const CLOSE_TOOL_RESOURCE_NAME = process.env.NEXT_PUBLIC_CES_CLOSE_VISION_TOOL_RESOURCE || '';
    const CLOSE_TOOL_ID = CLOSE_TOOL_RESOURCE_NAME.split('/tools/').pop() || '';

    const REQUEST_FRAME_TOOL_RESOURCE_NAME = process.env.NEXT_PUBLIC_CES_REQUEST_FRAME_TOOL_RESOURCE || '';
    const REQUEST_FRAME_TOOL_ID = REQUEST_FRAME_TOOL_RESOURCE_NAME.split('/tools/').pop() || '';

    const onLoaded = () => {
      const chatMessenger = document.querySelector('chat-messenger') as any;
      if (!chatMessenger) return;

      if (!TOOL_ID || !CLOSE_TOOL_ID) {
        console.warn('[Zenith] CES tool resource env vars not set. Skipping client-side function registration.');
        console.warn('[Zenith] Run: bash ./scripts/deploy-dev.sh to provision tools and populate .env');
        return;
      }

      // ─── request_visual_context ───
      chatMessenger.registerClientSideFunction(
        TOOL_RESOURCE_NAME,
        TOOL_ID,
        async (args: any) => {
          console.log('[Zenith] request_visual_context invoked with args:', args);

          // Parse agent-controlled parameters
          const mode = args?.mode === 'continuous' ? 'continuous' : 'single_frame';
          const maxFrames = Math.min(Math.max(args?.max_frames || (mode === 'continuous' ? 5 : 1), 1), 10);
          const intervalSeconds = Math.min(Math.max(args?.interval_seconds || 3, 2), 10);

          console.log(`[Zenith] Vision config: mode=${mode}, maxFrames=${maxFrames}, interval=${intervalSeconds}s`);
          setVisionConfig({ mode, maxFrames, intervalSeconds });

          // Show the camera overlay
          setShowVideoFeed(true);

          // NOTE: Do NOT enable BidiRunSession here.
          // The Bidi stream transport in chat-messenger.js drops image data —
          // it only sends {input: {text: ...}} through the stream.
          // Without a Bidi session, sendImage falls back to HTTP POST (runSession),
          // which correctly includes the full multimodal payload.
          console.log('[Zenith] Camera active. sendImage will use HTTP fallback (not Bidi).');

          // Inject confirmation card
          try {
            chatMessenger.renderCustomCard([{
              "type": "info",
              "title": "📷 Camera Connected",
              "subtitle": mode === 'continuous'
                ? `Streaming to Zenith Vision · ${intervalSeconds}s intervals · Max ${maxFrames} frames`
                : "Zenith Vision · Single frame capture · Drag to reposition",
            }]);
          } catch (err) {
            console.warn('[Zenith] renderCustomCard not available:', err);
          }

          return Promise.resolve({ camera_enabled: true, mode });
        },
      );
      console.log('[Zenith] Registered client-side function: request_visual_context');

      // ─── request_additional_frame ───
      chatMessenger.registerClientSideFunction(
        REQUEST_FRAME_TOOL_RESOURCE_NAME,
        REQUEST_FRAME_TOOL_ID,
        async (args: any) => {
          console.log('[Zenith] request_additional_frame invoked — agent wants another look');
          // Grant one more frame through the circuit breaker.
          // Do NOT dispatch vision-unlock-capture here — handleAgentResponse
          // already does that when the full response cycle completes.
          // Dispatching it here caused the camera to unlock too early,
          // triggering sendImage while the tool result was still in-flight (400 errors).
          window.dispatchEvent(new Event('vision-grant-additional-frame'));
          return Promise.resolve({ frame_requested: true });
        }
      );
      console.log('[Zenith] Registered client-side function: request_additional_frame');

      // ─── close_visual_context ───
      chatMessenger.registerClientSideFunction(
        CLOSE_TOOL_RESOURCE_NAME,
        CLOSE_TOOL_ID,
        async (args: any) => {
          console.log('[Zenith] close_visual_context invoked — agent is done with camera');
          setShowVideoFeed(false);
          return Promise.resolve({ camera_closed: true });
        }
      );
      console.log('[Zenith] Registered client-side function: close_visual_context');
    };

    // The chat-messenger-loaded event fires when the widget is fully initialized
    window.addEventListener('chat-messenger-loaded', onLoaded);

    // Also check if already loaded
    const existing = document.querySelector('chat-messenger') as any;
    if (existing?.registerClientSideFunction) {
      onLoaded();
    }

    return () => window.removeEventListener('chat-messenger-loaded', onLoaded);
  }, []);

  // ─── Vision Frame Router via BidiRunSession WebSocket ────────────────
  // Circuit breaker — the agent controls frame count via visionConfig,
  // but we enforce a hard safety cap of 10 and a minimum interval.
  const FRAME_TIMEOUT_MS = 15_000;  // 15 seconds to wait for agent response

  useEffect(() => {
    let framesSent = 0;
    let pendingFrame = false;
    let lastFrameTime = 0;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let halted = false;

    const handleCaptureFrame = async (e: Event) => {
      const customEvent = e as CustomEvent<{ base64Frame: string }>;
      const base64Frame = customEvent.detail?.base64Frame;
      if (!base64Frame) return;

      // ── Circuit breaker checks ──
      if (halted) {
        console.warn('[Zenith] Vision halted due to previous error. Ignoring frame.');
        return;
      }

      // Agent-controlled max, with hard safety cap of 10
      const maxFrames = Math.min(visionConfig.maxFrames, 10);
      if (framesSent >= maxFrames) {
        // Only fire the halted event once, not on every subsequent STEADY
        if (!halted) {
          console.warn(`[Zenith] Max frames (${maxFrames}) reached for this session.`);
          halted = true;
          window.dispatchEvent(new CustomEvent('vision-halted', { detail: { reason: 'max-frames' } }));
        }
        return;
      }

      if (pendingFrame) {
        console.warn('[Zenith] Frame already pending agent response. Ignoring.');
        return;
      }

      // Agent-controlled interval, with hard minimum of 2 seconds
      const minIntervalMs = Math.max(visionConfig.intervalSeconds * 1000, 2000);
      const now = Date.now();
      if (now - lastFrameTime < minIntervalMs) {
        console.warn('[Zenith] Too soon since last frame. Ignoring.');
        return;
      }

      // ── Send frame via presenter.sendImage() ──
      // This uses the widget's native API — no raw WebSocket needed.
      // The widget handles transport internally (gRPC-web / BidiRunSession).
      const chatMessenger = document.querySelector('chat-messenger') as any;
      if (!chatMessenger?.presenter?.sendImage) {
        console.error('[Zenith] presenter.sendImage not available. Cannot send frame.');
        halted = true;
        window.dispatchEvent(new CustomEvent('vision-halted', { detail: { reason: 'no-sendImage' } }));
        return;
      }

      try {
        // Lock BEFORE the async call to prevent race conditions
        pendingFrame = true;
        framesSent++;
        lastFrameTime = Date.now();

        // Convert base64 to Blob — sendImage internally uses FileReader.readAsDataURL
        const byteString = atob(base64Frame);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/jpeg' });

        console.log(`[Zenith] Sending frame ${framesSent}/${maxFrames} via presenter.sendImage() (${(base64Frame.length / 1024).toFixed(1)}KB)`);
        await chatMessenger.presenter.sendImage(blob);
        console.log(`[Zenith] Frame ${framesSent}/${maxFrames} sent successfully.`);

        // Timeout: if the agent doesn't respond in 15s, unlock camera
        timeoutHandle = setTimeout(() => {
          if (pendingFrame) {
            console.warn('[Zenith] Agent response timeout. Unlocking camera.');
            pendingFrame = false;
            window.dispatchEvent(new Event('vision-unlock-capture'));
          }
        }, FRAME_TIMEOUT_MS);

      } catch (err) {
        console.error('[Zenith] Failed to send frame via sendImage:', err);
        // Undo the optimistic lock on error
        pendingFrame = false;
        framesSent = Math.max(0, framesSent - 1);
        console.warn('[Zenith] Will retry on next steady-state detection.');
      }
    };

    // When the widget receives any agent response, clear the pending flag and unlock
    const handleAgentResponse = () => {
      if (pendingFrame) {
        console.log('[Zenith] Agent response received. Clearing pending frame, unlocking camera.');
        pendingFrame = false;
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        window.dispatchEvent(new Event('vision-unlock-capture'));
      }
    };

    // When the agent calls request_additional_frame, grant one more frame
    const handleGrantFrame = () => {
      console.log('[Zenith] Agent granted additional frame. Resetting circuit breaker allowance.');
      // Decrement so the max-frames check passes for one more frame
      framesSent = Math.max(0, framesSent - 1);
      halted = false;
      // Do NOT reset pendingFrame here — handleAgentResponse controls that lock.
      // Resetting it here caused double-unlocks and concurrent sendImage calls (400 errors).
      // Reset interval timer so the next frame isn't blocked by "too soon"
      lastFrameTime = 0;
    };

    window.addEventListener('vision-capture-frame', handleCaptureFrame);
    window.addEventListener('vision-grant-additional-frame', handleGrantFrame);

    // Listen for agent responses on both window and the widget element
    window.addEventListener('chat-messenger-response-received', handleAgentResponse);
    const messenger = document.querySelector('chat-messenger');
    if (messenger) {
      messenger.addEventListener('chat-messenger-response-received', handleAgentResponse);
    }

    return () => {
      window.removeEventListener('vision-capture-frame', handleCaptureFrame);
      window.removeEventListener('vision-grant-additional-frame', handleGrantFrame);
      window.removeEventListener('chat-messenger-response-received', handleAgentResponse);
      if (messenger) {
        messenger.removeEventListener('chat-messenger-response-received', handleAgentResponse);
      }
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [showVideoFeed, visionConfig]);

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm text-slate-900 dark:text-white transition-all duration-300 ease-in-out pr-0"
      )}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-primary group shrink-0">
            <Radar className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-headline font-black text-xl tracking-tighter text-slate-900 dark:text-white whitespace-nowrap hidden sm:inline">
              Project <span className="text-primary">Zenith</span>
            </span>
          </Link>
          <nav className="hidden lg:flex space-x-8 items-center shrink-0">
            <Link href="/#features" className="text-slate-600 dark:text-slate-400 font-medium hover:text-blue-500 dark:hover:text-blue-300 transition-colors active:scale-95 duration-200 text-sm flex items-center space-x-1.5"><Star className="w-4 h-4" /><span>Features</span></Link>
            <Link href="/#architecture" className="text-slate-600 dark:text-slate-400 font-medium hover:text-blue-500 dark:hover:text-blue-300 transition-colors active:scale-95 duration-200 text-sm flex items-center space-x-1.5"><Network className="w-4 h-4" /><span>Architecture</span></Link>
            <Link href="/#costs" className="text-slate-600 dark:text-slate-400 font-medium hover:text-blue-500 dark:hover:text-blue-300 transition-colors active:scale-95 duration-200 text-sm flex items-center space-x-1.5"><Banknote className="w-4 h-4" /><span>Costs</span></Link>
            <Link href="/walkthrough" className="text-slate-600 dark:text-slate-400 font-medium hover:text-blue-500 dark:hover:text-blue-300 transition-colors active:scale-95 duration-200 text-sm flex items-center space-x-1.5"><Compass className="w-4 h-4" /><span>Walkthroughs</span></Link>
          </nav>
          <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-blue-600 transition-colors focus:outline-hidden flex items-center justify-center"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200">
            <nav className="flex flex-col p-4 space-y-2">
              <Link href="/#features" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base font-medium px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md flex items-center space-x-3"><Star className="w-5 h-5" /><span>Features</span></Link>
              <Link href="/#architecture" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base font-medium px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md flex items-center space-x-3"><Network className="w-5 h-5" /><span>Architecture</span></Link>
              <Link href="/#costs" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base font-medium px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md flex items-center space-x-3"><Banknote className="w-5 h-5" /><span>Costs</span></Link>
              <Link href="/walkthrough" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base font-medium px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md flex items-center space-x-3"><Compass className="w-5 h-5" /><span>Walkthroughs</span></Link>
            </nav>
          </div>
        )}
      </header>

      <div className={cn(
        "transition-all duration-300 ease-in-out pr-0"
      )}>
        {children}
      </div>

      {/* Visual Context Camera Overlay — floats above the chat bubble */}
      {showVideoFeed && <VideoFeed onClose={handleCloseCamera} mode={visionConfig.mode} maxFrames={visionConfig.maxFrames} />}

      {/* CES chat-messenger Web Component — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50">
        <chat-messenger
          language-code="en"
          max-query-length="-1"
          url-allowlist="*"
          logging-level="DEBUG"
        >
          <chat-messenger-chat-bubble 
            chat-title="Ask Zenith"
            chat-title-icon="/globe.svg"
            enable-file-upload="true"
            enable-audio-input="true"
          ></chat-messenger-chat-bubble>
        </chat-messenger>
      </div>
    </>
  );
}
