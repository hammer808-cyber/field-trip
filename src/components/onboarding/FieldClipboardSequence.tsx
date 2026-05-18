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

interface FieldClipboardSequenceProps {
  onComplete: () => void;
}

type ScreenType = 'WELCOME' | 'WARNING' | 'CALIBRATION';

export const FieldClipboardSequence: React.FC<FieldClipboardSequenceProps> = ({ onComplete }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('WELCOME');

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

      <div className="bg-white border-4 border-on-surface p-10 space-y-8 shadow-[16px_16px_0px_rgba(0,0,0,0.05)] rotate-1 relative transition-all hover:rotate-0 hover:shadow-[20px_20px_0px_var(--color-brand-lime)]">
        {/* Corner utility bits */}
        <div className="absolute top-3 left-3 w-3 h-3 bg-on-surface/40" />
        <div className="absolute top-3 right-3 w-3 h-3 bg-on-surface/40" />
        
        <div className="flex items-center gap-6 border-b-4 border-on-surface/10 pb-6">
          <div className="w-16 h-16 border-2 border-on-surface bg-white shadow-[4px_4px_0px_black] overflow-hidden group/thumb">
            <img 
              src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Trevor&backgroundColor=b6e3f4" 
              alt="Trevor" 
              className="w-full h-full object-cover transition-all duration-500 group-hover/thumb:scale-125 grayscale hover:grayscale-0" 
            />
          </div>
          <div className="text-left">
            <p className="micro-label !tracking-widest !text-[12px] font-bold text-brand-orange italic">SECURE_COMM_ESTABLISHED</p>
            <p className="font-display uppercase text-lg font-bold italic tracking-normal">Trevor // Chief Counselor</p>
          </div>
        </div>
        
        <p className="font-serif italic text-3xl leading-relaxed text-on-surface font-medium">
          "Welcome to the Fieldtrip, friend. Before we issue your Kit, we need to know what kind of explorer you are. Let's find your vibe. <span className="bg-brand-lime/20 px-1">Don't overthink it</span>—stiffness ruins the photo."
        </p>
      </div>

      <button 
        onClick={() => setCurrentScreen('WARNING')}
        className="w-full bg-brand-orange text-white flex items-center justify-center gap-6 group py-10 border-4 border-on-surface shadow-[14px_14px_0px_black] active:translate-x-2 active:translate-y-2 active:shadow-none transition-all hover:bg-on-surface hover:text-brand-lime hover:shadow-[18px_18px_0px_var(--color-brand-orange)]"
      >
        <span className="font-display font-bold text-4xl uppercase tracking-tight italic">LET'S GO</span>
        <ChevronRight size={40} className="group-hover:translate-x-3 transition-transform stroke-[4]" />
      </button>
      
      <p className="text-center font-mono text-[12px] uppercase opacity-40 tracking-widest font-bold italic">
        PROTOCOL // IDENTITY_VERIFICATION_SECURED.704
      </p>
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

      <div className="space-y-10">
        <p className="font-serif italic text-3xl leading-relaxed text-on-surface font-medium">
          "Listen up! This setup is a <span className="text-brand-orange font-bold border-b-8 border-brand-orange/10 italic">one-way journey</span>. Once your vibe is locked, your mission is set. Enjoy the ride."
        </p>
        
        <div className="bg-white border-4 border-on-surface p-10 space-y-8 shadow-[14px_14px_0px_black] -rotate-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-lime opacity-5 -translate-y-12 translate-x-12 rotate-45 group-hover:opacity-20 transition-opacity" />
          <p className="micro-label font-bold text-brand-orange tracking-widest uppercase italic">MISSION_CONSTRAINTS.HV</p>
          <ul className="space-y-8">
            {[
              { icon: <ShieldCheck size={28} />, text: 'Answer instinctively. Trust your first thought.' },
              { icon: <UserCheck size={28} />, text: 'Your explorer type dictates your starting gear.' },
              { icon: <Activity size={28} />, text: 'Stay calm and enjoy the discovery.' }
            ].map((item, i) => (
              <li key={i} className="flex gap-6 items-center font-mono text-sm uppercase font-bold tracking-normal text-left italic group/item">
                <span className="text-brand-lime bg-on-surface p-3 border-2 border-on-surface shadow-[4px_4px_0px_black] shrink-0 transition-transform group-hover/item:rotate-12">{React.cloneElement(item.icon as React.ReactElement<any>, { className: 'stroke-[4]' })}</span>
                <span className="leading-tight border-b-2 border-on-surface/5 flex-1 pb-1">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <button 
          onClick={() => setCurrentScreen('CALIBRATION')}
          className="w-full px-6 py-8 bg-on-surface text-brand-lime border-4 border-on-surface font-display font-bold text-3xl uppercase tracking-tight hover:text-white transition-all shadow-[12px_12px_0px_black] active:translate-x-2 active:translate-y-2 active:shadow-none italic"
        >
          COMMENCE_HV_AUDIT
        </button>
        <button 
          onClick={() => setCurrentScreen('WELCOME')}
          className="w-full px-6 py-6 border-4 border-on-surface font-display font-bold text-sm uppercase tracking-wider bg-white text-on-surface hover:bg-on-surface/5 transition-all shadow-[8px_8px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none opacity-60 hover:opacity-100 italic"
        >
          &lt; Retreat_Now
        </button>
      </div>

      {/* Another stamp */}
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
        <h2 className="text-7xl font-display uppercase tracking-tight font-bold leading-tight italic">Calibrating<br />Persona.HV</h2>
        <p className="micro-label !text-brand-orange tracking-widest font-bold uppercase italic">ENVIRONMENT: BUREAU_INTAKE_LE</p>
      </div>

      <div className="space-y-8">
        <p className="font-serif italic text-3xl text-center text-on-surface leading-relaxed font-medium">
          "Your responses will determine your permanent Field Type. Choose according to your <span className="bg-brand-orange text-white px-2 not-italic font-bold">core frequency</span>."
        </p>

        <div className="space-y-4">
          <div className="h-8 bg-white border-4 border-on-surface shadow-[6px_6px_0px_black] overflow-hidden p-1.5 relative group">
            <motion.div 
              className="h-full bg-brand-orange border-2 border-on-surface shadow-[0_0_15px_var(--color-brand-orange)]"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-difference pointer-events-none">
               <span className="font-mono text-[10px] font-bold tracking-widest">SYSTEM_SCANNING</span>
            </div>
          </div>
          <div className="flex justify-between micro-label !text-[12px] font-bold opacity-50 uppercase tracking-widest italic">
            <span>SIGNAL_RECOVERY</span>
            <span>100%_LOCKED_HV</span>
          </div>
        </div>
      </div>

      <div className="bg-brand-lime p-10 border-4 border-on-surface shadow-[14px_14px_0px_black] relative rotate-1 transition-all hover:rotate-0">
        <StickyNote size={40} className="text-on-surface absolute -top-5 -left-5 rotate-12 fill-white/40" />
        <p className="font-mono text-sm leading-relaxed uppercase font-bold text-on-surface text-left italic">
          "TREVOR NOTE: Don't worry about the biometric sensors. They mostly measure pupil dilation and sweat response. Just focus on the mission."
        </p>
      </div>

      <button 
        onClick={onComplete}
        className="w-full bg-on-surface text-brand-lime py-12 border-4 border-on-surface shadow-[14px_14px_0px_var(--color-brand-lime)] active:translate-x-2 active:translate-y-2 active:shadow-none transition-all hover:text-white italic"
      >
        <span className="font-display font-bold text-4xl uppercase tracking-tight">DISPATCH_AUDIT</span>
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
