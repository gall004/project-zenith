/**
 * LiveKitSession — WebRTC session component (US-10, US-13)
 *
 * Manages the LiveKit room connection and integrates the
 * WebSocket-driven multimodal intercept handler.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { LiveKitRoom, useRoomContext } from "@livekit/components-react";
import { fetchLiveKitToken } from "@/lib/api/livekit";
import { Button } from "@/components/ui/button";
import type { EnableMultimodalInputEvent } from "@/types/websocket";
import "@livekit/components-styles";

export function LiveKitSession({
  roomName,
  identity,
  multimodalEvent,
}: {
  roomName: string;
  identity: string;
  multimodalEvent: EnableMultimodalInputEvent | null;
}): React.JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const loadToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const jwt = await fetchLiveKitToken(roomName, identity);
      setToken(jwt);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to connect to secure voice session.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [roomName, identity]);

  useEffect(() => {
    if (hasStarted && !token && !isLoading && !error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadToken();
    }
  }, [hasStarted, loadToken, token, isLoading, error]);

  // Empty/Ready State
  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] w-full border-dashed border-2 rounded-xl bg-card p-6 space-y-4 shadow-sm relative overflow-hidden">
        <h3 className="text-xl font-bold text-foreground">
          Ready to Connect
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm text-center">
          Click below to establish the secure LiveKit WebRTC connection. This validates the browser media capability securely.
        </p>
        <Button onClick={() => setHasStarted(true)} size="lg" className="mt-2">
          Initialize Audio Session
        </Button>
      </div>
    );
  }

  // Loading State (Skeleton)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] w-full bg-muted rounded-xl motion-safe:animate-pulse shadow-sm">
        <p className="text-muted-foreground font-medium flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          Negotiating secure connection...
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] w-full border-destructive/50 border-2 rounded-xl bg-destructive/10 p-6 space-y-4 shadow-sm">
        <h3 className="text-xl font-bold text-destructive">
          Connection Failed
        </h3>
        <p className="text-sm text-foreground/80 max-w-md text-center">
          {error}
        </p>
        <Button onClick={loadToken} variant="outline" className="mt-2">
          Retry Handshake
        </Button>
      </div>
    );
  }

  if (!token) {
    return null; // fallback intermediate state
  }

  // Active State
  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      options={{ videoCaptureDefaults: { facingMode: "environment" } }}
      serverUrl={
        process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880"
      }
      connect={true}
      className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card min-h-[200px] w-full shadow-sm relative overflow-hidden"
    >
      <MultimodalInterceptHandler
        multimodalEvent={multimodalEvent}
      />
      <div className="text-card-foreground text-center space-y-4 z-10">
        <h2 className="text-2xl font-bold tracking-tight">
          Active Voice Session
        </h2>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm text-primary shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          LiveKit Secured
        </div>
      </div>
    </LiveKitRoom>
  );
}

/**
 * MultimodalInterceptHandler (US-10 Refactor)
 *
 * Reacts to `enable_multimodal_input` WebSocket events passed via props
 * to programmatically enable the camera track. Replaces the legacy
 * window.addEventListener approach.
 */
function MultimodalInterceptHandler({
  multimodalEvent,
}: {
  multimodalEvent: EnableMultimodalInputEvent | null;
}): React.JSX.Element {
  const room = useRoomContext();
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (multimodalEvent === null) return;
    if (!room?.localParticipant) return;

    const enableCamera = async (): Promise<void> => {
      try {
        setCameraError(null);
        await room.localParticipant.setCameraEnabled(true);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Camera could not be activated.";
        setCameraError(errorMessage);
      }
    };

    enableCamera();
  }, [multimodalEvent, room]);

  if (cameraError) {
    return (
      <div className="absolute top-4 right-4 text-xs px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
        Camera unavailable: {cameraError}
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 text-xs font-mono px-2 py-1 bg-muted/50 rounded-md text-muted-foreground border border-border/50">
      Intercept Node Active
    </div>
  );
}
