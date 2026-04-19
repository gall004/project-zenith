/**
 * LiveKitSession — WebRTC session component (US-10, US-13)
 *
 * Manages the LiveKit room connection and integrates the
 * WebSocket-driven multimodal intercept handler.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LiveKitRoom, useRoomContext, RoomAudioRenderer, StartAudio } from "@livekit/components-react";
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
    if (!token && !isLoading && !error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadToken();
    }
  }, [loadToken, token, isLoading, error]);





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
    return <></>; // fallback intermediate state
  }

  // Active State
  return (
    <LiveKitRoom
      audio={true}
      token={token}
      serverUrl={
        process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880"
      }
      connect={true}
      className="contents"
    >
      <RoomAudioRenderer />
      <div className="absolute bottom-6 right-6 z-50">
        <StartAudio label="Click to Allow Voice Interaction" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full shadow-lg border border-primary/20 animate-in fade-in transition-all" />
      </div>
      <MultimodalInterceptHandler
        multimodalEvent={multimodalEvent}
      />
    </LiveKitRoom>
  );
}

/**
 * MultimodalInterceptHandler (US-10 Refactor)
 *
 * Merged component that:
 * 1. Enables the LiveKit camera track when a multimodal event arrives
 * 2. Renders a local camera viewfinder using a separate getUserMedia()
 *    stream — completely independent of LiveKit's internal WebRTC track
 *
 * Why separate streams: LiveKit's setCameraEnabled() acquires a camera track
 * and hands it to the RTCPeerConnection sender. After that handoff, the
 * original MediaStreamTrack may not produce frames for local playback
 * (browser implementation detail). A second getUserMedia() call shares the
 * same physical camera hardware but returns an independent MediaStream
 * that reliably renders in a local <video> element.
 */
function MultimodalInterceptHandler({
  multimodalEvent,
}: {
  multimodalEvent: EnableMultimodalInputEvent | null;
}): React.JSX.Element | null {
  const room = useRoomContext();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Enable LiveKit camera + acquire separate preview stream
  useEffect(() => {
    if (multimodalEvent === null) return;
    if (!room?.localParticipant) return;

    let localPreviewStream: MediaStream | null = null;

    const enableCamera = async (): Promise<void> => {
      try {
        setCameraError(null);

        // 1. Enable camera for LiveKit (sends video to the server/Gemini)
        await room.localParticipant.setCameraEnabled(true);
        console.log("[Viewfinder] LiveKit camera enabled");

        // 2. Get a separate camera stream for local preview
        // This reuses the same physical camera (no extra permission prompt)
        // but gives us an independent stream that renders locally
        localPreviewStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 320, height: 240 },
          audio: false,
        });
        setPreviewStream(localPreviewStream);
        console.log("[Viewfinder] ✅ Local preview stream acquired");
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Camera could not be activated.";
        setCameraError(errorMessage);
        console.error("[Viewfinder] ❌ Error:", errorMessage);
      }
    };

    enableCamera();

    return () => {
      // Stop all tracks on the preview stream
      if (localPreviewStream) {
        localPreviewStream.getTracks().forEach((t) => t.stop());
      }
      setPreviewStream(null);
    };
  }, [multimodalEvent, room?.localParticipant]);

  // Attach preview stream to video element
  useEffect(() => {
    const videoNode = videoRef.current;
    if (videoNode) {
      videoNode.srcObject = previewStream;
    }
    return () => {
      if (videoNode) {
        videoNode.srcObject = null;
      }
    };
  }, [previewStream]);

  if (cameraError) {
    return (
      <div className="absolute top-4 right-4 text-xs px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
        Camera unavailable: {cameraError}
      </div>
    );
  }

  if (multimodalEvent === null) return null;

  return (
    <>
      {/* Local camera viewfinder — independent preview stream */}
      <div className="absolute top-4 left-4 w-32 h-44 rounded-lg overflow-hidden border-2 border-primary/50 shadow-xl bg-black z-20 transition-all duration-300 animate-in fade-in zoom-in">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="object-cover w-full h-full transform -scale-x-100"
        />
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-sm bg-black/50 text-[10px] text-white/90 z-10">
          {previewStream ? "Local Feed" : "Acquiring..."}
        </div>
      </div>
    </>
  );
}
