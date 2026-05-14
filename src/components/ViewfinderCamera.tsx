import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera, RefreshCw, Zap, Target, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, Sparkles, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { ChallengeCard } from '../types/challenges';
import { getViewfinderRulesForChallenge } from '../services/viewfinderRulesService';
import { extractImageMetadata, FILTER_CSS, applyFilterToImageUrl } from '../lib/photoUtils';
import { VIEWFINDER_FILTERS, ViewfinderFilterId, ImageMetadata, CaptureTrustLevel, MetadataStatus, ReviewStatus } from '../types/proof';
import { auth } from '../lib/firebase';

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
}

const ViewfinderCamera = forwardRef<ViewfinderCameraHandle, ViewfinderCameraProps>(({ challenge, onCapture }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
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
  const isBaja = skin === 'baja-bratz';
  const isHeat = skin === 'heatwave';

  useImperativeHandle(ref, () => ({
    capture: () => {
      handleCapture();
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
    async function startCamera() {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: false 
        });
        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
        setIsInitializing(false);
      } catch (err) {
        console.error("Camera access failed:", err);
        setError("AUTHENTICATION_FAILED: Camera access denied or unavailable.");
        setIsInitializing(false);
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const activeRules = getViewfinderRulesForChallenge(challenge);

  const evaluateWithServer = async (metadata: ImageMetadata & { source: 'camera' | 'cameraRoll' }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("NOT_AUTHENTICATED");
    
    const idToken = await user.getIdToken();
    const response = await fetch('/api/proof/evaluate-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        metadata,
        challengeId: challenge.id,
        challengeWindow: {
          requireLiveCapture: activeRules.requireLiveCapture,
          requirePhotoTakenWithinChallengeWindow: activeRules.requirePhotoTakenWithinChallengeWindow,
          allowMissingExif: activeRules.allowMissingExif,
          reviewIfMetadataMissing: activeRules.reviewIfMetadataMissing,
          startAt: challenge.createdAt, // Using createdAt as start for this demo
          endAt: new Date(new Date(challenge.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week window
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
        const evalResult = await evaluateWithServer(metadata);

        onCapture({
          originalImageUrl,
          filteredImageUrl,
          metadata,
          trustLevel: evalResult.captureTrustLevel,
          filterId: selectedFilter,
          reviewStatus: evalResult.reviewStatus,
          message: evalResult.message
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

      const evalResult = await evaluateWithServer(fullMetadata);
      const filteredImageUrl = await applyFilterToImageUrl(originalImageUrl, selectedFilter);

      onCapture({
        originalImageUrl,
        filteredImageUrl,
        metadata: fullMetadata,
        trustLevel: evalResult.captureTrustLevel,
        filterId: selectedFilter,
        reviewStatus: evalResult.reviewStatus,
        message: evalResult.message
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
      <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-8 text-center z-50">
        <div className="space-y-4 max-w-xs">
          <AlertCircle className="w-12 h-12 text-brand-orange mx-auto" />
          <p className="font-mono text-sm text-brand-orange uppercase tracking-widest">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="w-full py-3 bg-white/10 border border-white/20 font-mono text-[10px] text-white uppercase tracking-widest hover:bg-white/20 transition-colors"
          >
            DISMISS & RETRY
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
        <div className="absolute top-6 left-6 font-mono text-[8px] text-white/40 uppercase tracking-widest space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", isProcessing ? "bg-red-500 animate-pulse" : "bg-brand-orange")} />
            {isProcessing ? "PROCESSING..." : `REC // ${readouts.status}`}
          </div>
          <div>ISO_{readouts.iso} // SHTR_{readouts.shutter}</div>
          <div>MISSION: {challenge.title.toUpperCase()}</div>
        </div>

        <div className="absolute top-6 right-6 font-mono text-[8px] text-white/40 uppercase tracking-widest text-right">
          <div>BATT: {readouts.battery}%</div>
          <div>FLTR: {VIEWFINDER_FILTERS.find(f => f.id === selectedFilter)?.name.toUpperCase()}</div>
        </div>

        {/* Brackets */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-64 h-64 border border-white/5">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-brand-orange" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-brand-orange" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-brand-orange" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-brand-orange" />
            
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <Target className="w-6 h-6 text-brand-orange" />
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-10 inset-x-0 flex items-center justify-between px-8">
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
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
                <ImageIcon className="w-5 h-5 text-white/70" />
              </div>
              <span className="font-mono text-[8px] text-white/40 uppercase tracking-widest">Upload</span>
            </button>
            {!activeRules.allowCameraRollUpload && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 border border-red-500/50 whitespace-nowrap">
                <p className="font-mono text-[7px] text-red-500 uppercase">Live Required</p>
              </div>
            )}
          </div>

          {/* Capture Button */}
          <button 
            onClick={handleCapture}
            disabled={isProcessing}
            className="group relative"
          >
            <div className="w-20 h-20 rounded-full border-4 border-white/20 p-1 group-active:scale-95 transition-transform">
              <div className="w-full h-full rounded-full bg-white border-4 border-brand-orange flex items-center justify-center">
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-brand-orange" />
                )}
              </div>
            </div>
            <div className="absolute -inset-2 rounded-full border border-brand-orange animate-pulse pointer-events-none" />
          </button>

          {/* Filter Toggle */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="group flex flex-col items-center gap-2"
          >
            <div className={cn(
              "w-12 h-12 rounded-full transition-all flex items-center justify-center",
              showFilters ? "bg-brand-orange border-brand-orange" : "bg-white/10 border-white/20 border backdrop-blur-md"
            )}>
              <Filter className={cn("w-5 h-5", showFilters ? "text-white" : "text-white/70")} />
            </div>
            <span className="font-mono text-[8px] text-white/40 uppercase tracking-widest">Filter</span>
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
