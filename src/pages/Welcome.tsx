import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { Sparkle } from '../components/SkinAssets';
import { getDisplayLabel } from '../utils/labelUtils';

import AccessCodeGate from './Auth/AccessCodeGate';
import SignUp from './Auth/SignUp';
import SignIn from './Auth/SignIn';

import { PageLoader } from '../components/PageLoader';

const welcomeImages = [
  {
    src: "/images/welcome/field-trip-01.png",
    alt: "Friends hanging out by a pool with a unicorn float"
  },
  {
    src: "/images/welcome/field-trip-02.png",
    alt: "Textured brick wall found outside"
  },
  {
    src: "/images/welcome/field-trip-03.png",
    alt: "Small white dog looking into the camera"
  },
  {
    src: "/images/welcome/field-trip-04.png",
    alt: "Palm trees and city skyline"
  },
  {
    src: "/images/welcome/field-trip-05.png",
    alt: "Dessert held in a car"
  },
  {
    src: "/images/welcome/field-trip-06.png",
    alt: "Palm trees reflected in a window"
  }
];

type AuthMode = 'welcome' | 'access_code' | 'signup' | 'signin';

export default function WelcomePage() {
  const { skin } = useTheme();
  const { user, fieldClassificationComplete, loading, onboardingCompleted } = useApp();
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [accessCode, setAccessCode] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const navigate = useNavigate();

  // Reset scroll on auth mode changes
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'instant' as any });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    const rafId = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(rafId);
  }, [authMode]);

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

  const WelcomePhotoCollage = () => {
    const tileClass = "overflow-hidden rounded-[8px] border-2 border-on-surface bg-white shadow-[6px_6px_0px_rgba(0,0,0,0.18)]";
    const imageClass = "h-full w-full object-cover";

    return (
      <div className="relative mx-auto w-full max-w-[560px]">
        <div className="relative grid h-[360px] grid-cols-6 grid-rows-6 gap-2 sm:h-[430px] sm:gap-3 lg:h-[560px]">
          <motion.figure
            initial={{ opacity: 0, y: 18, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ delay: 0.08 }}
            className={cn(tileClass, "col-span-4 row-span-4")}
          >
            <img src={welcomeImages[0].src} alt={welcomeImages[0].alt} loading="eager" fetchPriority="high" className={imageClass} />
          </motion.figure>

          <motion.figure
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className={cn(tileClass, "col-span-2 row-span-2")}
          >
            <img src={welcomeImages[2].src} alt={welcomeImages[2].alt} loading="lazy" className={imageClass} />
          </motion.figure>

          <motion.figure
            initial={{ opacity: 0, y: 18, rotate: 3 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            transition={{ delay: 0.24 }}
            className={cn(tileClass, "col-span-2 row-span-2")}
          >
            <img src={welcomeImages[4].src} alt={welcomeImages[4].alt} loading="lazy" className={imageClass} />
          </motion.figure>

          <motion.figure
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className={cn(tileClass, "col-span-2 row-span-2")}
          >
            <img src={welcomeImages[3].src} alt={welcomeImages[3].alt} loading="lazy" className={imageClass} />
          </motion.figure>

          <motion.figure
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={cn(tileClass, "col-span-2 row-span-2")}
          >
            <img src={welcomeImages[5].src} alt={welcomeImages[5].alt} loading="lazy" className={imageClass} />
          </motion.figure>

          <motion.figure
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className={cn(tileClass, "col-span-2 row-span-2")}
          >
            <img src={welcomeImages[1].src} alt={welcomeImages[1].alt} loading="lazy" className={imageClass} />
          </motion.figure>
        </div>
      </div>
    );
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className={cn(
      "page-scroll flex flex-col items-center justify-center p-4 md:p-6 text-center relative transition-colors duration-700",
      authMode === 'welcome' ? "bg-transparent" : (isBaja ? "bg-[#f5e6d3]" : isDiamond ? "bg-[#0a0a0a]" : isHeat ? "bg-[#ffcc33]" : "bg-transparent")
    )}>
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
      </>

      <AnimatePresence mode="wait">
        {authMode === 'welcome' ? (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:min-h-[calc(100vh-48px)] lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12"
          >
            <section className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-1 w-10 bg-brand-orange" />
                <span className="micro-label text-brand-orange tracking-[0.35em]">WELCOME TO FIELDTRIP</span>
              </div>

              <h1 className="font-display text-[clamp(4rem,18vw,9rem)] font-black italic leading-[0.78] tracking-normal text-on-surface">
                FIELDTRIP
              </h1>

              <p className="mt-5 max-w-[660px] font-display text-[clamp(2rem,8vw,5.5rem)] font-black italic uppercase leading-[0.9] tracking-normal text-on-surface">
                Get outside. Cause a scene. Get Receipts.
              </p>

              <p className="mt-5 max-w-md font-sans text-base font-black leading-snug text-on-surface/75 sm:text-lg">
                Your real-world photo game starts here.
              </p>

              <div className="order-2 my-6 w-full lg:hidden">
                <WelcomePhotoCollage />
              </div>

              <div className="order-3 mt-2 flex w-full max-w-xl flex-col gap-3 sm:flex-row lg:mt-8">
                <button 
                  onClick={handleStart}
                  className="flex-1 border-[3.5px] border-on-surface bg-on-surface px-5 py-4 font-display text-xl font-black italic uppercase leading-tight tracking-normal text-white shadow-[8px_8px_0px_var(--color-brand-lime)] transition-all hover:bg-brand-orange active:translate-x-1 active:translate-y-1 active:shadow-none sm:text-2xl"
                >
                  <span className="flex items-center justify-center gap-3">
                    Start First Mission
                    <ChevronRight className="h-6 w-6" />
                  </span>
                </button>

                <button 
                  onClick={handleSignInClick}
                  className="flex-1 border-[3.5px] border-on-surface bg-white px-5 py-4 font-display text-xl font-black italic uppercase leading-tight tracking-normal text-on-surface shadow-[8px_8px_0px_var(--color-brand-cyan)] transition-all hover:bg-brand-lime active:translate-x-1 active:translate-y-1 active:shadow-none sm:text-2xl"
                >
                  Log In
                </button>
              </div>

              <button 
                onClick={() => setShowHowItWorks(true)}
                className="order-4 mt-6 font-mono text-xs font-black uppercase tracking-widest text-on-surface/60 underline decoration-2 underline-offset-4 transition-colors hover:text-brand-orange"
              >
                How it works
              </button>
            </section>

            <section className="relative z-10 hidden lg:block">
              <WelcomePhotoCollage />
            </section>

            {/* How It Works Popup Modal */}
            <AnimatePresence>
              {showHowItWorks && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowHowItWorks(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  
                  {/* Body */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    className="relative w-full max-w-xl bg-[#FFFDF9] border-[5px] border-on-surface p-6 sm:p-8 shadow-[12px_12px_0px_black] z-10 rotate-[-0.5deg]"
                  >
                    <button 
                      onClick={() => setShowHowItWorks(false)}
                      className="absolute top-4 right-4 p-1.5 border-2 border-on-surface hover:bg-brand-orange-light bg-white rounded-full text-on-surface active:translate-y-0.5"
                    >
                      <X className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    
                    <h3 className="font-display font-black text-3xl sm:text-4xl italic text-on-surface uppercase tracking-tight mb-6">
                      HOW FIELDTRIP WORKS
                    </h3>
                    
                    <div className="space-y-4 font-mono text-[11px] text-left">
                      {[
                        { step: "01", title: "OPEN APP", text: "Tune in daily for fresh, simple photo challenges curated for summer vibes." },
                        { step: "02", title: "GET PHOTO " + getDisplayLabel('MISSIONS').toUpperCase(), text: "Browse your desk and draw a mission card detailing the photo requirement." },
                        { step: "03", title: "TAKE PHOTO", text: "Point your lens, capture the summer evidence, and add a quick caption receipt." },
                        { step: "04", title: "SUBMIT TO CREW", text: "Your photos instant-post onto your friends' Crew Memories Feed." },
                        { step: "05", title: "EARN POINTS", text: "Rack up points and complete summer boards to help decide the ultimate winner of the season!" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-start p-3 bg-white border-2 border-on-surface/10 rounded-lg hover:border-brand-orange/40 transition-colors">
                          <span className="font-sans font-black text-xs px-2 py-0.5 bg-brand-orange text-white rounded-sm">{item.step}</span>
                          <div>
                            <p className="font-sans font-black text-sm text-on-surface leading-tight uppercase tracking-tight mb-1">{item.title}</p>
                            <p className="text-on-surface/70 leading-relaxed text-[10px]">{item.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t-2 border-on-surface/10 flex justify-end">
                      <button 
                        onClick={() => setShowHowItWorks(false)}
                        className="px-6 py-2.5 bg-on-surface text-brand-lime border-2 border-on-surface shadow-[4px_4px_0px_black] active:translate-y-0.5 active:shadow-none font-display text-xs font-black uppercase italic tracking-wider"
                      >
                        Let's Play!
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
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
