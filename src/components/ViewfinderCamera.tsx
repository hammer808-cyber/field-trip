import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera, RefreshCw, Zap, Target, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, Sparkles, Filter, SwitchCamera, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, safeToDate } from '../lib/utils';
import { getDisplayLabel } from '../utils/labelUtils';
import { useTheme } from '../context/ThemeContext';
import { ChallengeCard } from '../types/challenges';
import { getViewfinderRulesForChallenge } from '../services/viewfinderRulesService';
import { extractImageMetadata, FILTER_CSS, applyFilterToImageUrl } from '../lib/photoUtils';
import { VIEWFINDER_FILTERS, ViewfinderFilterId, ImageMetadata, CaptureTrustLevel, MetadataStatus, ReviewStatus } from '../types/proof';
import { auth } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';

interface ViewfinderCameraProps {
  challenge: ChallengeCard;
  onCapture: (data: {
    originalImageUrl: string;
    filteredImageUrl: string;
    metadata: ImageMetadata & { source: 'camera' | 'cameraRoll' };
    trustLevel: CaptureTrustLevel;
    filterId: ViewfinderFilterId;
    reviewStatus: ReviewStatus;
    message?: string;
  }) => void;
}

export interface ViewfinderCameraHandle {
  capture: () => void;
  toggleCamera: () => void;
}

interface SimulatedStreamResult {
  stream: MediaStream;
  stop: () => void;
}

type CameraZoomMode = 'native' | 'digital' | 'disabled';

interface ZoomState {
  supported: boolean;
  mode: CameraZoomMode;
  min: number;
  max: number;
  step: number;
  value: number;
}

const DEFAULT_ZOOM_STATE: ZoomState = {
  supported: false,
  mode: 'disabled',
  min: 1,
  max: 1,
  step: 0.1,
  value: 1,
};

function stopMediaStream(targetStream: MediaStream | null) {
  targetStream?.getTracks().forEach(track => track.stop());
}

function clampZoom(value: number, state: ZoomState) {
  const min = Number.isFinite(state.min) ? state.min : 1;
  const max = Number.isFinite(state.max) ? state.max : min;
  return Math.min(max, Math.max(min, value));
}

function getZoomCapabilities(track: MediaStreamTrack | undefined): ZoomState {
  if (!track || typeof track.getCapabilities !== 'function') return { ...DEFAULT_ZOOM_STATE };
  const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
    zoom?: { min?: number; max?: number; step?: number } | number[] | number;
  };
  const rawZoom = capabilities.zoom as any;
  if (!rawZoom) return { ...DEFAULT_ZOOM_STATE };

  const min = Number(rawZoom.min ?? (Array.isArray(rawZoom) ? rawZoom[0] : 1));
  const max = Number(rawZoom.max ?? (Array.isArray(rawZoom) ? rawZoom[rawZoom.length - 1] : rawZoom));
  const step = Number(rawZoom.step ?? 0.1);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return { ...DEFAULT_ZOOM_STATE };

  return {
    supported: true,
    mode: 'native',
    min,
    max,
    step: Number.isFinite(step) && step > 0 ? step : 0.1,
    value: min,
  };
}

function createSimulatedStream(challengeImage?: string): SimulatedStreamResult {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  const bgImg = new Image();
  bgImg.crossOrigin = "anonymous";
  // fallback image of a majestic mountain view or challenge image
  bgImg.src = challengeImage || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600";

  let animationId: number;
  let angle = 0;
  let scanY = 0;
  let frameCount = 0;

  const drawSimulatedFrame = () => {
    if (!ctx) return;

    // Draw background image if loaded, otherwise scenic gradient
    if (bgImg.complete && bgImg.naturalWidth > 0) {
      // Kinetic scanning pan-tilt effect
      const panX = Math.sin(angle * 0.3) * 15;
      const panY = Math.cos(angle * 0.2) * 10;
      ctx.drawImage(bgImg, panX - 10, panY - 10, canvas.width + 20, canvas.height + 20);
    } else {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 10,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.5
      );
      gradient.addColorStop(0, '#1c1c1e');
      gradient.addColorStop(1, '#0c0c0e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Grid overlays
    ctx.strokeStyle = 'rgba(255, 92, 0, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Diagnostics overlays
    const cx = canvas.width / 2 + Math.cos(angle * 0.5) * 40;
    const cy = canvas.height / 2 + Math.sin(angle * 0.7) * 20;

    ctx.strokeStyle = '#22d3ee'; // Target focal point
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ff5c00'; // Indicator point
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Laser scanbar
    ctx.strokeStyle = 'rgba(190, 242, 100, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(canvas.width, scanY);
    ctx.stroke();

    // Diagnoses texts
    ctx.fillStyle = '#ff5c00';
    ctx.font = '9px monospace';
    ctx.fillText('SIMULATION ACTIVE', 20, 30);
    ctx.fillStyle = '#bef264';
    ctx.fillText('STRIKE_TEAM: VIRTUAL_SENSOR_OK', 20, 45);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`COORDS: [${(34.0522 + Math.sin(angle) * 0.001).toFixed(6)}° N, ${(118.2437 + Math.cos(angle) * 0.001).toFixed(6)}° W]`, 20, 440);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`FEED_HZ: 30FPS // FRAME_${frameCount}`, 20, 455);

    angle += 0.02;
    scanY = (scanY + 2.5) % canvas.height;
    frameCount++;

    animationId = requestAnimationFrame(drawSimulatedFrame);
  };

  drawSimulatedFrame();

  const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
  return {
    stream,
    stop: () => {
      cancelAnimationFrame(animationId);
    }
  };
}

const ViewfinderCamera = forwardRef<ViewfinderCameraHandle, ViewfinderCameraProps>(({ challenge, onCapture }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const streamRef = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<'user' | 'environment'>('environment');
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [zoomState, setZoomState] = useState<ZoomState>({ ...DEFAULT_ZOOM_STATE });
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<ViewfinderFilterId>('original');
  const [showFilters, setShowFilters] = useState(false);
  const [showZoomControls, setShowZoomControls] = useState(false);
  
  const [readouts, setReadouts] = useState({
    iso: 100,
    shutter: '1/120',
    battery: 88,
    status: 'READY'
  });
  
  const { skin } = useTheme();
  const isBaja = skin.id === 'baja-bratz';
  const isHeat = skin.id === 'heatwave';

  useImperativeHandle(ref, () => ({
    capture: () => {
      handleCapture();
    },
    toggleCamera: () => {
      toggleCamera();
    }
  }));

  useEffect(() => {
    const interval = setInterval(() => {
      setReadouts(prev => ({
        ...prev,
        iso: Math.floor(Math.random() * 200) + 100,
        battery: Math.max(0, prev.battery - (Math.random() > 0.9 ? 1 : 0))
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function attachStream(nextStream: MediaStream, requestedFacingMode: 'user' | 'environment', mode: 'camera' | 'simulated' = 'camera') {
      if (!isMounted) {
        stopMediaStream(nextStream);
        return;
      }
      streamRef.current = nextStream;
      setStream(nextStream);
      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
      }
      const track = nextStream.getVideoTracks()[0];
      const nativeZoom = mode === 'camera' ? getZoomCapabilities(track) : { ...DEFAULT_ZOOM_STATE };
      const nextZoom = nativeZoom.supported
        ? nativeZoom
        : mode === 'camera'
          ? { supported: true, mode: 'digital' as const, min: 1, max: 3, step: 0.1, value: 1 }
          : { ...DEFAULT_ZOOM_STATE };
      setZoomState(nextZoom);
      setFacingMode(requestedFacingMode);
      facingModeRef.current = requestedFacingMode;
      setIsInitializing(false);
    }

    async function startCamera(requestedFacingMode: 'user' | 'environment') {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      setIsInitializing(true);
      setError(null);
      setZoomState({ ...DEFAULT_ZOOM_STATE });

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("CAMERA_UNSUPPORTED: This browser does not expose getUserMedia.");
        }
        const currentStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: requestedFacingMode } },
          audio: false 
        });
        await attachStream(currentStream, requestedFacingMode);
      } catch (err: any) {
        console.warn("Camera access warning (expected if headless/unpermitted):", err);
        if (isMounted) {
          // If the requested facingMode failed, try any available camera.
          try {
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            await attachStream(currentStream, requestedFacingMode);
            return;
          } catch (innerErr: any) {
            console.warn("Default camera fallback warning (expected if headless/unpermitted):", innerErr);
            
            // Physical webcam or camera device not found; fall back to virtual scenic simulator
            try {
              console.log("No physical camera detected. Initializing strike-team live simulator...");
              const sim = createSimulatedStream(challenge.image);
              if (sim.stream) {
                await attachStream(sim.stream, requestedFacingMode, 'simulated');
                (window as any).__vcamera_cleanup = sim.stop;
                return;
              } else {
                throw new Error("captureStream not supported");
              }
            } catch (simErr: any) {
              console.warn("Diagnostic simulator initialization warning:", simErr);
              const isNoDevice = err?.name === 'NotFoundError' || 
                               innerErr?.name === 'NotFoundError' || 
                               err?.message?.toLowerCase().includes('device not found') || 
                               innerErr?.message?.toLowerCase().includes('device not found');

              const isPermissionDenied = err?.name === 'NotAllowedError' || 
                                       innerErr?.name === 'NotAllowedError';

              if (isNoDevice) {
                setError("CAMERA_DEVICE_NOT_FOUND: No physical camera or webcam was detected. If you are using a desktop browser without a webcam, you can use the Photo Upload or Beta Simulator fallbacks below.");
              } else if (isPermissionDenied) {
                setError("CAMERA_PERMISSION_DENIED: Camera access was blocked. Please check your browser permissions or use the Photo Upload and Beta Simulator fallbacks below.");
              } else {
                setError(`CAMERA_ACCESS_ERROR: ${innerErr?.message || err?.message || 'Access failed.'}. Please use the fallback options below.`);
              }
            }
          }
          setIsInitializing(false);
        }
      }
    }

    startCamera(facingMode);

    return () => {
      isMounted = false;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      if (typeof (window as any).__vcamera_cleanup === 'function') {
        try {
          (window as any).__vcamera_cleanup();
          delete (window as any).__vcamera_cleanup;
        } catch (unmountErr) {
          console.warn("Failed to clean up virtual camera stream (non-fatal):", unmountErr);
        }
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    if (isInitializing || isProcessing || !streamRef.current) return;
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const applyZoom = async (requestedZoom: number) => {
    const currentZoomState = zoomState;
    const value = clampZoom(requestedZoom, currentZoomState);
    setZoomState(prev => ({ ...prev, value: clampZoom(requestedZoom, prev) }));
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || currentZoomState.mode !== 'native') return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value } as any] });
    } catch (zoomErr) {
      console.warn("Native camera zoom failed; falling back to matched digital crop:", zoomErr);
      setZoomState(prev => ({ ...prev, mode: 'digital', supported: true, min: 1, max: Math.max(prev.max, 3), value: clampZoom(value, { ...prev, min: 1, max: Math.max(prev.max, 3) }) }));
    }
  };

  const nudgeZoom = (direction: -1 | 1) => {
    applyZoom(zoomState.value + (zoomState.step || 0.1) * direction);
  };

  const getPinchDistance = (touches: React.TouchList | TouchList) => {
    if (touches.length < 2) return 0;
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const activeRules = getViewfinderRulesForChallenge(challenge);

  const evaluateWithServer = async (metadata: ImageMetadata & { source: 'camera' | 'cameraRoll' }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("NOT_AUTHENTICATED");
    
    const response = await authenticatedFetch('/api/proof/evaluate-metadata', {
      method: 'POST',
      body: JSON.stringify({
        metadata,
        challengeId: challenge.id,
        challengeWindow: {
          requireLiveCapture: activeRules.requireLiveCapture,
          requirePhotoTakenWithinChallengeWindow: activeRules.requirePhotoTakenWithinChallengeWindow,
          allowMissingExif: activeRules.allowMissingExif,
          reviewIfMetadataMissing: activeRules.reviewIfMetadataMissing,
          startAt: challenge.createdAt, // Using createdAt as start for this demo
          endAt: (() => {
            const startDate = safeToDate(challenge.createdAt);
            if (!startDate) return new Date().toISOString();
            return new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          })()
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'VALIDATION_FAILED');
    }

    return await response.json();
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isFlashing || isProcessing) return;

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 500);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      setIsProcessing(true);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const digitalZoom = zoomState.mode === 'digital' ? Math.max(1, zoomState.value) : 1;
      if (digitalZoom > 1) {
        const sourceWidth = video.videoWidth / digitalZoom;
        const sourceHeight = video.videoHeight / digitalZoom;
        const sourceX = (video.videoWidth - sourceWidth) / 2;
        const sourceY = (video.videoHeight - sourceHeight) / 2;
        context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      } else {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const originalImageUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      try {
        let latitude: number | null = null;
        let longitude: number | null = null;
        if (navigator.geolocation) {
          try {
            const coords = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
                },
                () => resolve(null),
                { timeout: 1500, enableHighAccuracy: false }
              );
            });
            if (coords) {
              latitude = coords.latitude;
              longitude = coords.longitude;
            }
          } catch (_) {}
        }

        const metadata: ImageMetadata & { source: 'camera' } = {
          metadataStatus: 'verified',
          source: 'camera',
          photoTakenAt: new Date().toISOString(),
          latitude,
          longitude
        } as any;

        const filteredImageUrl = await applyFilterToImageUrl(originalImageUrl, selectedFilter);
        
        let evalResult = {
          captureTrustLevel: 'live' as const,
          reviewStatus: 'approved' as const,
          message: 'Local fallback evaluation.'
        };
        try {
          evalResult = await evaluateWithServer(metadata);
        } catch (serverErr) {
          console.warn("Server evaluation failed, using local fallback:", serverErr);
        }

        onCapture({
          originalImageUrl,
          filteredImageUrl,
          metadata,
          trustLevel: evalResult.captureTrustLevel || 'live',
          filterId: selectedFilter,
          reviewStatus: evalResult.reviewStatus || 'approved',
          message: evalResult.message || 'Approved locally.'
        });
      } catch (err: any) {
        setError(err.message || "Failed to process capture.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isProcessing) return;

    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setIsProcessing(true);
    try {
      const metadata = await extractImageMetadata(file);
      const fullMetadata = { ...metadata, source: 'cameraRoll' as const };
      
      const originalImageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      let evalResult = {
        captureTrustLevel: 'verifiedCameraRoll' as const,
        reviewStatus: 'approved' as const,
        message: 'Local fallback evaluation for upload.'
      };
      try {
        evalResult = await evaluateWithServer(fullMetadata);
      } catch (serverErr) {
        console.warn("Server evaluation failed, using local upload fallback:", serverErr);
      }

      const filteredImageUrl = await applyFilterToImageUrl(originalImageUrl, selectedFilter);

      onCapture({
        originalImageUrl,
        filteredImageUrl,
        metadata: fullMetadata,
        trustLevel: evalResult.captureTrustLevel || 'verifiedCameraRoll',
        filterId: selectedFilter,
        reviewStatus: evalResult.reviewStatus || 'approved',
        message: evalResult.message || 'Approved upload locally.'
      });
    } catch (err: any) {
      setError(err.message || "Failed to process upload.");
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsProcessing(false);
    }
  };

  const openFileUpload = () => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    fileInputRef.current?.click();
  };

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/95 p-8 text-center z-50 overflow-y-auto">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <div className="space-y-4 max-w-xs w-full my-auto">
          <AlertCircle className="w-12 h-12 text-brand-orange mx-auto" />
          <p className="font-mono text-[11px] text-brand-orange uppercase tracking-widest leading-relaxed break-all">{error}</p>
          
          <button 
            onClick={openFileUpload}
            className="w-full py-3 bg-brand-lime text-on-surface font-mono text-[10px] uppercase font-black tracking-widest hover:bg-brand-lime/90 transition-colors shadow-[4px_4px_0px_black] border border-on-surface"
          >
            Upload Photo Evidence
          </button>

          <button 
            onClick={() => onCapture({
              originalImageUrl: challenge.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
              filteredImageUrl: challenge.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
              metadata: { source: 'camera', metadataStatus: 'verified', photoTakenAt: new Date().toISOString() },
              trustLevel: 'live',
              filterId: 'original',
              reviewStatus: 'approved',
              message: 'Beta simulator fallback.'
            })}
            className="w-full py-3 bg-brand-orange text-white font-mono text-[10px] uppercase font-black tracking-widest hover:bg-brand-orange/90 transition-colors shadow-[4px_4px_0px_black] border border-on-surface"
          >
            Simulate Beta Capture
          </button>

          <button 
            onClick={() => setError(null)}
            className="w-full py-3 bg-white/10 border border-white/20 font-mono text-[10px] text-white uppercase tracking-widest hover:bg-white/20 transition-colors"
          >
            DISMISS & RETRY CAMERA
          </button>
        </div>
      </div>
    );
  }

  const videoTransform = [
    facingMode === 'user' ? 'scaleX(-1)' : '',
    zoomState.mode === 'digital' ? `scale(${zoomState.value})` : ''
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
      <div className="relative w-full h-full">
        {/* Main Camera View */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            isInitializing ? "opacity-0" : "opacity-100",
            !isBaja && !isHeat && "brightness-110 contrast-125",
            isBaja && "sepia hue-rotate-[320deg] saturate-150",
            isHeat && "invert hue-rotate-180 saturate-200 contrast-200 brightness-150"
          )}
          style={{
            filter: FILTER_CSS[selectedFilter],
            transform: videoTransform,
            transformOrigin: 'center center'
          }}
          onTouchStart={(event) => {
            const distance = getPinchDistance(event.touches);
            if (distance > 0) pinchStartRef.current = { distance, zoom: zoomState.value };
          }}
          onTouchMove={(event) => {
            if (!pinchStartRef.current || event.touches.length < 2 || !zoomState.supported) return;
            event.preventDefault();
            const distance = getPinchDistance(event.touches);
            const scale = distance / pinchStartRef.current.distance;
            applyZoom(pinchStartRef.current.zoom * scale);
          }}
          onTouchEnd={() => {
            pinchStartRef.current = null;
          }}
        />

        {/* Decorative Overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute inset-x-0 h-[2px] bg-brand-orange/30 shadow-[0_0_15px_rgba(255,107,0,0.5)] animate-scan z-10" style={{ top: '20%' }} />

        {/* HUD Elements */}
        <div className="absolute top-6 left-6 font-mono text-[9px] text-white uppercase tracking-widest space-y-2 z-40">
          <div className="flex items-center gap-2 bg-on-surface/80 px-2 py-0.5 border border-white/20">
            <span className={cn("w-2 h-2 rounded-full", isProcessing ? "bg-red-500 animate-pulse" : "bg-brand-lime")} />
            {isProcessing ? getDisplayLabel('PROCESSING_SIGNAL') : `LINK_STABLE // ${readouts.status}`}
          </div>
          <div className="flex gap-4">
             <div className="bg-brand-orange text-on-surface px-1.5 font-black">ISO_{readouts.iso}</div>
             <div className="opacity-60">SHTR_{readouts.shutter}</div>
          </div>
          <div className="max-w-[200px] truncate bg-white/10 px-2">MISSION: {challenge.title.toUpperCase()}</div>
        </div>

        <div className="absolute top-16 right-4 font-mono text-[8px] text-white/60 uppercase tracking-widest text-right z-40">
          <div className="flex items-center justify-end gap-2">
             <div className="w-12 h-2 bg-white/20 border border-white/10 p-0.5">
                <div className="h-full bg-brand-lime" style={{ width: `${readouts.battery}%` }} />
             </div>
             <span>PWR_{readouts.battery}%</span>
          </div>
          <div className="mt-1 text-brand-orange">FLTR_{VIEWFINDER_FILTERS.find(f => f.id === selectedFilter)?.name.toUpperCase()}</div>
        </div>

        {/* Camera Flip + Compact Lens Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowZoomControls(prev => !prev)}
            disabled={!zoomState.supported || isProcessing}
            className={cn(
              "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-3 text-white shadow-lg backdrop-blur-md transition-all",
              zoomState.supported && !isProcessing
                ? "hover:bg-black/75 hover:border-brand-lime"
                : "opacity-45 grayscale"
            )}
            aria-pressed={showZoomControls}
            aria-label="Toggle camera zoom controls"
          >
            <ZoomIn className="h-4 w-4" />
            <span className="font-mono text-[8px] font-black uppercase tracking-widest">
              {zoomState.supported ? `${zoomState.value.toFixed(1)}x` : '1x'}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleCamera}
            disabled={isInitializing || isProcessing || !stream}
            className={cn(
              "flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-3 text-white shadow-lg backdrop-blur-md transition-all",
              !isInitializing && !isProcessing && stream
                ? "hover:bg-black/80 hover:border-brand-lime"
                : "opacity-45 grayscale"
            )}
            aria-label={`Switch to ${facingMode === 'environment' ? 'front' : 'rear'} camera`}
          >
            <SwitchCamera className="h-4 w-4" />
            <span className="hidden font-mono text-[8px] font-black uppercase tracking-widest min-[390px]:inline">
              {facingMode === 'environment' ? 'Rear' : 'Front'}
            </span>
          </button>
        </div>

        <AnimatePresence>
          {showZoomControls && (
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="absolute bottom-[7.25rem] left-4 right-4 z-50 rounded-2xl border border-white/15 bg-black/70 p-3 text-white shadow-lg backdrop-blur-md sm:left-auto sm:right-5 sm:w-[220px]"
            >
            <div className="mb-2 flex items-center justify-between font-mono text-[8px] uppercase tracking-widest">
              <span className="text-white/60">Zoom</span>
              <span className={cn(
                "font-black",
                zoomState.mode === 'native' ? "text-brand-lime" : zoomState.mode === 'digital' ? "text-brand-orange" : "text-white/40"
              )}>
                {zoomState.mode === 'native' ? 'Optical' : zoomState.mode === 'digital' ? 'Crop' : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => nudgeZoom(-1)}
                disabled={!zoomState.supported || isProcessing}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 disabled:opacity-30"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={zoomState.min}
                max={zoomState.max}
                step={zoomState.step}
                value={zoomState.value}
                disabled={!zoomState.supported || isProcessing}
                onChange={(event) => applyZoom(Number(event.target.value))}
                className="min-w-0 flex-1 accent-brand-lime disabled:opacity-30"
                aria-label="Camera zoom"
              />
              <button
                type="button"
                onClick={() => nudgeZoom(1)}
                disabled={!zoomState.supported || isProcessing}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 disabled:opacity-30"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-center font-mono text-[10px] font-black tracking-widest text-brand-lime">
              {zoomState.supported ? `${zoomState.value.toFixed(1)}x` : '1.0x'}
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Brackets */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
          <div className="relative w-full h-full">
            {/* Inner corner brackets simplified to maintain high clarity of viewfinder */}
            <div className="absolute inset-0 flex items-center justify-center opacity-25">
               <div className="w-px h-8 bg-brand-orange/60" />
               <div className="h-px w-8 bg-brand-orange/60" />
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 inset-x-0 z-50 flex items-end justify-between gap-4 bg-gradient-to-t from-black via-black/85 to-transparent px-5 pb-5 pt-10 sm:px-8 sm:pb-6">
          {/* Upload Button - Secondary */}
          <div className="relative">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={isProcessing || !activeRules.allowCameraRollUpload}
            />
            <button 
              onClick={openFileUpload}
              disabled={isProcessing || !activeRules.allowCameraRollUpload}
              className={cn(
                "group flex flex-col items-center gap-1.5 transition-all text-white/75 hover:text-white",
                (isProcessing || !activeRules.allowCameraRollUpload) && "opacity-30 grayscale"
              )}
            >
              <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all group-hover:bg-black/70 group-hover:border-white/40 shadow-md">
                <ImageIcon className="w-5 h-5 text-current" />
              </div>
              <span className="font-mono text-[8px] uppercase tracking-wider font-semibold">Upload</span>
            </button>
            {!activeRules.allowCameraRollUpload && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand-orange text-white px-2 py-0.5 border-2 border-on-surface shadow-[2px_2px_0px_black] whitespace-nowrap">
                <p className="font-mono text-[7px] font-black uppercase">Live_Only</p>
              </div>
            )}
          </div>

          {/* Premium Sticker-style Capture Button - Playful, On-Brand Field Stamp */}
          <div className="relative">
            <button 
              onClick={handleCapture}
              disabled={isProcessing}
              className="group relative select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
            >
              {/* Sticker drop-shadow depth layer */}
              <div className="absolute inset-0 bg-black/30 rounded-2xl blur-[3px] translate-y-1 transition-all duration-300 group-hover:translate-x-1 group-hover:translate-y-2 group-hover:blur-[4px] group-active:translate-x-0.5 group-active:translate-y-0.5 group-active:blur-[1px]" />
              
              {/* Sticker Vinyl contour body */}
              <div className="relative bg-white p-1 border-3 border-on-surface rounded-2xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] flex flex-col items-center justify-center rotate-[-3deg] group-hover:rotate-[1deg] group-hover:scale-105 group-active:scale-95 transition-all duration-300">
                
                {/* Sticker body */}
                <div className={cn(
                  "w-22 h-22 rounded-xl flex flex-col items-center justify-center text-white relative overflow-hidden shadow-inner",
                  isBaja ? "bg-baja-pink" : isHeat ? "bg-heat-pink" : "bg-brand-orange"
                )}>
                  
                  {/* High gloss peel highlight reflection */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                  
                  {/* Subtle retro stamp grid overlay */}
                  <div className="absolute inset-0 opacity-[0.08] bg-[repeating-linear-gradient(45deg,#000,#000_3px,transparent_3px,transparent_6px)] pointer-events-none" />
                  
                  {isProcessing ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      {/* Interactive Star Accent */}
                      <div className="absolute top-1 right-1">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse fill-yellow-300" />
                      </div>
                      
                      {/* Certified live stamp badge */}
                      <span className="text-[6px] font-mono tracking-widest font-black uppercase opacity-90 text-[#FFECE3] mb-1">STRIKE RECON</span>
                      
                      {/* Tactile Camera Ring */}
                      <div className="w-10 h-10 rounded-full bg-white text-on-surface flex items-center justify-center shadow-md border-[2.5px] border-on-surface transition-transform duration-300 group-hover:scale-110">
                        <Camera className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      
                      {/* Seal type text */}
                      <span className="text-[10px] font-display font-black tracking-widest uppercase mt-1 italic text-white drop-shadow-[0_1.5px_1px_rgba(0,0,0,0.5)]">SNAP!</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Filter/Lens Toggle - Secondary */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="group flex flex-col items-center gap-1.5 transition-all text-white/75 hover:text-white"
          >
            <div className={cn(
              "w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-md backdrop-blur-md",
              showFilters 
                ? "bg-brand-lime border-on-surface text-on-surface shadow-brand-lime/20" 
                : "bg-black/45 border-white/20 text-white group-hover:bg-black/70 group-hover:border-white/40"
            )}>
              <Filter className="w-5 h-5 text-current" />
            </div>
            <span className="font-mono text-[8px] uppercase tracking-wider font-semibold">Filters</span>
          </button>
        </div>

        {/* Filter Selection Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-32 inset-x-8 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-40"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] text-brand-orange uppercase tracking-tighter">Viewfinder Grader // V.0.4</span>
                <Sparkles className="w-3 h-3 text-brand-orange" />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {VIEWFINDER_FILTERS.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setSelectedFilter(f.id)}
                    className="flex-shrink-0 flex flex-col items-center gap-2"
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-lg border-2 overflow-hidden transition-all",
                      selectedFilter === f.id ? "border-brand-orange scale-105" : "border-white/10 opacity-60"
                    )}>
                      {/* Mini preview with filter applied to a static sample or just a solid color/gradient */}
                      <div 
                        className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" 
                        style={{ filter: FILTER_CSS[f.id] }}
                      />
                    </div>
                    <span className={cn(
                      "font-mono text-[7px] uppercase tracking-tighter w-16 text-center leading-tight",
                      selectedFilter === f.id ? "text-white" : "text-white/40"
                    )}>
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flash Effect */}
        <AnimatePresence>
          {isFlashing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white z-50"
            />
          )}
        </AnimatePresence>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
});

ViewfinderCamera.displayName = 'ViewfinderCamera';
export default ViewfinderCamera;
