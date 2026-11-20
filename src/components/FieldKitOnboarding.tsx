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
  // P0-6: whether the permission request actually landed. 'granted' keeps
  // the happy-path "set" copy; 'not-set' (denied, failed, timed out, or
  // skipped) shows honest copy and offers a retry instead of claiming setup.
  const [setupOutcome, setSetupOutcome] = useState<'granted' | 'not-set' | null>(null);

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
      const cameraOk = await requestCamera();
      const locationOk = await requestLocation();

      if (cameraOk && locationOk) {
        console.log('[FIELD_KIT_SETUP_COMPLETE] Permissions sequence resolved. Transitioning to finalizing...');
        setSetupOutcome('granted');
        setStep('finalizing');
        setTimeout(async () => {
          try {
            await completeFieldKitOnboarding();
          } catch (err) {
            console.warn("[FieldKit] Finalization failed in timeout:", err);
          }
        }, 1500);
      } else {
        // P0-6: one or both permissions were denied, failed, or timed out.
        // Do not claim setup is done and do not auto-complete — show the
        // honest copy and let the player retry or continue without.
        console.log('[FIELD_KIT_SETUP_INCOMPLETE] Permissions not fully granted. Showing honest finalizing screen.');
        setSetupOutcome('not-set');
        setStep('finalizing');
      }
    } catch (err) {
      console.error("[FIELDTRIP_ROUTE_GATE] Unexpected permission crash:", err);
      // P0-6: even on crash, do not silently complete as if setup succeeded.
      // Show the honest copy so the player can retry or continue knowingly.
      setSetupOutcome('not-set');
      setStep('finalizing');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleMaybeLater = () => {
    console.log('[FIELD_KIT_SETUP_COMPLETE] User skipped permissions via Maybe Later.');
    // P0-6: skipping is not setup. Show the honest finalizing screen
    // instead of completing silently — the player continues from there.
    setSetupOutcome('not-set');
    setStep('finalizing');
  };

  // P0-6 re-request path: back to the permissions step so the player can tap
  // Allow again (a fresh user gesture, which iOS requires for prompts).
  const handleTryAgain = () => {
    setSetupOutcome(null);
    setStep('permissions');
  };

  // P0-6: the player knowingly continues without camera/location. The
  // profile records the real permission state (cameraPermissionGranted /
  // locationPermissionGranted come from the request results), not a claim.
  const handleContinueWithoutPermissions = async () => {
    try {
      await completeFieldKitOnboarding();
    } catch (err) {
      console.warn("[FieldKit] Continue-without-permissions completion failed:", err);
    }
  };

  if (step === 'booting') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-paper p-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="font-mono text-xs font-black uppercase tracking-[0.4em] text-on-surface/60">Getting ready</h2>
            <div className="h-1.5 bg-on-surface/5 border border-on-surface/10 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${bootProgress}%` }}
                className="h-full bg-brand-orange rounded-full"
              />
            </div>
          </div>
          <div className="space-y-4 font-mono text-xs font-bold text-on-surface/60 uppercase tracking-widest italic animate-pulse">
            <p>Readying Field Kit...</p>
            <p className={cn(bootProgress > 30 ? "opacity-100" : "opacity-0")}>Calibrating Lens...</p>
            <p className={cn(bootProgress > 60 ? "opacity-100" : "opacity-0")}>Mapping Coordinates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'finalizing') {
    // P0-6: the copy must match what actually happened. Only the granted
    // path claims setup; the skip/failure path says so plainly and offers
    // a retry or a knowing continue.
    const granted = setupOutcome === 'granted';
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-paper p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-8 text-center"
        >
          <div className={cn(
            "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
            granted
              ? "bg-brand-lime shadow-[0_0_40px_rgba(190,242,100,0.4)]"
              : "bg-brand-orange shadow-[0_0_40px_rgba(255,92,0,0.4)]"
          )}>
            {granted
              ? <ShieldCheck className="w-10 h-10 text-on-surface" />
              : <AlertCircle className="w-10 h-10 text-white" />}
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-4xl font-black uppercase tracking-tighter italic">{granted ? "You're ready" : 'Not quite ready'}</h2>
            <p className="font-mono text-xs font-bold text-on-surface/60 uppercase tracking-widest">{granted ? 'Camera + location set' : 'Camera and location not set — you can turn them on later from Settings'}</p>
          </div>
          {!granted && (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleTryAgain}
                className="w-full py-4 bg-on-surface text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-[6px_6px_0px_#bef264] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              >
                Try again
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleContinueWithoutPermissions}
                className="w-full py-3 text-on-surface/60 hover:text-on-surface font-mono text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Continue without permissions
              </button>
            </div>
          )}
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
            <span className="font-mono text-xs font-black uppercase tracking-widest text-on-surface">Camera + location</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none italic">
            Turn on camera + location
          </h1>
          <p className="font-serif italic text-sm text-on-surface/70 leading-relaxed">
            Fieldtrip needs these to run missions:
          </p>
        </div>

        <div className="space-y-4 py-2">
          {/* Camera Tool */}
          <div className="flex gap-4 p-3 bg-paper-dark border-2 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0 border border-brand-orange/20">
              <Camera className="w-5 h-5 text-brand-orange" />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-label font-black uppercase tracking-wider leading-none">Camera</p>
              <p className="text-label text-on-surface/60 leading-relaxed">So you can take proof photos.</p>
            </div>
          </div>

          {/* Location Tool */}
          <div className="flex gap-4 p-3 bg-paper-dark border-2 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.05)]">
            <div className="w-10 h-10 rounded-full bg-brand-lime/10 flex items-center justify-center flex-shrink-0 border border-brand-lime/20">
              <MapPin className="w-5 h-5 text-brand-lime" />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-label font-black uppercase tracking-wider leading-none">Location</p>
              <p className="text-label text-on-surface/60 leading-relaxed">So Fieldtrip can check you were really out there.</p>
            </div>
          </div>
        </div>

        <p className="text-xs font-mono text-on-surface/60 text-center uppercase tracking-widest pt-2">
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
            {isRequesting ? "Asking..." : "Allow"}
            {!isRequesting && <ChevronRight className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleMaybeLater}
            disabled={isRequesting}
            className="w-full py-3 text-on-surface/60 hover:text-on-surface font-mono text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Not now
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 justify-center">
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs font-mono font-bold uppercase">{error}</span>
          </div>
        )}

        {/* Bottom Accent */}
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-brand-cyan z-10" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-brand-magenta z-10" />
      </motion.div>
    </div>
  );
}
