'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, FlipHorizontal2, X, Move, Pause, Play } from 'lucide-react';

interface VideoFeedProps {
  onClose: () => void;
  mode: 'single_frame' | 'continuous';
  maxFrames: number;
}

interface Position {
  x: number;
  y: number;
}

const SNAP_THRESHOLD = 80;
const SNAP_PADDING = 24;
const OVERLAY_WIDTH = 320;
const OVERLAY_HEIGHT = 240;

/**
 * Premium draggable camera viewfinder for visual context.
 *
 * Shows a live camera preview and streams frames to the GECX agent 
 * via the chat-messenger widget's BidiRunSession.
 *
 * Features:
 * - Drag-to-reposition with snap-to-corner
 * - Flip camera (front/rear)
 * - Pause/resume frame streaming
 * - Adaptive frame rate (0.5–2 FPS based on scene motion)
 * - Glassmorphism styling
 */
export function VideoFeed({ onClose, mode, maxFrames }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [captureState, setCaptureState] = useState<'SEARCHING' | 'STEADY' | 'LOCKED'>('SEARCHING');
  const [isPaused, setIsPaused] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isClosing, setIsClosing] = useState(false);

  // Default to top-left to avoid chat widget on the right
  const [position, setPosition] = useState<Position>({
    x: SNAP_PADDING,
    y: 80, // Below the header bar
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

  const STEADY_DURATION_MS = 1000; // 1 second of holding still
  const MOTION_THRESHOLD = 0.015; // 1.5% pixel change allows for sensor noise
  const ANALYSIS_INTERVAL_MS = 300; // Check motion every 300ms
  const steadyTimeRef = useRef<number>(0);

  // Initialize camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }
        });
        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Failed to access camera:", err);
        setError("Camera access denied or unavailable.");
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  /**
   * Calculate the fraction of pixels that changed between two frames.
   */
  const calculateMotion = useCallback((currentFrame: ImageData): number => {
    if (!prevFrameRef.current) return 1;
    const prev = prevFrameRef.current.data;
    const curr = currentFrame.data;
    const len = prev.length;
    let changedPixels = 0;
    const totalPixels = len / 4;

    for (let i = 0; i < len; i += 16) {
      const dr = Math.abs(curr[i] - prev[i]);
      const dg = Math.abs(curr[i + 1] - prev[i + 1]);
      const db = Math.abs(curr[i + 2] - prev[i + 2]);
      if (dr + dg + db > 60) changedPixels++;
    }

    return changedPixels / (totalPixels / 4);
  }, []);

  /**
   * Motion analysis loop. Checks for steady state and captures frame.
   */
  const analyzeMotion = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isPaused) {
      if (!isPaused) {
        intervalRef.current = setTimeout(analyzeMotion, ANALYSIS_INTERVAL_MS);
      }
      return;
    }

    setCaptureState(currentCaptureState => {
      if (currentCaptureState === 'LOCKED') {
        // Just wait until unlocked by agent response
        intervalRef.current = setTimeout(analyzeMotion, ANALYSIS_INTERVAL_MS);
        return currentCaptureState;
      }

      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx || video.videoWidth === 0) {
        intervalRef.current = setTimeout(analyzeMotion, ANALYSIS_INTERVAL_MS);
        return currentCaptureState;
      }

      const MAX_WIDTH = 640;
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const motion = calculateMotion(currentFrame);
      prevFrameRef.current = currentFrame;

      if (motion <= MOTION_THRESHOLD) {
        steadyTimeRef.current += ANALYSIS_INTERVAL_MS;
        
        if (steadyTimeRef.current >= STEADY_DURATION_MS) {
          // Trigger capture!
          console.log('[Zenith] Steady state reached. Capturing frame and locking.');
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64Frame = dataUrl.split(',')[1];
          window.dispatchEvent(new CustomEvent('vision-capture-frame', { detail: { base64Frame } }));
          setFrameCount(prev => prev + 1);
          
          steadyTimeRef.current = 0;
          intervalRef.current = setTimeout(analyzeMotion, ANALYSIS_INTERVAL_MS);
          return 'LOCKED';
        }
        
        // Almost steady, transition UI state if we are close (e.g. 600ms)
        if (steadyTimeRef.current >= 600 && currentCaptureState === 'SEARCHING') {
           intervalRef.current = setTimeout(analyzeMotion, ANALYSIS_INTERVAL_MS);
           return 'STEADY';
        }
      } else {
        // Motion detected, reset steady time
        steadyTimeRef.current = 0;
        if (currentCaptureState !== 'SEARCHING') {
           intervalRef.current = setTimeout(analyzeMotion, ANALYSIS_INTERVAL_MS);
           return 'SEARCHING';
        }
      }

      intervalRef.current = setTimeout(analyzeMotion, ANALYSIS_INTERVAL_MS);
      return currentCaptureState;
    });
  }, [calculateMotion, isPaused]);

  // Unlock listener — agent responded or granted additional frame, allow next capture
  useEffect(() => {
    const handleUnlock = () => {
      console.log('[Zenith] Unlocking viewfinder for next capture.');
      setCaptureState('SEARCHING');
      steadyTimeRef.current = 0;
      // Clear halt state so the capture loop can restart
      setHaltReason(null);
      setIsPaused(false);
    };
    window.addEventListener('vision-unlock-capture', handleUnlock);
    return () => window.removeEventListener('vision-unlock-capture', handleUnlock);
  }, []);

  // Halt listener — circuit breaker tripped, stop all capture
  const [haltReason, setHaltReason] = useState<string | null>(null);

  useEffect(() => {
    const handleHalt = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const reason = detail?.reason || 'unknown';
      console.error('[Zenith] Vision halted:', reason);
      setHaltReason(reason);
      setCaptureState('LOCKED');
      setIsPaused(true);
    };
    window.addEventListener('vision-halted', handleHalt);
    return () => window.removeEventListener('vision-halted', handleHalt);
  }, []);

  // Start/stop capture loop
  useEffect(() => {
    if (!stream || isPaused) return;

    const startDelay = setTimeout(() => {
      analyzeMotion();
    }, 500);

    return () => {
      clearTimeout(startDelay);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [stream, analyzeMotion, isPaused]);

  // ─── Drag Handlers ──────────────────────────────────────────────────
  const snapToCorner = useCallback((x: number, y: number): Position => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const centerX = x + OVERLAY_WIDTH / 2;
    const centerY = y + OVERLAY_HEIGHT / 2;

    const isLeft = centerX < vw / 2;
    const isTop = centerY < vh / 2;

    const nearEdgeX = isLeft ? x < SNAP_THRESHOLD : x > vw - OVERLAY_WIDTH - SNAP_THRESHOLD;
    const nearEdgeY = isTop ? y < SNAP_THRESHOLD : y > vh - OVERLAY_HEIGHT - SNAP_THRESHOLD;

    let snapX = x;
    let snapY = y;

    if (nearEdgeX) {
      snapX = isLeft ? SNAP_PADDING : vw - OVERLAY_WIDTH - SNAP_PADDING;
    }
    if (nearEdgeY) {
      snapY = isTop ? SNAP_PADDING + 64 : vh - OVERLAY_HEIGHT - SNAP_PADDING;
    }

    return { x: snapX, y: snapY };
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;

      const newX = Math.max(0, Math.min(window.innerWidth - OVERLAY_WIDTH, dragStartRef.current.posX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - OVERLAY_HEIGHT, dragStartRef.current.posY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      setPosition(prev => snapToCorner(prev.x, prev.y));
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, snapToCorner]);

  // ─── Actions ────────────────────────────────────────────────────────
  const handleFlipCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }

      // Send vision_session_complete as a native CES event input.
      // Uses the widget's built-in sendEvent() which maps to SessionInput.event
      // in the runSession API — cleaner than injecting text sentinels.
      try {
        const messenger = document.querySelector('chat-messenger') as ChatMessengerElement | null;
        if (messenger?.sendEvent) {
          messenger.sendEvent('vision_session_complete');
        } else if (messenger?.sendMessage) {
          // Fallback for older widget versions that lack sendEvent
          messenger.sendMessage('<event>vision_session_complete</event>');
        }
        // Turn off BidiRunSession if it was enabled (optional, but good practice if leaving multimodal)
        if (messenger?.presenter?.toggleBidiSession) {
          // Actually, we want to leave audio on as requested, so we do not disable BidiRunSession here.
          // The audio will keep running. We just closed the camera.
          console.log('[Zenith] Camera closed, leaving audio session active.');
        }
      } catch (err) {
        console.warn('Failed to send vision_session_complete:', err);
      }

      onClose();
    }, 300);
  }, [stream, onClose]);

  return (
    <div
      ref={containerRef}
      className={`fixed z-[9998] select-none ${isClosing ? 'animate-out slide-out-to-bottom fade-out duration-300' : 'animate-in slide-in-from-bottom-4 fade-in duration-300'}`}
      style={{
        left: position.x,
        top: position.y,
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out',
      }}
    >
      <div className={`relative w-full h-full bg-slate-900/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 group ring-2 ${haltReason ? 'ring-red-500/60' : isPaused ? 'ring-amber-500/40' : 'ring-blue-500/30'} transition-all duration-500`}>
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <CameraOff className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Drag handle bar */}
            <div
              className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-3 cursor-grab active:cursor-grabbing z-10"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    haltReason ? 'bg-red-500' :
                    isPaused ? 'bg-amber-400' : 
                    captureState === 'LOCKED' ? 'bg-blue-500' :
                    captureState === 'STEADY' ? 'bg-green-500 animate-ping' :
                    'bg-red-500 animate-pulse'
                  }`} />
                  <span className="text-[10px] font-bold text-white/90 tracking-widest uppercase">
                    {haltReason === 'max-frames' ? 'Limit Reached' :
                     haltReason === 'no-websocket' ? 'No Connection' :
                     haltReason ? 'Error' :
                     isPaused ? 'Paused' : 
                     captureState === 'LOCKED' ? (mode === 'single_frame' ? 'Waiting for Agent' : 'Analyzing') :
                     captureState === 'STEADY' ? 'Acquiring' :
                     'Searching'}
                  </span>
                </div>
                {frameCount > 0 && (
                  <span className="text-[10px] font-mono text-white/50">
                    {frameCount}/{maxFrames}
                  </span>
                )}
                {mode === 'continuous' && !haltReason && (
                  <span className="text-[10px] text-blue-400/60 font-medium">LIVE</span>
                )}
              </div>
              <Move className="w-3.5 h-3.5 text-white/40" />
            </div>

            {/* Halt overlay — circuit breaker tripped */}
            {haltReason && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="bg-red-900/60 rounded-xl px-4 py-3 text-center max-w-[85%]">
                  <CameraOff className="w-5 h-5 text-red-300 mx-auto mb-1.5" />
                  <p className="text-[11px] text-red-200 font-medium">
                    {haltReason === 'max-frames' ? 'Maximum captures reached for this session.' :
                     haltReason === 'no-websocket' ? 'Voice connection required. Click the microphone first.' :
                     'Connection error. Please close and retry.'}
                  </p>
                </div>
              </div>
            )}

            {/* Pause overlay */}
            {isPaused && !haltReason && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
                <div className="bg-black/50 rounded-full p-3">
                  <Pause className="w-6 h-6 text-white/80" />
                </div>
              </div>
            )}

            {/* Viewfinder Reticle Overlay */}
            {!isPaused && captureState !== 'LOCKED' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                <div className={`w-32 h-32 border-2 transition-all duration-300 ${captureState === 'STEADY' ? 'border-green-400 scale-90' : 'border-white/30 border-dashed animate-[spin_10s_linear_infinite]'}`} style={{ borderRadius: '40px' }} />
                <span className={`mt-4 text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${captureState === 'STEADY' ? 'text-green-400' : 'text-white/50 shadow-black drop-shadow-md'}`}>
                  {captureState === 'STEADY' ? 'Hold Still' : 'Center Object'}
                </span>
              </div>
            )}
            
            {/* Scanning Overlay (LOCKED) */}
            {captureState === 'LOCKED' && !isPaused && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                <div className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-blue-500/0 via-blue-500/20 to-blue-500/0 animate-pulse top-1/3" />
              </div>
            )}

            {/* Control bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent h-14 flex items-end px-2 pb-2 z-10">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-1.5">
                  <Camera className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] text-white/60 font-medium">Zenith Vision</span>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Flip Camera */}
                  <button
                    onClick={handleFlipCamera}
                    className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all duration-200"
                    title="Flip Camera"
                  >
                    <FlipHorizontal2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Pause/Resume */}
                  <button
                    onClick={handleTogglePause}
                    className={`p-1.5 rounded-lg transition-all duration-200 ${isPaused ? 'bg-amber-500/30 text-amber-300 hover:bg-amber-500/50' : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'}`}
                    title={isPaused ? 'Resume' : 'Pause'}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>

                  {/* Close */}
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-red-500/80 hover:text-white transition-all duration-200"
                    title="End Session"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
