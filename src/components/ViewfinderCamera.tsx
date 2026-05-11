import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera, RefreshCw, Zap, Target, Focus, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface ViewfinderCameraProps {
  onCapture: (img: string) => void;
}

export interface ViewfinderCameraHandle {
  capture: () => void;
}

/**
 * HEAVY COMPONENT: Handles camera stream and processing.
 * Using native browser APIs for evidence securement.
 */
const ViewfinderCamera = forwardRef<ViewfinderCameraHandle, ViewfinderCameraProps>(({ onCapture }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
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

  // Simulate dynamic readouts
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

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || isFlashing) return;

    // Trigger flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 500);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      // Delay callback slightly for the flash effect to feel "physical"
      setTimeout(() => onCapture(dataUrl), 150);
    }
  };

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-8 text-center">
        <div className="space-y-4">
          <Zap className="w-12 h-12 text-brand-orange mx-auto opacity-50" />
          <p className="font-mono text-sm text-brand-orange uppercase tracking-widest">{error}</p>
          <p className="text-white/40 text-[10px] uppercase font-mono">Check system permissions and attempt re-entry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className={cn(
          "w-full h-full object-cover transition-all duration-700",
          isInitializing ? "opacity-0" : "opacity-100",
          !isBaja && !isHeat && "grayscale brightness-110 contrast-125",
          isBaja && "sepia hue-rotate-[320deg] saturate-150",
          isHeat && "invert hue-rotate-180 saturate-200 contrast-200 brightness-150"
        )}
      />

      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ 
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Adaptive Scanline */}
      <div className="absolute inset-x-0 h-[2px] bg-brand-orange/30 shadow-[0_0_15px_rgba(255,107,0,0.5)] animate-scan z-10" style={{ top: '20%' }} />

      {/* Enhanced Targeting UI */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Central Brackets */}
        <div className="relative w-48 h-48 border border-white/10">
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-brand-orange shadow-[0_0_8px_rgba(194,65,12,0.5)]" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-brand-orange shadow-[0_0_8px_rgba(194,65,12,0.5)]" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-brand-orange shadow-[0_0_8px_rgba(194,65,12,0.5)]" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-brand-orange shadow-[0_0_8px_rgba(194,65,12,0.5)]" />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <Target className="w-4 h-4 text-brand-orange/20" />
          </div>
        </div>
      </div>

      {/* Real-time Readouts */}
      <div className="absolute top-6 left-6 font-mono text-[8px] text-white/40 uppercase tracking-widest space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-orange animate-pulse rounded-full" />
          REC // {readouts.status}
        </div>
        <div>ISO_{readouts.iso} // SHTR_{readouts.shutter}</div>
        <div>LVL: {Math.floor(Math.random() * 10) + 90}% CONFIDENCE</div>
      </div>

      <div className="absolute top-6 right-6 font-mono text-[8px] text-white/40 uppercase tracking-widest text-right">
        <div>BATT: {readouts.battery}%</div>
        <div>STREAME_ID: FIELD_X_992</div>
      </div>

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

      {/* Viewfinder info readout */}
      <div className="absolute bottom-6 left-6 font-mono text-[6px] text-white/20 uppercase tracking-[0.2em]">
        Lens_auth: verified // strm_buf: 100% // encryption: true
      </div>
    </div>
  );
});

ViewfinderCamera.displayName = 'ViewfinderCamera';
export default ViewfinderCamera;
