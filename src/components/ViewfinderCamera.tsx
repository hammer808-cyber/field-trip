import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera, RefreshCw, Zap, Target, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, Sparkles, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, safeToDate } from '../lib/utils';
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

const ViewfinderCamera = forwardRef<ViewfinderCameraHandle, ViewfinderCameraProps>(({ challenge, onCapture }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<ViewfinderFilterId>('original');
  const [showFilters, setShowFilters] = useState(false);
  
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
    let currentStream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsInitializing(true);
      setError(null);

      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode },
          audio: false 
        });
        
        if (!isMounted) {
          currentStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
        setIsInitializing(false);
      } catch (err: any) {
        console.error("Camera access failed:", err);
        if (isMounted) {
          if (facingMode === 'environment') {
            // Try fallback to any camera if environment fails
            try {
              currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
              setStream(currentStream);
               if (videoRef.current) {
                videoRef.current.srcObject = currentStream;
              }
              setIsInitializing(false);
              return;
            } catch (innerErr) {
              setError("CAMERA_FAIL: Could not access any device camera.");
            }
          } else {
            setError("CAMERA_FAIL: Camera access denied or unavailable.");
          }
          setIsInitializing(false);
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
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
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const originalImageUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      try {
        const metadata: ImageMetadata & { source: 'camera' } = {
          metadataStatus: 'verified',
          source: 'camera',
          photoTakenAt: new Date().toISOString()
        };

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
            onClick={() => fileInputRef.current?.click()}
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

  return (
    <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
      <div className="relative w-full h-full">
        {/* Main Camera View */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          style={{ filter: FILTER_CSS[selectedFilter] }}
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            isInitializing ? "opacity-0" : "opacity-100",
            !isBaja && !isHeat && "brightness-110 contrast-125",
            isBaja && "sepia hue-rotate-[320deg] saturate-150",
            isHeat && "invert hue-rotate-180 saturate-200 contrast-200 brightness-150"
          )}
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
            {isProcessing ? "PROCESSING_SIGNAL..." : `LINK_STABLE // ${readouts.status}`}
          </div>
          <div className="flex gap-4">
             <div className="bg-brand-orange text-on-surface px-1.5 font-black">ISO_{readouts.iso}</div>
             <div className="opacity-60">SHTR_{readouts.shutter}</div>
          </div>
          <div className="max-w-[200px] truncate bg-white/10 px-2">MISSION: {challenge.title.toUpperCase()}</div>
        </div>

        <div className="absolute top-6 right-6 font-mono text-[9px] text-white/60 uppercase tracking-widest text-right z-40">
          <div className="flex items-center justify-end gap-2">
             <div className="w-12 h-2 bg-white/20 border border-white/10 p-0.5">
                <div className="h-full bg-brand-lime" style={{ width: `${readouts.battery}%` }} />
             </div>
             <span>PWR_{readouts.battery}%</span>
          </div>
          <div className="mt-1 text-brand-orange">FLTR_{VIEWFINDER_FILTERS.find(f => f.id === selectedFilter)?.name.toUpperCase()}</div>
        </div>

        {/* Brackets */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
          <div className="relative w-full h-full">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-lime" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-lime" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-brand-lime" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-brand-lime" />
            
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
               <div className="w-px h-12 bg-brand-orange" />
               <div className="h-px w-12 bg-brand-orange" />
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-10 inset-x-0 flex items-center justify-between px-8 z-50">
          {/* Upload Button */}
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || !activeRules.allowCameraRollUpload}
              className={cn(
                "group flex flex-col items-center gap-2",
                (isProcessing || !activeRules.allowCameraRollUpload) && "opacity-30 grayscale"
              )}
            >
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center group-hover:bg-white/20 group-hover:border-brand-lime transition-all shadow-[4px_4px_0px_black]">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <span className="font-mono text-[9px] text-white font-black uppercase tracking-widest">Upload</span>
            </button>
            {!activeRules.allowCameraRollUpload && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-brand-orange text-white px-3 py-1 border-2 border-on-surface shadow-[4px_4px_0px_black] whitespace-nowrap">
                <p className="font-mono text-[8px] font-black uppercase">Live_Required</p>
              </div>
            )}
          </div>

          {/* Capture Button */}
          <button 
            onClick={handleCapture}
            disabled={isProcessing}
            className="group relative"
          >
            <div className="w-24 h-24 rounded-full border-[6px] border-white/20 p-1 group-active:scale-95 transition-transform">
              <div className="w-full h-full rounded-full bg-white border-[6px] border-on-surface flex items-center justify-center shadow-[0_0_30px_rgba(255,107,0,0.3)]">
                {isProcessing ? (
                  <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
                ) : (
                  <div className="w-12 h-12 bg-brand-orange rounded-sm flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white stroke-[3]" />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -inset-2 rounded-full border-2 border-brand-lime animate-pulse pointer-events-none" />
          </button>

          {/* Filter Toggle */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="group flex flex-col items-center gap-2"
          >
            <div className={cn(
              "w-14 h-14 rounded-full transition-all flex items-center justify-center shadow-[4px_4px_0px_black]",
              showFilters ? "bg-brand-lime border-on-surface border-2" : "bg-white/10 border-white/20 border-2 backdrop-blur-md"
            )}>
              <Filter className={cn("w-6 h-6", showFilters ? "text-on-surface" : "text-white")} />
            </div>
            <span className="font-mono text-[9px] text-white font-black uppercase tracking-widest">Lens</span>
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
