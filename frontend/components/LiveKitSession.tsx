/**
 * LiveKitSession — WebRTC session component (US-10, US-13)
 *
 * Manages the LiveKit room connection and integrates the
 * WebSocket-driven multimodal intercept handler.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { LiveKitRoom, useRoomContext, RoomAudioRenderer, StartAudio, useRemoteParticipants, useIsSpeaking, useConnectionState } from "@livekit/components-react";
import { fetchLiveKitToken } from "@/lib/api/livekit";
import { handoffSession, updateCameraState } from "@/lib/api/sessions";
import { Track, ConnectionState } from "livekit-client";
import { Button } from "@/components/ui/button";
import type { EnableMultimodalInputEvent } from "@/types/websocket";
import "@livekit/components-styles";

export function LiveKitSession({
  roomName,
  identity,
  multimodalEvent,
  isOpen = true,
}: {
  roomName: string;
  identity: string;
  multimodalEvent: EnableMultimodalInputEvent | null;
  isOpen?: boolean;
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

  // Only fetch the LiveKit token when multimodal escalation is triggered.
  // This prevents LiveKit room creation (and billing) during text-only chat.
  useEffect(() => {
    if (multimodalEvent && !token && !isLoading && !error) {
      loadToken();
    }
  }, [multimodalEvent, loadToken, token, isLoading, error]);





  // Loading State (Skeleton) - Only show if drawer is actually open
  if (isLoading && isOpen) {
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

  // Error State - Only show if drawer is open
  if (error && isOpen) {
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
      audio={!!multimodalEvent}
      token={token}
      serverUrl={
        process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880"
      }
      connect={!!multimodalEvent && isOpen}
      className="contents"
      options={{
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        }
      }}
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
  const connectionState = useConnectionState();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [mounted, setMounted] = useState(false);
  const [corner, setCorner] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("bottom-right");

  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCamEnabled, setIsCamEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHandingOff, setIsHandingOff] = useState(false);
  const [facingModeState, setFacingModeState] = useState<"user" | "environment" | null>(null);
  const facingMode = facingModeState ?? (multimodalEvent?.payload.pipeline_type === "sentiment" ? "user" : "environment");
  const [isMirrored, setIsMirrored] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset handing off state if the modal closes/changes
  useEffect(() => {
    if (!multimodalEvent) {
      setIsHandingOff(false);
    }
  }, [multimodalEvent]);

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
          video: { facingMode: facingMode, width: 320, height: 240 },
          audio: false,
        });
        setPreviewStream(stream);
        const actualFacingMode = stream.getVideoTracks()[0]?.getSettings().facingMode;
        setIsMirrored(actualFacingMode !== "environment");
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

  const flipCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!room?.localParticipant) return;
    
    const newMode = facingMode === "user" ? "environment" : "user";
    
    if (isCamEnabled) {
      try {
        // 1. Stop the existing preview stream
        if (previewStream) {
          previewStream.getTracks().forEach(t => t.stop());
          setPreviewStream(null);
        }

        // 2. Fully disable the old camera track before switching
        //    This releases the hardware lock on the current camera.
        await room.localParticipant.setCameraEnabled(false);

        // 3. Re-enable with the new facing mode
        await room.localParticipant.setCameraEnabled(true, { facingMode: newMode });

        // 4. Derive preview from the published LiveKit track
        //    This ensures preview and LiveKit use the same stream
        //    (no aspect ratio mismatch → no black bars).
        const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
        const mediaStream = camTrack?.track?.mediaStream;
        if (mediaStream) {
          setPreviewStream(mediaStream);
          const actualFacingMode = mediaStream.getVideoTracks()[0]?.getSettings().facingMode;
          setIsMirrored(actualFacingMode !== "environment");
        } else {
          // Fallback: open a dedicated preview stream
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: newMode, width: 320, height: 240 },
            audio: false,
          });
          setPreviewStream(stream);
          const actualFacingMode = stream.getVideoTracks()[0]?.getSettings().facingMode;
          setIsMirrored(actualFacingMode !== "environment");
        }
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : "Failed to flip camera");
      }
    }
    
    setFacingModeState(newMode);
  };

  const handleManualHandoff = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!room || isHandingOff) return;
    setIsHandingOff(true);
    try {
      await handoffSession(room.name);
    } catch(err) {
      console.error("Failed manual handoff", err);
      setIsHandingOff(false);
    }
  };

  // Enable LiveKit camera + acquire preview stream
  useEffect(() => {
    if (multimodalEvent === null) return;
    if (!room?.localParticipant) return;
    if (connectionState !== ConnectionState.Connected) return;

    const enableCamera = async (): Promise<void> => {
      try {
        setCameraError(null);

        const initialMode = multimodalEvent?.payload.pipeline_type === "sentiment" ? "user" : "environment";

        // Note: Microphone is now handled automatically by LiveKitRoom's audio={!!multimodalEvent} prop
        setIsMicEnabled(true);

        // 1. Enable camera for LiveKit (sends video to the server/Gemini)
        await room.localParticipant.setCameraEnabled(true, { facingMode: initialMode });
        console.log(`[Viewfinder] LiveKit camera enabled (${initialMode})`);

        // 2. Derive preview from the published LiveKit track
        //    This ensures preview and LiveKit use the same stream, avoiding
        //    hardware lock race conditions on mobile devices.
        const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
        const mediaStream = camTrack?.track?.mediaStream;
        if (mediaStream) {
          setPreviewStream(mediaStream);
          const actualFacingMode = mediaStream.getVideoTracks()[0]?.getSettings().facingMode;
          setIsMirrored(actualFacingMode !== "environment");
          console.log("[Viewfinder] ✅ Local preview stream acquired from LiveKit");
        } else {
          // Fallback
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: initialMode, width: 320, height: 240 },
            audio: false,
          });
          setPreviewStream(stream);
          const actualFacingMode = stream.getVideoTracks()[0]?.getSettings().facingMode;
          setIsMirrored(actualFacingMode !== "environment");
        }
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
  }, [multimodalEvent, room?.localParticipant, connectionState]);

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
        onClick={isExpanded ? undefined : rotateCorner}
        className={`fixed z-[100] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] animate-in fade-in zoom-in border border-white/20 group flex flex-col shadow-2xl bg-black rounded-xl ${
          isExpanded 
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,640px)] aspect-video" 
            : `${cornerClasses[corner]} w-56 aspect-video cursor-pointer`
        }`}
        title={isExpanded ? undefined : "Tap to move video"}
      >
        <div className="relative flex-grow overflow-hidden rounded-t-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`object-cover w-full h-full transform pointer-events-none ${isMirrored ? "-scale-x-100" : ""}`}
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white font-medium flex items-center shadow-sm border border-white/10 pointer-events-none whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${previewStream ? (isCamEnabled ? "bg-green-400 animate-pulse" : "bg-amber-500") : "bg-amber-500"}`}></span>
            {previewStream ? (isCamEnabled ? "Live" : "Paused") : "Starting"}
          </div>
          <OrbAvatar />
        </div>

        {/* Control Bar Overlay */}
        <div className={`bg-black/90 backdrop-blur-md w-full rounded-b-xl flex items-center justify-between border-t border-white/10 ${isExpanded ? "h-12 px-4" : "h-10 px-2"}`}>
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
            <button 
              onClick={flipCamera}
              className="p-1.5 rounded-full text-white hover:bg-white/10 transition-colors flex items-center justify-center md:hidden"
              title="Flip Camera"
            >
              <span className="material-symbols-outlined text-[16px]">
                cameraswitch
              </span>
            </button>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="p-1.5 rounded-full text-white hover:bg-white/10 transition-colors flex items-center justify-center"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isExpanded ? "close_fullscreen" : "open_in_full"}
              </span>
            </button>
          <button 
            onClick={handleManualHandoff}
            disabled={isHandingOff}
            className={`px-2 py-1 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors border border-white/10 ${
              isHandingOff ? "bg-amber-500/30 cursor-wait" : "bg-white/10 hover:bg-white/20"
            }`}
            title="End video session and return to text chat"
          >
            {isHandingOff ? "Ending…" : "End"}
          </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function OrbAvatar(): React.JSX.Element | null {
  const participants = useRemoteParticipants();
  const agent = participants[0];

  if (!agent) return null;

  return <ActiveOrbAvatar participant={agent} />;
}

function ActiveOrbAvatar({ participant }: { participant: any }): React.JSX.Element {
  const isSpeaking = useIsSpeaking(participant);

  return (
    <div className="absolute top-2 right-2 pointer-events-none flex items-center justify-center p-1" title="Agent Presence">
      <div className={`relative flex items-center justify-center transition-all duration-300 ${isSpeaking ? "scale-110" : "scale-100"}`}>
        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-full bg-cyan-400 blur-md transition-opacity duration-300 ${isSpeaking ? "opacity-80 animate-pulse" : "opacity-30"}`}></div>
        {/* Core orb */}
        <div className={`relative h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(34,211,238,1)] z-10 flex items-center justify-center overflow-hidden`}>
          <div className={`h-full w-full bg-cyan-400 transition-transform duration-100 origin-bottom ${isSpeaking ? "scale-y-100" : "scale-y-50"}`}></div>
        </div>
      </div>
    </div>
  );
}
