/**
 * LiveKitSession — WebRTC session component (US-10, US-13)
 *
 * Manages the LiveKit room connection and integrates the
 * WebSocket-driven multimodal intercept handler.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { LiveKitRoom, useRoomContext, RoomAudioRenderer, StartAudio } from "@livekit/components-react";
import { fetchLiveKitToken } from "@/lib/api/livekit";
import { handoffSession, updateCameraState } from "@/lib/api/sessions";
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

  const [mounted, setMounted] = useState(false);
  const [corner, setCorner] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("bottom-right");

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCamEnabled, setIsCamEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rotateCorner = () => {
    const sequence = ["bottom-right", "bottom-left", "top-left", "top-right"] as const;
    const currentIndex = sequence.indexOf(corner);
    setCorner(sequence[(currentIndex + 1) % sequence.length]);
  };

  const toggleMic = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!room?.localParticipant) return;
    const newState = !isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(newState);
    setIsMicEnabled(newState);
  };

  const toggleCam = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!room?.localParticipant) return;
    const newState = !isCamEnabled;
    await room.localParticipant.setCameraEnabled(newState);
    
    // Completely stop and restart the local preview to ensure accurate hardware state representation
    if (newState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 320, height: 240 },
          audio: false,
        });
        setPreviewStream(stream);
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : "Failed to resume camera");
      }
    } else {
      if (previewStream) {
        previewStream.getTracks().forEach(t => t.stop());
        setPreviewStream(null);
      }
    }
    
    setIsCamEnabled(newState);
    if (room) {
      await updateCameraState(room.name, newState);
    }
  };

  const handleManualHandoff = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!room) return;
    try {
      await handoffSession(room.name);
    } catch(err) {
      console.error("Failed manual handoff", err);
    }
  };

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

  if (multimodalEvent === null || !mounted) return null;

  const cornerClasses = {
    "top-left": "top-20 left-4",
    "top-right": "top-20 right-4",
    "bottom-left": "bottom-6 left-4",
    "bottom-right": "bottom-6 right-4"
  };

  return createPortal(
    <>
      <div 
        onClick={rotateCorner}
        className={`fixed ${cornerClasses[corner]} w-48 aspect-video rounded-xl shadow-2xl bg-black z-[100] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] animate-in fade-in zoom-in cursor-pointer border border-white/20 group flex flex-col`}
        title="Tap to move video"
      >
        <div className="relative flex-grow overflow-hidden rounded-t-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="object-cover w-full h-full transform -scale-x-100 pointer-events-none"
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white font-medium flex items-center shadow-sm border border-white/10 pointer-events-none whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${previewStream ? (isCamEnabled ? "bg-green-400 animate-pulse" : "bg-amber-500") : "bg-amber-500"}`}></span>
            {previewStream ? (isCamEnabled ? "Live" : "Paused") : "Starting"}
          </div>
        </div>

        {/* Control Bar Overlay */}
        <div className="bg-black/90 backdrop-blur-md h-10 w-full rounded-b-xl flex items-center justify-between px-3 border-t border-white/10">
          <div className="flex space-x-1">
            <button 
              onClick={toggleMic}
              className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${isMicEnabled ? "text-white hover:bg-white/10" : "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"}`}
              title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isMicEnabled ? "mic" : "mic_off"}
              </span>
            </button>
            <button 
              onClick={toggleCam}
              className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${isCamEnabled ? "text-white hover:bg-white/10" : "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"}`}
              title={isCamEnabled ? "Pause Camera" : "Resume Camera"}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isCamEnabled ? "videocam" : "videocam_off"}
              </span>
            </button>
          </div>
          <button 
            onClick={handleManualHandoff}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors border border-white/10"
            title="End video session and return to text chat"
          >
            End
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
