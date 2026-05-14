import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const openingPolaroids = [
  {
    src: "/images/opening/fieldtrip-polaroid-01.jpg",
    alt: "Field Trip opening Polaroid 1",
  },
  {
    src: "/images/opening/fieldtrip-polaroid-02.jpg",
    alt: "Field Trip opening Polaroid 2",
  },
  {
    src: "/images/opening/fieldtrip-polaroid-03.jpg",
    alt: "Field Trip opening Polaroid 3",
  },
  {
    src: "/images/opening/fieldtrip-polaroid-05.jpg",
    alt: "Field Trip opening Polaroid 5",
  },
  {
    src: "/images/opening/fieldtrip-polaroid-06.jpg",
    alt: "Field Trip opening Polaroid 6",
  },
  {
    src: "/images/opening/fieldtrip-polaroid-07.jpg",
    alt: "Field Trip opening Polaroid 7",
  },
];

type AuthMode = 'welcome' | 'access_code' | 'signup' | 'signin';

export default function WelcomePage() {
  const { skin, frankieMode } = useTheme();
  const { user, fieldType, fieldClassificationComplete, loading, onboardingCompleted } = useApp();
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [accessCode, setAccessCode] = useState('');
  const navigate = useNavigate();

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

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

  const Polaroid = ({ photo, label, rotation }: { photo: { src: string; alt: string }; label: string; rotation: string }) => (
    <div 
      style={{ transform: `rotate(${rotation})` }}
      className="bg-white p-2 pb-6 shadow-xl border border-black/5"
    >
      <div className="aspect-square overflow-hidden">
        <img 
          src={photo.src} 
          alt={photo.alt} 
          className="h-full w-full object-cover grayscale" 
          onError={() => console.error("Failed to load image:", photo.src)}
        />
      </div>
      <div className="mt-2 text-center">
        <span className="font-['Kalam'] text-[10px] md:text-sm font-bold text-[#2d2a26] uppercase tracking-tight">
          {label}
        </span>
      </div>
    </div>
  );

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
      "min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden transition-colors duration-700",
      authMode === 'welcome' ? "bg-[#efede1]" : (isBaja ? "bg-[#f5e6d3]" : isDiamond ? "bg-[#0a0a0a]" : isHeat ? "bg-[#ffcc33]" : "bg-paper")
    )}>
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
            <div className="flex flex-col items-center space-y-4 mb-20">
              <div className="relative w-24 h-24 mb-2">
                {/* Logo Path SVG */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#e0a92e] overflow-visible">
                   <path 
                    d="M 10,80 C 10,80 40,95 60,80 C 80,65 90,80 90,80" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeDasharray="4 4" 
                    className="opacity-100"
                  />
                  {/* Sparkle/Sun at the end */}
                  <g transform="translate(90, 80) scale(0.6)">
                    <path d="M0 -20 L0 20 M-20 0 L20 0 M-14 -14 L14 14 M-14 14 L14 -14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="4" fill="currentColor" />
                  </g>
                </svg>
                
                {/* Main Pin Logo */}
                <div className="relative z-10 flex items-center justify-center w-full h-full">
                  <div className="w-16 h-16 bg-[#2d2a26] rounded-full flex items-center justify-center relative shadow-xl">
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-4 w-8 h-8 bg-[#2d2a26] rotate-45 rounded-sm" />
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center z-20">
                      {/* Shutter Icon */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-[#2d2a26]">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 3 v18" />
                        <path d="M3 12 h18" />
                        <path d="M5.5 5.5 l13 13" />
                        <path d="M5.5 18.5 l13 -13" />
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-6xl md:text-7xl font-sans font-black tracking-tighter text-[#2d2a26] leading-none">
                  FIELDTRIP
                </h1>
                <p className="text-xl md:text-2xl font-sans font-medium text-[#2d2a26] opacity-80 mt-1">
                  Proof you went outside.
                </p>
              </div>
            </div>

            {/* Hero Image Section (Polaroids) */}
            <div className="relative w-full aspect-square max-w-2xl mb-12 flex items-center justify-center">
              {/* Polaroids Staggered Layout */}
              <div className="relative w-full h-full">
                
                {/* 1. Pool Day */}
                <motion.div 
                  initial={{ opacity: 0, rotate: -15, y: 20 }}
                  animate={{ opacity: 1, rotate: -8, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="absolute top-[10%] left-[10%] z-20 w-[42%]"
                >
                  <Polaroid 
                    photo={openingPolaroids[0]} 
                    label="ENTRY 001: FIELD SCAN" 
                    rotation="-1deg"
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
                    label="PROOF FOUND: COLLECTED" 
                    rotation="2deg"
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
                    label="FIELD CHECK: VERIFIED" 
                    rotation="0deg"
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
                    label="DETOUR LOG: NIGHT SCAN" 
                    rotation="-3deg"
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
                    label="CREW SIGHTING: REGISTERED" 
                    rotation="4deg"
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
                    label="EXTRA LOG: CLEARANCE" 
                    rotation="-1deg"
                  />
                </motion.div>

                {/* Arrows Overlay */}
                <div className="absolute inset-0 pointer-events-none z-40">
                  {/* Top Right Arrow */}
                  <div className="absolute top-[10%] right-[35%] w-12 h-12 text-[#64748b]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full rotate-[120deg]">
                      <path d="M3 3s4.5 12 11 12" />
                      <polyline points="10 18 14 15 11 11" />
                    </svg>
                  </div>
                  {/* Middle Left Arrow */}
                  <div className="absolute mid-left top-[30%] left-[15%] w-12 h-12 text-[#525e4c]">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full -rotate-[60deg]">
                      <path d="M21 21s-4.5-12-11-12" />
                      <polyline points="14 6 10 9 13 13" />
                    </svg>
                  </div>
                   {/* Bottom Left Arrow */}
                   <div className="absolute bottom-[25%] left-[10%] w-12 h-12 text-[#c2410c]">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full rotate-[30deg]">
                      <path d="M3 21s4.5-12 11-12" />
                      <polyline points="10 6 14 9 11 13" />
                    </svg>
                  </div>
                  {/* Bottom Right Arrow */}
                   <div className="absolute bottom-[15%] right-[20%] w-12 h-12 text-[#2d2a26]">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full -rotate-[150deg]">
                      <path d="M21 3s-4.5 12-11 12" />
                      <polyline points="14 18 10 15 13 11" />
                    </svg>
                  </div>
                   {/* Top Left Arrow */}
                   <div className="absolute top-[5%] left-[45%] w-12 h-12 text-[#525e4c]">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full rotate-[180deg]">
                      <path d="M3 3s12 4.5 12 11" />
                      <polyline points="18 10 15 14 11 11" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex flex-col md:flex-row gap-8 w-full max-w-2xl mt-12 mb-12">
              <button 
                onClick={handleStart}
                className="flex-1 px-8 py-6 rounded-full border-[3px] border-[#c2410c] bg-white text-[#c2410c] font-sans font-extrabold text-2xl md:text-3xl uppercase tracking-tighter hover:bg-[#c2410c] hover:text-white transition-all active:scale-[0.98] shadow-xl"
              >
                START THE TRIP
              </button>
              <button 
                onClick={handleSignInClick}
                className="flex-1 px-8 py-6 rounded-full border-[3px] border-[#c2410c] bg-white text-[#c2410c] font-sans font-extrabold text-2xl md:text-3xl uppercase tracking-tighter hover:bg-[#c2410c] hover:text-white transition-all active:scale-[0.98] shadow-xl"
              >
                I HAVE A CODE
              </button>
            </div>
          </motion.div>
        ) : authMode === 'access_code' ? (

          <motion.div key="access_code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
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
          <span>{isBaja ? 'COASTAL VOL. 02' : isDiamond ? 'REFLECTIVE SYS 9.1' : isHeat ? 'HEATWAVE v2.0' : 'BUREAU_ARCHIVE // VOLUME_11.2'}</span>
          <span>{isBaja ? 'PAGE GLOW' : isDiamond ? 'SILVER PAGE' : isHeat ? 'PAGE HOT' : 'ORIENTATION_INDEX // 001'}</span>
        </footer>
      )}
    </div>
  );
}
