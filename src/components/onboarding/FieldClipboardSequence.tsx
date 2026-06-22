import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, 
  AlertCircle, 
  Compass, 
  StickyNote, 
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';

import { useApp } from '../../context/AppContext';

interface FieldClipboardSequenceProps {
  onComplete: () => void;
}

type ScreenType = 'WELCOME' | 'WARNING' | 'CALIBRATION';

export const FieldClipboardSequence: React.FC<FieldClipboardSequenceProps> = ({ onComplete }) => {
  const { fieldGuideAssistEnabled } = useApp();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('WELCOME');

  // Reset scroll on screen changes
  React.useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'instant' as any });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    const rafId = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(rafId);
  }, [currentScreen]);

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const stampVariants = {
    initial: { scale: 1.5, opacity: 0, rotate: -15 },
    animate: { scale: 1, opacity: 0.4, rotate: 12 },
  };

  const renderWelcome = () => (
    <motion.div 
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-12"
    >
      <div className="relative">
        <div className="flex flex-col items-center text-center space-y-6 pt-12">
          <p className="micro-label font-bold tracking-widest text-on-surface opacity-40 italic">FIELD_TRIP_SETUP // READY.HV</p>
          <div className="w-28 h-28 bg-brand-lime flex items-center justify-center border-4 border-on-surface shadow-[12px_12px_0px_black] relative rotate-2 group cursor-help transition-transform hover:rotate-0">
            <ClipboardCheck size={56} className="text-on-surface stroke-[3]" />
            <motion.div 
              className="absolute -top-4 -right-4"
              animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <StickyNote size={32} className="text-brand-orange fill-brand-orange/20" />
            </motion.div>
          </div>
          <h1 className="font-display text-7xl md:text-8xl !leading-tight text-on-surface uppercase tracking-tight font-bold italic">
            Explorer<br />Setup
          </h1>
          <div className="flex items-center gap-4">
            <span className="p-1 px-3 border-2 border-on-surface bg-on-surface text-brand-lime font-bold text-[12px] uppercase tracking-wider italic">Ready for Launch</span>
            <div className="w-8 h-[2px] bg-brand-orange opacity-40" />
            <span className="font-mono text-[12px] uppercase font-bold opacity-50">FORM #88-C</span>
          </div>
        </div>
        
        {/* Decorative Stamp */}
        <motion.div 
          variants={stampVariants}
          initial="initial"
          animate="animate"
          className="absolute -top-16 -right-8 pointer-events-none select-none z-20"
        >
          <div className="border-4 border-brand-orange text-brand-orange px-8 py-3 font-display text-5xl uppercase tracking-tight font-bold rotate-[12deg] shadow-[6px_6px_0px_rgba(255,140,0,0.2)] bg-white/10 backdrop-blur-sm italic">
            CLASSIFIED
          </div>
        </motion.div>
      </div>


      <button 
        onClick={() => setCurrentScreen('WARNING')}
        className="w-full bg-brand-orange text-white flex items-center justify-center gap-6 group py-10 border-4 border-on-surface shadow-[14px_14px_0px_black] active:translate-x-2 active:translate-y-2 active:shadow-none transition-all hover:bg-on-surface hover:text-brand-lime hover:shadow-[18px_18px_0px_var(--color-brand-orange)]"
      >
        <span className="font-display font-bold text-4xl uppercase tracking-tight italic">LET'S GO</span>
        <ChevronRight size={40} className="group-hover:translate-x-3 transition-transform stroke-[4]" />
      </button>
    </motion.div>
  );

  const renderWarning = () => (
    <motion.div 
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-12"
    >
      <div className="flex items-center gap-8 border-b-4 border-on-surface pb-8">
        <div className="w-24 h-24 bg-brand-orange border-4 border-on-surface flex items-center justify-center shrink-0 shadow-[8px_8px_0px_black] rotate-6 text-white transition-transform hover:rotate-0">
          <AlertCircle size={56} className="stroke-[4]" />
        </div>
        <div className="text-left">
          <h2 className="text-6xl font-display uppercase tracking-tight text-on-surface leading-tight font-bold italic">Vibe<br />Check</h2>
          <div className="flex items-center gap-2 mt-3">
             <div className="w-3 h-3 bg-brand-orange animate-pulse" />
             <p className="p-1 px-3 bg-on-surface text-brand-orange font-bold text-[12px] uppercase tracking-wider inline-block italic">STATUS: ALMOST READY</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-4 border-on-surface p-8 space-y-6 shadow-[12px_12px_0px_black] text-left">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="font-mono text-brand-orange font-black text-xl">01/</span>
            <p className="font-serif italic text-lg text-on-surface">Keep your eyes sharp. Find real stuff from the world around you.</p>
          </div>
          <div className="flex items-start gap-4 pt-4 border-t border-dashed border-on-surface/20">
            <span className="font-mono text-brand-orange font-black text-xl">02/</span>
            <p className="font-serif italic text-lg text-on-surface">Be creative. Tell the tiny story like you just found treasure near a trash can.</p>
          </div>
          <div className="flex items-start gap-4 pt-4 border-t border-dashed border-on-surface/20">
            <span className="font-mono text-brand-orange font-black text-xl">03/</span>
            <p className="font-serif italic text-lg text-on-surface">Real proof only. Trevor loves chaos, but not fake chaos.</p>
          </div>
        </div>
      </div>

      <button 
        onClick={() => setCurrentScreen('CALIBRATION')}
        className="w-full bg-brand-orange text-white flex items-center justify-center gap-6 group py-10 border-4 border-on-surface shadow-[14px_14px_0px_black] active:translate-x-2 active:translate-y-2 active:shadow-none transition-all hover:bg-on-surface hover:text-brand-lime hover:shadow-[18px_18px_0px_var(--color-brand-orange)]"
      >
        <span className="font-display font-bold text-4xl uppercase tracking-tight italic">PROCEED</span>
        <ChevronRight size={40} className="group-hover:translate-x-3 transition-transform stroke-[4]" />
      </button>

      {/* Decorative stamp */}
      <motion.div 
        variants={stampVariants}
        initial="initial"
        animate="animate"
        className="fixed bottom-12 -left-16 opacity-30 pointer-events-none -rotate-12 z-0"
      >
        <div className="border-4 border-brand-lime text-on-surface bg-brand-lime px-10 py-4 font-display text-5xl uppercase font-bold mix-blend-multiply italic shadow-[0_0_20px_var(--color-brand-lime)]">
          VERIFIED_ASSET
        </div>
      </motion.div>
    </motion.div>
  );

  const renderCalibration = () => (
    <motion.div 
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-16"
    >
      <div className="text-center space-y-6">
        <div className="mx-auto w-32 h-32 bg-brand-lime border-4 border-on-surface flex items-center justify-center text-on-surface shadow-[10px_10px_0px_black] mb-8 relative">
           <div className="absolute inset-2 border-2 border-on-surface/20 border-dashed animate-spin-slow rounded-full" />
           <Compass size={64} className="stroke-[4] relative z-10" />
        </div>
        <h2 className="text-7xl font-display uppercase tracking-tight font-bold leading-tight italic">Calibrating<br />Persona</h2>
        <p className="micro-label !text-brand-orange tracking-widest font-bold uppercase italic">Vibe: CHECK IT</p>
      </div>
      
      <button 
        onClick={onComplete}
        className="w-full bg-on-surface text-brand-lime py-12 border-4 border-on-surface shadow-[14px_14px_0px_var(--color-brand-lime)] active:translate-x-2 active:translate-y-2 active:shadow-none transition-all hover:text-white italic"
      >
        <span className="font-display font-bold text-4xl uppercase tracking-tight">CHECK YUOR VIBE</span>
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-paper relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
        <div className="absolute top-10 left-10 text-huge rotate-12">REPORT</div>
        <div className="absolute bottom-20 right-10 text-huge -rotate-45">0704-B</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-on-surface rotate-45" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-on-surface -rotate-45" />
      </div>

      <div className="w-full max-w-sm relative z-10 px-4">
        <AnimatePresence mode="wait">
          {currentScreen === 'WELCOME' && renderWelcome()}
          {currentScreen === 'WARNING' && renderWarning()}
          {currentScreen === 'CALIBRATION' && renderCalibration()}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}} />
    </div>
  );
};
