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

type AuthMode = 'welcome' | 'access_code' | 'signup' | 'signin';

export default function WelcomePage() {
  const { skin, frankieMode } = useTheme();
  const { user, persona, personaQuizComplete, loading, onboardingCompleted } = useApp();
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [accessCode, setAccessCode] = useState('');
  const navigate = useNavigate();

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  // Redirect if already logged in and everything is good
  useEffect(() => {
    if (user && personaQuizComplete && onboardingCompleted) {
      navigate('/deck');
    }
  }, [user, personaQuizComplete, onboardingCompleted, navigate]);

  const handleStart = () => {
    setAuthMode('access_code');
  };

  const handleSignInClick = () => {
    setAuthMode('signin');
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
      "min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden transition-colors duration-700",
      isBaja ? "bg-[#f5e6d3]" : isDiamond ? "bg-[#0a0a0a]" : isHeat ? "bg-[#ffcc33]" : "bg-paper"
    )}>
      <AnimatePresence mode="wait">
        {authMode === 'welcome' ? (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center space-y-8 relative w-full"
          >
            {isBaja && !frankieMode && (
              <>
                <div className="absolute inset-0 bg-gradient-to-tr from-baja-aqua/5 via-transparent to-baja-pink/5" />
                <Hibiscus className="absolute top-[-40px] left-[-40px] w-80 h-80 opacity-10 blur-[2px] -z-10" />
                <Hibiscus className="absolute bottom-[-60px] right-[-60px] w-96 h-96 opacity-10 blur-[2px] -z-10 rotate-[150deg]" />
                <ChromeStar className="absolute top-[20%] right-[15%] w-16 h-16 opacity-20 -z-10 animate-spin-slow" />
              </>
            )}

            {isDiamond && !frankieMode && (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05)_0%,_transparent_70%)]" />
                <DiamondStar className="absolute top-[5%] left-[5%] w-48 h-48 text-white opacity-[0.03] -z-10" />
                <Sparkle className="absolute top-1/4 right-[20%] w-12 h-12 text-white opacity-20 animate-pulse" />
                <div className="absolute inset-0 liquid-chrome opacity-10 pointer-events-none mix-blend-overlay" />
              </>
            )}

            {isHeat && !frankieMode && (
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-[#ff8c00]/20 to-transparent" />
                <SunFlare className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px]" />
                <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-heat-pink/20 blur-[100px] rounded-full" />
              </>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 relative z-10"
            >
              <span className={cn(
                "micro-label",
                isBaja ? "text-baja-pink" : isDiamond ? "text-diamond-silver" : isHeat ? "text-white" : "text-brand-orange"
              )}>
                {isBaja ? 'COASTAL EDITION v2.0' : isDiamond ? 'CHROME ARCHIVE v9.0' : isHeat ? 'HEATWAVE RELOADED' : 'FIELD TRIP // ORIENTATION'}
              </span>
              <h1 className={cn(
                "text-huge leading-none uppercase tracking-tighter",
                isBaja ? "text-baja-pink drop-shadow-lg" : 
                isDiamond ? "liquid-chrome bg-clip-text text-transparent" :
                isHeat ? "text-white drop-shadow-[0_4px_#ff007f]" :
                "text-on-surface"
              )}>
                {isBaja ? 'Baja Bratz' : isDiamond ? 'Slippery Diamond' : isHeat ? 'Summer Heat' : 'YOUR FIRST FIELD TRIP'}
              </h1>
              <p className={cn("font-accent text-xl", isBaja ? "text-baja-aqua font-bold" : isDiamond ? "text-diamond-purple" : isHeat ? "text-white font-display" : "bureau-subhead")}>
                {isBaja ? 'Sunkissed & Salty' : isDiamond ? 'Slick. Shiny. Dangerous.' : isHeat ? 'Poolside Mania' : 'Three solo entries. One unlocked crew. No boring weekends.'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, rotate: -5 }}
              animate={{ opacity: 1, rotate: -2 }}
              className="relative group max-w-xs z-10"
            >
              <div className={cn(
                "relative transition-all duration-500",
                isBaja ? "p-4 pb-12 bg-white rounded-[2rem] border-4 border-baja-pink rotate-2 shadow-[15px_15px_0px_#40e0d0]" : 
                isDiamond ? "p-4 pb-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-sm -rotate-3" :
                isHeat ? "p-4 pb-12 bg-white rounded-[3rem] border-8 border-white shadow-[15px_15px_0px_rgba(255,140,0,0.5)] rotate-3" :
                "notice-card p-4 pb-12 rotate-[-1deg] shadow-[12px_12px_0px_gray]"
              )}>
                {!isBaja && !isDiamond && !isHeat && (
                  <div className="absolute -top-4 -right-4 z-20">
                     <Sticker color="orange" className="rotate-12">OFFICIAL_BUREAU</Sticker>
                  </div>
                )}
                <div className={cn(
                  "aspect-square overflow-hidden",
                  isBaja ? "rounded-[1.5rem]" : isDiamond ? "rounded-none" : isHeat ? "rounded-[2rem]" : "evidence-frame grayscale-[0.5] contrast-125"
                )}>
                  <img 
                    src={isBaja ? "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800" : 
                         isDiamond ? "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800" :
                         isHeat ? "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=800" :
                         "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?auto=format&fit=crop&q=80&w=800"} 
                    alt="Theme"
                    className={cn("w-full h-full object-cover", isDiamond && "contrast-125")}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute top-2 left-2 rotate-[-5deg] pointer-events-none">
                   <div className="bureau-tag bg-brand-orange text-white text-[8px]">LOG_RECOVERY</div>
                </div>
                {isBaja ? (
                  <div className="pt-4 flex justify-center">
                    <span className="font-display text-baja-pink text-xs uppercase tracking-widest leading-none">EST. SUMMER '02</span>
                  </div>
                ) : isDiamond ? (
                  <div className="pt-4 flex justify-between items-center text-white/40 font-mono text-[8px] uppercase tracking-widest">
                    <span>Reflective Layer</span>
                    <span>v1.0</span>
                  </div>
                ) : isHeat ? (
                  <div className="pt-4 flex justify-center">
                     <span className="font-display text-heat-pink text-sm uppercase tracking-tighter underline decoration-4 decoration-heat-yellow">HOT GIRL SUMMER</span>
                  </div>
                ) : (
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="micro-label font-bold text-on-surface">SUBJECT: FIELD_ASSET_ACQUISITION</span>
                      <span className="micro-label opacity-40">ED. 11.2</span>
                    </div>
                    <div className="h-0.5 bg-on-surface opacity-10 w-full" />
                    <p className="text-[10px] uppercase font-mono tracking-tighter opacity-60 text-left">PROCESSED BY CIVILIAN RECREATION AUTHORITY</p>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="space-y-6 z-10 w-full max-w-sm">
              <div className={cn(!isBaja && !isDiamond && !isHeat && "bureau-panel text-left space-y-3 relative")}>
                 {!isBaja && !isDiamond && !isHeat && <div className="file-tab">FIELD NOTICE</div>}
                <p className={cn("font-serif text-lg leading-relaxed", isBaja ? "text-baja-pink/70" : isDiamond ? "text-white/60" : isHeat ? "text-white font-bold" : "text-on-surface")}>
                  {isBaja 
                    ? "Your beach bag is packed and the sun is out. Step into the heat and glow up." :
                    isDiamond ? "The lens is polished. The light is harsh. Capture the world in liquid chrome." :
                    isHeat ? "Pool's open. Sun's out. Drama's on. Let's make some waves." :
                    "Your first three trips are solo. Capture proof, write the note, submit the entry. Once you survive orientation, crew mode unlocks and the leaderboard starts getting personal."}
                </p>
                {!isBaja && !isDiamond && !isHeat && (
                  <div className="pt-2 border-t border-dashed border-on-surface/20">
                     <p className="micro-label opacity-40">By initializing, you agree to official recreational mandates and data securement policies.</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleStart}
                  className={cn(
                    "inline-flex items-center justify-center gap-3 px-8 py-4 w-full transition-all text-center",
                    isBaja ? "bg-baja-pink text-white rounded-full font-display text-2xl tracking-widest shadow-[0px_8px_0px_#ff007f]" :
                    isDiamond ? "bg-white text-black rounded-none font-mono font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.5)]" :
                    isHeat ? "bg-heat-pink text-white rounded-full font-display text-2xl shadow-[0_8px_#ff8c00] border-4 border-white" :
                    "bureau-btn text-xl"
                  )}
                >
                  {isBaja ? 'LET\'S GLOW' : isDiamond ? 'ENTER FLASH' : isHeat ? 'GO POOLSIDE' : 'JOIN THE FIELD TRIP'}
                </button>
                
                <button 
                  onClick={handleSignInClick}
                  className={cn(
                    "p-4 text-[10px] uppercase font-bold tracking-widest opacity-60 hover:opacity-100 transition-opacity",
                    isDiamond ? "text-white" : "text-on-surface"
                  )}
                >
                  Already registered? Sign In
                </button>
              </div>
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

      <footer className={cn(
        "fixed bottom-6 left-0 w-full px-8 flex justify-between font-mono text-[10px] pointer-events-none",
        isBaja ? "text-baja-pink opacity-60" : isDiamond ? "text-white opacity-40" : isHeat ? "text-white" : "text-on-surface opacity-30"
      )}>
        <span>{isBaja ? 'COASTAL VOL. 02' : isDiamond ? 'REFLECTIVE SYS 9.1' : isHeat ? 'HEATWAVE v2.0' : 'BUREAU_ARCHIVE // VOLUME_11.2'}</span>
        <span>{isBaja ? 'PAGE GLOW' : isDiamond ? 'SILVER PAGE' : isHeat ? 'PAGE HOT' : 'ORIENTATION_INDEX // 001'}</span>
      </footer>
    </div>
  );
}
