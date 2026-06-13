import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, MapPin, ShieldCheck, ChevronRight, AlertCircle, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

export default function FieldKitOnboarding() {
  const { requestCamera, requestLocation, completeFieldKitOnboarding } = useApp();
  const [step, setStep] = useState<'booting' | 'permissions' | 'finalizing'>('booting');
  const [bootProgress, setBootProgress] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booting animation
  React.useEffect(() => {
    if (step === 'booting') {
      const interval = setInterval(() => {
        setBootProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep('permissions'), 500);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleAllowPermissions = async () => {
    setIsRequesting(true);
    setError(null);
    console.log('[FIELD_KIT_SETUP_START] User initiated permission sequence.');
    try {
      // Trigger both permissions in parallel-ish sequence (awaiting each for UI clarity)
      // iOS requires user interaction for these prompts
      await requestCamera();
      await requestLocation();
      
      console.log('[FIELD_KIT_SETUP_COMPLETE] Permissions sequence resolved. Transitioning to finalizing...');
      setStep('finalizing');
      setTimeout(async () => {
        try {
          await completeFieldKitOnboarding();
        } catch (err) {
          console.warn("[FieldKit] Finalization failed in timeout:", err);
        }
      }, 1500);
    } catch (err) {
      console.error("[FIELDTRIP_ROUTE_GATE] Unexpected permission crash:", err);
      // Even on crash, we want to try completing so they aren't stuck
      try {
        await completeFieldKitOnboarding();
      } catch (finalErr) {
        console.warn("[FieldKit] Final fallback completion failed:", finalErr);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleMaybeLater = async () => {
    console.log('[FIELD_KIT_SETUP_COMPLETE] User skipped permissions via Maybe Later.');
    // Still count as ready for service, just without permissions
    try {
      await completeFieldKitOnboarding();
    } catch (err) {
      console.warn("[FieldKit] Skipped permissions completion failed:", err);
    }
  };

  if (step === 'booting') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-paper p-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-on-surface/40">Initializing_Systems</h2>
            <div className="h-1.5 bg-on-surface/5 border border-on-surface/10 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${bootProgress}%` }}
                className="h-full bg-brand-orange rounded-full"
              />
            </div>
          </div>
          <div className="space-y-4 font-mono text-[9px] font-bold text-on-surface/60 uppercase tracking-widest italic animate-pulse">
            <p>Readying Field Kit...</p>
            <p className={cn(bootProgress > 30 ? "opacity-100" : "opacity-0")}>Calibrating Lens...</p>
            <p className={cn(bootProgress > 60 ? "opacity-100" : "opacity-0")}>Mapping Coordinates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'finalizing') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-paper p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-8 text-center"
        >
          <div className="w-20 h-20 bg-brand-lime rounded-full mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(190,242,100,0.4)]">
            <ShieldCheck className="w-10 h-10 text-on-surface" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-4xl font-black uppercase tracking-tighter italic">Handshake Complete</h2>
            <p className="font-mono text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">Protocol: READY_FOR_DEPLOYMENT</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-paper p-4 sm:p-6 overflow-y-auto">
      {/* HUD Background Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md bg-white border-4 border-on-surface p-6 sm:p-8 space-y-6 shadow-[12px_12px_0px_black] relative"
      >
        {/* Top Accent */}
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-brand-orange z-10" />
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-brand-lime z-10" />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-orange animate-pulse" />
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange">Priority_Handshake</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none italic">
            Ready Your Field Kit
          </h1>
          <p className="font-serif italic text-sm text-on-surface/70 leading-relaxed">
            Fieldtrip needs two tools to run missions:
          </p>
        </div>

        <div className="space-y-4 py-2">
          {/* Camera Tool */}
          <div className="flex gap-4 p-3 bg-paper-dark border-2 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0 border border-brand-orange/20">
              <Camera className="w-5 h-5 text-brand-orange" />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-[11px] font-black uppercase tracking-wider leading-none">Camera</p>
              <p className="text-[11px] text-on-surface/60 leading-relaxed">Needed to capture proof photos for your missions.</p>
            </div>
          </div>

          {/* Location Tool */}
          <div className="flex gap-4 p-3 bg-paper-dark border-2 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 rounded-full bg-brand-lime/10 flex items-center justify-center flex-shrink-0 border border-brand-lime/20">
              <MapPin className="w-5 h-5 text-brand-lime" />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-[11px] font-black uppercase tracking-wider leading-none">Location</p>
              <p className="text-[11px] text-on-surface/60 leading-relaxed">Used to verify mission context and unlock nearby rewards.</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] font-mono text-on-surface/50 text-center uppercase tracking-widest pt-2">
          We only ask when the app needs them.
        </p>


        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleAllowPermissions}
            disabled={isRequesting}
            className={cn(
              "w-full py-4 bg-on-surface text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-[6px_6px_0px_#bef264] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
              isRequesting && "opacity-50 cursor-wait"
            )}
          >
            {isRequesting ? "Initializing..." : "Allow Camera + Location"}
            {!isRequesting && <ChevronRight className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleMaybeLater}
            disabled={isRequesting}
            className="w-full py-3 text-on-surface/50 hover:text-on-surface font-mono text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 justify-center">
            <AlertCircle className="w-3 h-3" />
            <span className="text-[10px] font-mono font-bold uppercase">{error}</span>
          </div>
        )}

        {/* Bottom Accent */}
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-brand-cyan z-10" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-brand-magenta z-10" />
      </motion.div>
    </div>
  );
}
