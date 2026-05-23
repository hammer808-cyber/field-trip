import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Sticker } from '../components/UI';
import { cn } from '../lib/utils';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';

import AccessCodeGate from './Auth/AccessCodeGate';
import SignUp from './Auth/SignUp';
import SignIn from './Auth/SignIn';

const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

const openingPolaroids = [
  {
    src: `https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=600&h=600&fit=crop&q=80&sat=-100&contrast=120`,
    alt: "Field Trip opening Polaroid 1",
  },
  {
    src: `https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=600&fit=crop&q=80&sat=-100&contrast=120`,
    alt: "Field Trip opening Polaroid 2",
  },
  {
    src: `https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&h=600&fit=crop&q=80&sat=-100&contrast=120`,
    alt: "Field Trip opening Polaroid 3",
  },
  {
    src: `https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=600&fit=crop&q=80&sat=-100&contrast=120`,
    alt: "Field Trip opening Polaroid 4",
  },
  {
    src: `https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&h=600&fit=crop&q=80&sat=-100&contrast=120`,
    alt: "Field Trip opening Polaroid 5",
  },
  {
    src: `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop&q=80&sat=-100&contrast=120`,
    alt: "Field Trip opening Polaroid 6",
  },
];

type AuthMode = 'welcome' | 'access_code' | 'signup' | 'signin';

export default function WelcomePage() {
  const { skin, frankieMode, fc } = useTheme();
  const { user, fieldType, fieldClassificationComplete, loading, onboardingCompleted } = useApp();
  const [authMode, setAuthMode] = useState<AuthMode>('access_code');
  const [accessCode, setAccessCode] = useState('');
  const navigate = useNavigate();

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  // Redirect if already logged in and everything is good
  useEffect(() => {
    if (user && fieldClassificationComplete && onboardingCompleted) {
      navigate('/deck');
    }
  }, [user, fieldClassificationComplete, onboardingCompleted, navigate]);

  const handleStart = () => {
    setAuthMode('access_code');
  };

  const handleSignInClick = () => {
    setAuthMode('signin');
  };

  const Polaroid = ({ photo, label, rotation, index }: { photo: { src: string; alt: string }; label: string; rotation: string; index: number }) => {
    const [hasError, setHasError] = useState(false);

    return (
      <div 
        style={{ transform: `rotate(${rotation})` }}
        className="bg-white p-3 pb-8 shadow-[16px_16px_0px_rgba(0,0,0,0.05)] border-2 border-on-surface group relative transition-all duration-500 hover:shadow-[20px_20px_0px_var(--color-brand-lime)] hover:-translate-y-2"
      >
        {/* Utility Corner Bits */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-brand-lime z-20" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-brand-orange z-20" />
        
        <div className="aspect-square overflow-hidden bg-gray-50 relative border-2 border-on-surface">
          {hasError ? (
            <div className="h-full w-full flex flex-col items-center justify-center bg-brand-orange/5 text-brand-orange/20">
              <Camera size={32} strokeWidth={1} />
              <span className="text-[6px] uppercase tracking-widest mt-2">Signal Lost</span>
            </div>
          ) : (
            <img 
              src={photo.src || undefined} 
              alt={photo.alt} 
              onError={() => setHasError(true)}
              className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-2" 
            />
          )}
          {/* Gloss Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          {/* Scanline Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
        </div>
        
        <div className="mt-3 flex justify-between items-center px-1">
          <span className="font-mono text-[9px] font-black text-on-surface uppercase tracking-widest">
            {label}
          </span>
          <span className="font-mono text-[8px] text-on-surface/30 font-black">
            #{String(index + 1).padStart(3, '0')}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
// ... existing loading state ...
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
         <div className="text-huge animate-pulse opacity-20">INITIALIZING...</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center p-4 md:p-6 text-center relative overflow-x-hidden overflow-y-auto transition-colors duration-700",
      authMode === 'welcome' ? "bg-white" : (isBaja ? "bg-[#f5e6d3]" : isDiamond ? "bg-[#0a0a0a]" : isHeat ? "bg-[#ffcc33]" : "bg-white")
    )}>
      {/* High-Voltage Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]" 
           style={{ 
             backgroundImage: 'linear-gradient(var(--color-on-surface) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-on-surface) 1.5px, transparent 1.5px)', 
             backgroundSize: '40px 40px' 
           }} 
      />

      {/* Decorative Shimmer / HUD Effect */}
      <div className="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.03)_50%)] bg-[length:100%_2px] opacity-10" />

      {/* Disco Flare Accents */}
      <>
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 -right-10 z-0 opacity-15 text-brand-lime"
        >
          <Sparkle className="w-64 h-64" />
        </motion.div>
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-20 -left-10 z-0 opacity-10 text-brand-orange"
        >
          <Sparkle className="w-96 h-96" />
        </motion.div>
        <SunFlare className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-brand-lime/10 blur-[120px] pointer-events-none" />
        <SunFlare className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-brand-cyan/15 blur-[120px] pointer-events-none" />
      </>

      <AnimatePresence mode="wait">
        {authMode === 'welcome' ? (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center w-full max-w-4xl mx-auto py-12 px-4"
          >
            {/* Header / Logo Section */}
            <div className="flex flex-col items-center space-y-4 md:space-y-6 mb-12 md:mb-24 relative z-10">
              <div className="flex items-center gap-6 mb-4">
                 <div className="w-12 h-1 bg-brand-orange" />
                 <span className="micro-label text-brand-orange tracking-[0.5em]">{fc('AUTHENTICATION_STATION', 'SIGN IN')}</span>
                 <div className="w-12 h-1 bg-brand-orange" />
              </div>
              
              <div className="text-center space-y-2">
                <h1 className="text-huge italic">
                  F I E L D T R I P
                </h1>
                <div className="flex flex-col items-center">
                   <p className="font-mono text-[11px] font-bold text-on-surface uppercase tracking-[0.4em] bg-brand-lime px-5 py-2 shadow-[4px_4px_0px_black] rotate-1">
                     {fc('GO OUTSIDE. EXPLORE THE WORLD.', 'GO OUTSIDE. EXPLORE YOUR CITY.')}
                   </p>
                   <p className="font-serif italic text-xl md:text-2xl opacity-75 mt-8 max-w-md leading-relaxed">
                     {fc('"You made it. Barely. Now go document the world’s vibe with alarming confidence."', '"Welcome. You\'re ready to start exploring and documenting the world around you."')}
                   </p>
                </div>
              </div>
            </div>

            {/* Hero Image Section (Polaroids) */}
            <div className="relative w-full aspect-square max-w-2xl mb-12 flex items-center justify-center">
              {/* Polaroids Staggered Layout */}
              <div className="relative w-full h-full">
                {/* Arrows Overlay */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                  {/* Arrow 1: Top Left to Right*/}
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 1 }}>
                    <path 
                      d="M 28,30 Q 32,40 45,45" 
                      fill="none" 
                      stroke="var(--color-brand-lime)" 
                      strokeWidth="4.5" 
                      strokeLinecap="round" 
                    />
                    <path d="M 38,44 L 45,45 L 43,38" fill="none" stroke="var(--color-brand-lime)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.g>

                  {/* Arrow 2: Top Right to Center */}
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 1.2 }}>
                    <path 
                      d="M 70,35 Q 65,45 55,50" 
                      fill="none" 
                      stroke="var(--color-brand-orange)" 
                      strokeWidth="4.5" 
                      strokeLinecap="round" 
                    />
                    <path d="M 62,48 L 55,50 L 58,42" fill="none" stroke="var(--color-brand-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.g>

                  {/* Arrow 3: Center to Bottom Left */}
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 1.4 }}>
                    <path 
                      d="M 40,65 Q 30,75 18,85" 
                      fill="none" 
                      stroke="var(--color-brand-cyan)" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                    />
                    <path d="M 26,85 L 18,85 L 20,77" fill="none" stroke="var(--color-brand-cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.g>

                  {/* Arrow 4: Center to Bottom Right */}
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 1.6 }}>
                    <path 
                      d="M 60,65 Q 70,75 82,88" 
                      fill="none" 
                      stroke="var(--color-brand-magenta)" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                    />
                    <path d="M 74,86 L 82,88 L 80,80" fill="none" stroke="var(--color-brand-magenta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.g>
                </svg>
                
                {/* 1. Pool Day */}
                <motion.div 
                  initial={{ opacity: 0, rotate: -15, y: 20 }}
                  animate={{ opacity: 1, rotate: -8, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="absolute top-[10%] left-[10%] z-20 w-[42%]"
                >
                  <Polaroid 
                    photo={openingPolaroids[0]} 
                    label="SCANNED PROOF" 
                    rotation="-1deg"
                    index={0}
                  />
                </motion.div>

                {/* 2. Desert Finds */}
                <motion.div 
                  initial={{ opacity: 0, rotate: 15, y: 20 }}
                  animate={{ opacity: 1, rotate: 4, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-[5%] right-[5%] z-10 w-[42%]"
                >
                  <Polaroid 
                    photo={openingPolaroids[1]} 
                    label="EVIDENCE #2" 
                    rotation="2deg"
                    index={1}
                  />
                </motion.div>

                {/* 3. Gallery Wall */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-[35%] left-[25%] z-30 w-[42%]"
                >
                  <Polaroid 
                    photo={openingPolaroids[2]} 
                    label="VERIFIED 03" 
                    rotation="0deg"
                    index={2}
                  />
                </motion.div>

                {/* 4. Night Out */}
                <motion.div 
                  initial={{ opacity: 0, rotate: -20, y: 20 }}
                  animate={{ opacity: 1, rotate: -5, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute bottom-[5%] left-[5%] z-20 w-[42%]"
                >
                  <Polaroid 
                    photo={openingPolaroids[3]} 
                    label="NIGHTSYNC 004" 
                    rotation="-3deg"
                    index={3}
                  />
                </motion.div>

                {/* 5. Palm Views */}
                <motion.div 
                  initial={{ opacity: 0, rotate: 20, y: 20 }}
                  animate={{ opacity: 1, rotate: 6, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-[2%] right-[5%] z-10 w-[42%]"
                >
                  <Polaroid 
                    photo={openingPolaroids[4]} 
                    label="CREW 005" 
                    rotation="4deg"
                    index={4}
                  />
                </motion.div>

                {/* 6. Extra Scan */}
                <motion.div 
                  initial={{ opacity: 0, rotate: -10, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: -2, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="absolute top-[25%] right-[20%] z-20 w-[40%]"
                >
                  <Polaroid 
                    photo={openingPolaroids[5]} 
                    label="C Town #6" 
                    rotation="-1deg"
                    index={5}
                  />
                </motion.div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 w-full max-w-3xl mt-16 md:mt-24 mb-16 relative z-30">
              {/* Utility Floating Label */}
              <div className="absolute -top-12 left-0 flex items-center gap-2 md:block">
                <div className="w-2 h-2 bg-brand-orange animate-pulse rounded-full md:hidden" />
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.5em] opacity-40">
                  {fc('Vibe Check // ENGAGEMENT_OPTIONS', 'OPTIONS')}
                </span>
              </div>
              
              <button 
                onClick={handleStart}
                className="flex-1 px-10 py-10 border-2 border-on-surface bg-on-surface text-white font-display font-bold text-4xl md:text-6xl uppercase tracking-tight hover:bg-brand-orange transition-all active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[20px_20px_0px_var(--color-brand-lime)] group relative overflow-hidden italic leading-tight"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 flex items-center justify-center gap-4">
                  {fc('GET STARTED', 'GET STARTED')}
                  <ChevronRight className="w-8 h-8 md:w-12 md:h-12" />
                </span>
              </button>
              
              <button 
                onClick={handleSignInClick}
                className="flex-1 px-10 py-10 border-2 border-on-surface bg-white text-on-surface font-display font-bold text-4xl md:text-6xl uppercase tracking-tight hover:bg-brand-lime transition-all active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[20px_20px_0px_var(--color-brand-cyan)] group relative overflow-hidden italic leading-tight"
              >
                <div className="absolute inset-0 bg-on-surface translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 group-hover:text-white transition-colors">{fc('LOG IN', 'SIGN IN')}</span>
              </button>
            </div>
          </motion.div>
        ) : authMode === 'access_code' ? (

          <motion.div key="vibe check" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
            <AccessCodeGate 
              onSuccess={(code) => {
                setAccessCode(code);
                setAuthMode('signup');
              }}
              onBack={() => setAuthMode('welcome')}
            />
          </motion.div>
        ) : authMode === 'signup' ? (
          <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
            <SignUp 
              accessCode={accessCode}
              onSuccess={() => {
                // SignUp registers user, AppContext onAuthStateChanged will pick it up
                // and navigation/flow logic elsewhere should handle routing to legal
              }}
              onBack={() => setAuthMode('access_code')}
            />
          </motion.div>
        ) : (
          <motion.div key="signin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
            <SignIn 
              onSuccess={() => {}}
              onBack={() => setAuthMode('welcome')}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {authMode !== 'welcome' && (
        <footer className={cn(
          "fixed bottom-6 left-0 w-full px-8 flex justify-between font-mono text-[10px] pointer-events-none",
          isBaja ? "text-baja-pink opacity-60" : isDiamond ? "text-white opacity-40" : isHeat ? "text-white" : "text-on-surface opacity-30"
        )}>
          <span>{isBaja ? 'COASTAL VOL. 02' : isDiamond ? 'REFLECTIVE SYS 9.1' : isHeat ? 'HEATWAVE v2.0' : 'THE RECEIPTS // VOLUME_11.2'}</span>
          <span>{isBaja ? 'PAGE GLOW' : isDiamond ? 'SILVER PAGE' : isHeat ? 'PAGE HOT' : 'ORIENTATION_INDEX // 001'}</span>
        </footer>
      )}
    </div>
  );
}
