import { useState, useRef, Suspense, lazy, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Camera, X, Check, Upload, Lock, Calendar, ChevronDown, MessageSquare, Zap } from 'lucide-react';
import { Sticker } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { PalmTree, BeachTag as HeatBeachTag, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import type { ViewfinderCameraHandle } from '../components/ViewfinderCamera';

// Heavy component lazy load
const ViewfinderCamera = lazy(() => import('../components/ViewfinderCamera'));

import { ProofCorrection } from '../components/ProofCorrection';

export default function CapturePage() {
  const [params] = useSearchParams();
  const challengeId = params.get('id');
  const navigate = useNavigate();
  const { 
    addEntry, 
    challenges, 
    incomingSnitch, 
    resolveIncomingSnitch, 
    isLocked, 
    user, 
    profile, 
    activeSignal,
    evaluateEntryProof,
    lastReview,
    clearReview
  } = useApp();
  const cameraRef = useRef<ViewfinderCameraHandle>(null);
  
  const challenge = challenges.find(c => c.id === challengeId) || challenges[0] || { id: 'unknown', title: 'Unknown Mission', category: 'DATA_ERR', points: 0, image: '', fullInstructions: '' };
  
  const [showChallengeSelector, setShowChallengeSelector] = useState(false);
  const availableChallenges = challenges.filter(c => c.status !== 'locked');
  
  const [step, setStep] = useState<'viewfinder' | 'developing' | 'review' | 'pending' | 'correction'>('viewfinder');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [developingCaption, setDevelopingCaption] = useState('Developing Proof...');
  const shouldReduceMotion = useReducedMotion();
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [delayCountdown, setDelayCountdown] = useState<number | null>(null);
  const { skin, frankieMode } = useTheme();

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  const onCapture = (img: string) => {
    setCapturedImage(img);
    setDevelopingCaption('Developing Proof...');
    setStep('developing');
  };

  useEffect(() => {
    if (step === 'developing') {
      const timer1 = setTimeout(() => setDevelopingCaption('Proof Ready.'), 2200);
      const timer2 = setTimeout(() => setStep('review'), 3000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [step]);

  const handleCaptureClick = () => {
    if (isUploading) return;
    setIsUploading(true);
    
    // Check for snitch delay
    const hasDelay = incomingSnitch?.type === 'delay';
    const captureTime = hasDelay ? 6000 : 500;

    if (hasDelay) {
      setDelayCountdown(6);
      const timer = setInterval(() => {
        setDelayCountdown(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
      }, 1000);
      setTimeout(() => clearInterval(timer), captureTime);
    }
    
    // Trigger capture from viewfinder
    setTimeout(() => {
      if (cameraRef.current) {
        cameraRef.current.capture();
      } else {
        // Fallback for demo if camera didn't load
        onCapture(challenge.image);
      }
      setIsUploading(false);
      setDelayCountdown(null);
    }, captureTime);
  };

  const handleSubmit = async (bypassReview = false) => {
    if (!user || !profile) return;

    if (!bypassReview) {
      setIsUploading(true);
      const review = await evaluateEntryProof({ note }, capturedImage!);
      setIsUploading(false);

      if (review.status === 'needsMoreProof' || review.status === 'rejected') {
        setStep('correction');
        return;
      }
    }

    // Check for extra-task snitch
    if (incomingSnitch?.type === 'extra-task' && note.length < 50) {
      alert("Bureau Weather Anomaly: Your field note is too concise for these conditions. (Min 50 chars)");
      return;
    }

    setStep('pending');

    try {
      const result = await addEntry({
        challengeId: challenge.id,
        proofImage: capturedImage!,
        note: note || 'A successful field trip entry.',
        crewId: profile.crewId
      });

      if (incomingSnitch) {
        resolveIncomingSnitch();
      }
      
    } catch (error) {
      console.error("Submission failed:", error);
      // Fallback UI or stay on review step
      setStep('review');
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans relative overflow-hidden",
      isBaja ? "bg-baja-sand text-baja-pink" : 
      isDiamond ? "bg-black text-white" :
      isHeat ? "bg-heat-yellow text-white" :
      "bg-black text-white"
    )}>
      {isBaja && (
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-baja-pink rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-baja-aqua rounded-full blur-[100px]" />
        </div>
      )}

      {isDiamond && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full liquid-chrome opacity-5" />
          <div className="absolute top-1/4 right-0 w-80 h-80 bg-white/10 rounded-full blur-[120px]" />
        </div>
      )}

      {isHeat && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-10 left-10 w-96 h-96 bg-heat-pink rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-heat-mango rounded-full blur-[100px]" />
        </div>
      )}

        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30 pointer-events-auto">
        <div className="space-y-1">
          <p className={cn("micro-label", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-white" : "text-brand-orange")}>
            {isBaja ? 'COASTAL SCAN' : isDiamond ? 'OPTICAL CALIBRATION' : isHeat ? 'PHOTO ROLL' : 'TACTICAL_LENS // SEC_EVIDENCE'}
          </p>
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
                <h2 className={cn("font-display text-xl uppercase tracking-tighter", (isBaja || isDiamond || isHeat) ? "text-inherit" : "text-white")}>LIVE_SIGNAL</h2>
             </div>
             
             {/* Challenge Selector Dropdown */}
             <div className="relative group">
                <button 
                  onClick={() => setShowChallengeSelector(!showChallengeSelector)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 border transition-all active:scale-95",
                    isBaja ? "bg-white text-baja-pink border-baja-pink" :
                    isDiamond ? "bg-white/10 text-white border-white/20 blur-bg" :
                    isHeat ? "bg-heat-pink text-white border-white" :
                    "bg-on-surface/10 text-white border-on-surface/20"
                  )}
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest">{challenge.title}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showChallengeSelector && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showChallengeSelector && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "absolute top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto z-50 shadow-2xl flex flex-col",
                        isBaja ? "bg-white border-2 border-baja-pink p-2 rounded-2xl" :
                        isDiamond ? "bg-black border border-white/20 p-1" :
                        isHeat ? "bg-heat-pink border-2 border-white p-2 rounded-xl" :
                        "bg-paper border border-on-surface/10 p-1"
                      )}
                    >
                      {availableChallenges.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            navigate(`/capture?id=${c.id}`, { replace: true });
                            setShowChallengeSelector(false);
                          }}
                          className={cn(
                            "text-left p-3 text-[10px] uppercase font-mono tracking-tighter transition-colors",
                            c.id === challenge.id ? 
                              (isBaja ? "bg-baja-pink text-white" : isDiamond ? "bg-white text-black" : isHeat ? "bg-white text-heat-pink" : "bg-brand-orange text-white") :
                              "hover:bg-on-surface/5"
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <span>{c.title}</span>
                            <span className="opacity-40">{c.points}XP</span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>
        <div className="text-right">
          <p className="micro-label opacity-40">TARGET_ID</p>
          <p className={cn("font-mono text-xs", (isBaja || isDiamond || isHeat) ? "text-inherit" : "text-white")}>FT-{challenge.id.toUpperCase()}-BUREAU</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'viewfinder' && (
          <motion.div 
            key="viewfinder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center p-6 relative z-10"
          >
            <div className={cn(
              "relative w-full max-w-md aspect-[3/4] overflow-hidden group transition-all",
              isBaja ? "border-[12px] border-white rounded-[3rem] shadow-[0_20px_50px_rgba(255,77,148,0.3)] bg-white/20" : 
              isDiamond ? "border-[1px] border-white/40 rounded-none bg-black ring-[12px] ring-white/5" :
              isHeat ? "border-[8px] border-white rounded-[2rem] shadow-[0_15px_40px_rgba(255,140,0,0.5)] bg-white/10" :
              "border-4 border-white/10 bg-black shadow-2xl"
            )}>
              {isLocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-on-surface/5 text-center">
                  <Lock className="w-12 h-12 mb-6 opacity-20" />
                  <h3 className="font-display text-2xl uppercase tracking-tighter mb-2">SYSTEM_LOCKED</h3>
                  <p className="micro-label opacity-40 max-w-xs">FIELD MISSIONS ARE RESTRICTED UNTIL PRE-SEASON CALIBRATION (MAY 25).</p>
                  <div className="mt-8 flex items-center gap-2 border border-brand-orange/40 rounded-full px-4 py-2">
                     <Calendar className="w-4 h-4 text-brand-orange" />
                     <span className="font-mono text-[10px] text-brand-orange uppercase tracking-[0.2em]">Deploy in 14D 02H</span>
                  </div>
                </div>
              ) : (
                <Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-on-surface/5">
                    <Camera className="w-12 h-12 opacity-10 animate-pulse" />
                  </div>
                }>
                  <ViewfinderCamera ref={cameraRef} onCapture={onCapture} />
                </Suspense>
              )}

              {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.3 : 0.4} />}
              
              {/* Bureau Viewfinder Overlays */}
              {!frankieMode && !isBaja && !isDiamond && !isHeat && (
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-brand-orange" />
                        <p className="font-mono text-[8px] text-white/60">LAT: 34.0522 N</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-brand-orange" />
                        <p className="font-mono text-[8px] text-white/60">LNG: 118.2437 W</p>
                      </div>
                    </div>
                    <div className="border border-white/20 p-1 px-2">
                      <p className="font-mono text-[8px] text-white/80">REC // 00:24:12</p>
                    </div>
                  </div>

                  {/* Crosshairs */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border border-white/5 rounded-full" />
                    <div className="w-16 h-px bg-white/20 absolute" />
                    <div className="h-16 w-px bg-white/20 absolute" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-48">
                      <div className="w-4 h-px bg-brand-orange" />
                      <div className="w-4 h-px bg-brand-orange" />
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-48">
                      <div className="h-4 w-px bg-brand-orange" />
                      <div className="h-4 w-px bg-brand-orange" />
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="font-mono text-[8px] text-brand-orange uppercase">SIGNAL_STRENGTH</p>
                      <div className="flex gap-1">
                        <div className="w-4 h-1 bg-brand-orange" />
                        <div className="w-4 h-1 bg-brand-orange" />
                        <div className="w-4 h-1 bg-brand-orange/20" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[8px] text-white/40">BUREAU_TACTICAL_LENS_v4.2</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Skin Overlays */}
              {!frankieMode && (
                <div className="absolute inset-0 pointer-events-none">
                  {isDiamond && (
                    <>
                      <div className="absolute inset-0 border border-white/10" />
                      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white/40" />
                      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white/40" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/20 rounded-full" />
                    </>
                  )}
                  {isHeat && (
                    <>
                      <div className="absolute top-6 left-6 flex flex-col gap-1">
                        <div className="w-10 h-4 bg-heat-pink border border-white flex items-center justify-center">
                          <span className="text-[8px] font-display text-white">REC</span>
                        </div>
                      </div>
                      <PalmTree className="absolute bottom-0 left-0 w-24 h-24 opacity-30 text-white" />
                    </>
                  )}
                  {isBaja && (
                    <>
                      <div className="absolute top-6 left-6 flex gap-2">
                        <ChromeStar className="w-4 h-4 opacity-100" />
                        <div className="w-2 h-2 rounded-full bg-baja-aqua animate-pulse" />
                      </div>
                      <Hibiscus className="absolute -bottom-10 -left-10 w-32 h-32 text-white/40" />
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-8 w-full max-w-md pt-8">
               {/* Pre-capture Field Note Input */}
               <div className="w-full px-4 group">
                  <div className={cn(
                    "relative flex items-start gap-3 p-4 transition-all duration-500",
                    isBaja ? "bg-white/80 backdrop-blur rounded-3xl border-2 border-baja-pink shadow-[8px_8px_0px_#40e0d0]" :
                    isDiamond ? "bg-white/5 border border-white/20 rounded-none h-24" :
                    isHeat ? "bg-white border-2 border-white rounded-[2rem] shadow-xl" :
                    "bg-on-surface/5 border border-white/10"
                  )}>
                    <MessageSquare className={cn("w-4 h-4 mt-1 shrink-0 opacity-40", (isBaja || isDiamond || isHeat) ? "text-inherit" : "text-brand-orange")} />
                    <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Input field notes here... specifics matter for Bureau audit."
                      className={cn(
                        "w-full h-16 bg-transparent outline-none resize-none text-xs leading-relaxed",
                        isDiamond ? "font-mono text-[10px]" : "font-serif italic"
                      )}
                    />
                    <div className="absolute -top-3 right-6">
                       <Sticker color={isBaja ? "orange" : isHeat ? "mustard" : isDiamond ? "mustard" : "white"} className="text-[7px]">
                         READY_FOR_ENTRY
                       </Sticker>
                    </div>
                  </div>
               </div>

               <div className="flex items-center gap-6 w-full px-4">
                  <button 
                    onClick={() => navigate(-1)} 
                    className={cn(
                        "p-4 rounded-full transition-all flex items-center justify-center shrink-0", 
                        isBaja ? "bg-white shadow-lg text-baja-pink" : 
                        isDiamond ? "bg-white text-black hover:scale-110" :
                        isHeat ? "bg-heat-pink text-white border-2 border-white shadow-lg hover:rotate-12" :
                        "bureau-btn-outline rounded-full w-14 h-14"
                    )}
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="flex-grow">
                    {!capturedImage ? (
                      <button 
                        onClick={handleCaptureClick}
                        disabled={isUploading || isLocked}
                        className={cn(
                          "w-full py-4 rounded-full transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 group font-display text-xl uppercase tracking-widest",
                          isBaja ? "bg-baja-pink text-white shadow-[0_8px_0px_#ff007f]" : 
                          isDiamond ? "bg-white text-black rounded-none shadow-[0_0_20px_rgba(255,255,255,0.4)]" :
                          isHeat ? "bg-white text-heat-pink shadow-lg border-2 border-heat-pink" :
                          "bg-brand-orange text-white"
                        )}
                      >
                        {isUploading ? (
                          <>CAPTURING <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" /></>
                        ) : (
                          <>CAPTURE EVIDENCE <Camera className="w-5 h-5" /></>
                        )}
                      </button>
                    ) : (
                      <button 
                        onClick={() => setStep('review')}
                        className={cn(
                          "w-full py-4 font-display text-xl tracking-widest uppercase transition-all flex items-center justify-center gap-3",
                          isBaja ? "bg-baja-pink text-white rounded-full shadow-[0px_8px_15px_#ff007f]" : 
                          isDiamond ? "bg-white text-black rounded-none" :
                          isHeat ? "bg-heat-pink text-white rounded-full border-4 border-white" :
                          "bg-white text-black"
                        )}
                      >
                        REVIEW ENTRY <Check className="w-6 h-6" />
                      </button>
                    )}
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {step === 'developing' && capturedImage && (
          <motion.div
            key="developing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center p-6 z-50 bg-black/60 backdrop-blur-md"
          >
            {/* WARM CREAM FLASH */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ 
                duration: shouldReduceMotion ? 0.4 : 0.8, 
                times: [0, 0.1, 1],
                ease: "easeOut"
              }}
              className="fixed inset-0 bg-[#FFF9F0] pointer-events-none z-[60]"
            />

            {/* POLAROID CARD */}
            <motion.div
               layoutId="proof-card"
               initial={shouldReduceMotion ? { scale: 1, y: 0 } : { scale: 0.8, y: 40, rotate: -2 }}
               animate={{ scale: 1, y: 0, rotate: 1 }}
               transition={{ type: "spring", damping: 20, stiffness: 100 }}
               className="bg-white p-4 pb-12 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] border border-on-surface/5"
            >
               <div className="aspect-square w-64 overflow-hidden relative bg-on-surface/5">
                  <motion.img 
                    src={capturedImage} 
                    alt="Developing Proof" 
                    className="w-full h-full object-cover"
                    initial={shouldReduceMotion ? { opacity: 1 } : { 
                      filter: 'grayscale(1) blur(12px) brightness(1.6) contrast(0.6)', 
                      opacity: 0.3,
                      scale: 1.1
                    }}
                    animate={{ 
                      filter: 'grayscale(0) blur(0px) brightness(1) contrast(1)', 
                      opacity: 1,
                      scale: 1
                    }}
                    transition={{ 
                      duration: 2.5, 
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.2
                    }}
                  />
                  {/* Subtle paper grain texture */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
               </div>
               
               <div className="mt-8 text-center space-y-2">
                  <motion.p 
                    key={developingCaption}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-mono text-[10px] uppercase font-bold tracking-[0.3em] text-on-surface"
                  >
                    {developingCaption}
                  </motion.p>
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: developingCaption === 'Proof Ready.' ? 1 : 0.6 }}
                    className="h-1 w-24 bg-brand-orange mx-auto origin-left"
                  />
               </div>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 1 }}
              className="mt-12 font-mono text-[8px] uppercase tracking-widest text-white"
            >
              Bureau_Data_Extraction_In_Progress...
            </motion.p>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div 
            key="review"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex-grow flex flex-col items-center p-6 pt-24 z-10 overflow-y-auto",
              isBaja ? "bg-baja-sand" : 
              isDiamond ? "bg-white/5 backdrop-blur-3xl" :
              isHeat ? "bg-heat-yellow" :
              "bg-paper"
            )}
          >
            <div className={cn(
              "w-full max-w-sm space-y-8 relative",
              isBaja ? "bg-white border-4 border-baja-pink rounded-[3rem] p-8 shadow-[15px_15px_0px_#40e0d0]" : 
              isDiamond ? "bg-white/5 border border-white/20 rounded-none p-8" :
              isHeat ? "bg-white border border-white rounded-[3.5rem] p-8 shadow-[20px_20px_0px_rgba(255,140,0,0.4)]" :
              ""
            )}>
              {/* Bureau Wrapper */}
              {!isBaja && !isDiamond && !isHeat && (
                <div className="notice-card p-0 overflow-visible">
                  <div className="file-tab">VALIDATION_FORM // FT-01-A</div>
                  <div className="p-8 space-y-8">
                     <motion.div 
                        layoutId="proof-card"
                        className="aspect-square evidence-frame rotate-1"
                      >
                       <img src={capturedImage!} alt="Proof" className="w-full h-full object-cover" />
                       <div className="evidence-label uppercase">TRANSMISSION_CAPTURE</div>
                     </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-6"
                   >
                        <div className="space-y-1">
                          <p className="micro-label text-brand-orange">RECORD_OBJECTIVE</p>
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="font-display text-3xl uppercase tracking-tighter leading-none text-on-surface">{challenge.title}</h3>
                            {activeSignal && (
                              <div className="bg-brand-orange/10 border border-brand-orange p-1 px-2 flex items-center gap-1 shrink-0 animate-pulse">
                                <Zap className="w-3 h-3 text-brand-orange" />
                                <span className="font-mono text-[8px] text-brand-orange font-bold">
                                  SIGNAL: {activeSignal.modifierType === 'multiplier' ? `x${activeSignal.pointModifier}` : `+${activeSignal.pointModifier}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                           <label className="micro-label flex justify-between">
                             <span>FIELD_JOURNAL_LOG</span>
                             {incomingSnitch?.type === 'extra-task' && <span className="text-error animate-pulse">DETAIL_REQ_50+</span>}
                           </label>
                           <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Document your findings... specifics matter for validation."
                            className="w-full h-32 bg-paper-dark border-2 border-on-surface/10 focus:border-brand-orange focus:outline-none p-4 font-serif text-lg text-on-surface"
                          />
                        </div>

                        {/* Bureau Specific Fields */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <p className="micro-label opacity-40">LOC_DESCRIPTOR</p>
                              <input 
                                type="text" 
                                placeholder="Sector 7G..." 
                                className="w-full bg-paper-dark border border-on-surface/10 p-2 font-mono text-[9px] uppercase outline-none focus:border-brand-orange"
                              />
                           </div>
                           <div className="space-y-1">
                              <p className="micro-label opacity-40">ATMOS_STABILITY</p>
                              <select className="w-full bg-paper-dark border border-on-surface/10 p-2 font-mono text-[9px] uppercase outline-none focus:border-brand-orange appearance-none">
                                <option>OPTIMAL</option>
                                <option>UNSTABLE</option>
                                <option>INTERFERENCE</option>
                                <option>CALIBRATED</option>
                              </select>
                           </div>
                        </div>

                        <div className="flex flex-col gap-3">
                           <button 
                             onClick={handleSubmit}
                             className="bureau-btn w-full"
                           >
                             DISPATCH_VALIDATION
                           </button>
                           <button 
                             onClick={() => { setCapturedImage(null); setStep('viewfinder'); }}
                             className="micro-label opacity-40 hover:opacity-100 transition-opacity"
                           >
                             SCRAP_AND_RETAKE
                           </button>
                        </div>
                  </motion.div>
                   </div>
                </div>
              )}

              {/* Skin Reviews */}
              {(isBaja || isDiamond || isHeat) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {(isBaja || isDiamond) && !frankieMode && <GlossOverlay opacity={isDiamond ? 0.2 : 0.3} />}
                  <Sticker color="black" className="absolute -top-4 -right-2 rotate-3 text-xs py-2 uppercase">
                    {isBaja ? 'GLAM APPROVED' : isDiamond ? 'DATA SYNCED' : isHeat ? 'WET LOOK' : 'VERIFIED PROOF'}
                  </Sticker>
                  
                  <motion.div 
                    layoutId="proof-card"
                    className={cn(
                      "aspect-square overflow-hidden shadow-lg",
                      isBaja ? "rounded-[2rem] border-white border-4 rotate-1" : 
                      isDiamond ? "rounded-none border-white/20 border-2" :
                      isHeat ? "rounded-[2.5rem] border-white border-4 rotate-[-3deg]" : ""
                    )}
                  >
                    <img src={capturedImage!} alt="Proof" className="w-full h-full object-cover" />
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <p className={cn("micro-label", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-heat-aqua" : "")}>
                        {isBaja ? 'Beach Mission' : isDiamond ? 'Calibration Target' : isHeat ? 'Splash Goal' : ''}
                      </p>
                      <h3 className={cn(
                        "font-display leading-none",
                        isBaja ? "text-4xl text-baja-pink uppercase" : 
                        isDiamond ? "text-4xl text-white font-mono uppercase tracking-[0.2em]" :
                        isHeat ? "text-4xl text-heat-pink uppercase" : ""
                      )}>{challenge.title}</h3>
                    </div>

                    <div className="space-y-2">
                      <label className="micro-label">{isBaja ? 'Beach Log Entry' : isDiamond ? 'SYNC LOG' : 'SPLASH JOURNAL'}</label>
                      <textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={isBaja ? "Spill the tea..." : isDiamond ? "INPUT DATA..." : "DESCRIBE..."}
                        className={cn(
                          "w-full h-32 bg-transparent border-2 focus:outline-none text-lg p-4",
                          isBaja ? "border-baja-aqua/40 focus:border-baja-aqua rounded-2xl font-serif" : 
                          isDiamond ? "border-white/10 focus:border-white rounded-none font-mono text-xs text-white" :
                          isHeat ? "border-white focus:border-heat-pink rounded-[2rem] font-display text-white" : ""
                        )}
                      />
                    </div>

                    <div className="flex flex-col gap-4">
                      <button 
                        onClick={handleSubmit}
                        className={cn(
                          "w-full py-5 font-display text-2xl tracking-widest uppercase shadow-2xl active:scale-95 transition-all outline-none",
                          isBaja ? "bg-baja-pink text-white rounded-full shadow-[0px_8px_0px_#ff007f]" : 
                          isDiamond ? "bg-white text-black rounded-none" :
                          isHeat ? "bg-heat-pink text-white rounded-full shadow-[0px_8px_0px_#cc0066] border-4 border-white" : ""
                        )}
                      >
                        {isBaja ? 'DISPATCH GLAM' : isDiamond ? 'SYNC DATA' : 'SPLASH'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {step === 'pending' && (
          <motion.div 
            key="pending"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex-grow flex flex-col items-center justify-center p-6 space-y-12 z-10",
              isBaja ? "bg-baja-sand" : 
              isDiamond ? "bg-black" :
              isHeat ? "bg-heat-yellow" :
              "bg-paper text-on-surface"
            )}
          >
            <div className="relative group w-full max-w-md">
               <div className={cn(
                 "text-center space-y-10 p-12 relative",
                 isBaja ? "bg-white border-baja-pink border-4 rounded-[3rem]" : 
                 isDiamond ? "bg-white/5 border-white/10 rounded-sm" :
                 isHeat ? "bg-white border-white rounded-[3.5rem] shadow-[15px_15px_0px_rgba(255,140,0,0.5)]" :
                 "bureau-panel border-dashed p-16"
               )}>
                  {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.3 : 0.4} />}
                  
                  <div className="relative mx-auto w-48 h-64">
                    <div className={cn(
                      "absolute inset-0 border-2 p-2 bg-white shadow-2xl",
                      isBaja ? "border-baja-aqua rotate-3" : 
                      isDiamond ? "border-white/40 rotate-0" :
                      isHeat ? "border-white rotate-[-5deg]" :
                      "border-brand-green rotate-3"
                    )}>
                      <img src={capturedImage!} alt="Entry" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <div className={cn(
                        "px-6 py-2 uppercase font-display text-4xl -rotate-12 bg-white/90 backdrop-blur-sm shadow-xl border-4",
                        isBaja ? "border-baja-pink text-baja-pink" : 
                        isDiamond ? "border-white text-black font-sans font-black italic" :
                        isHeat ? "border-heat-pink text-heat-pink italic" :
                        "border-brand-orange text-brand-orange"
                      )}>
                        {isBaja ? 'GLOSSING' : isDiamond ? 'CALIBRATING' : isHeat ? 'WAVES' : 'QUEUED'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className={cn(
                      "leading-none",
                      isBaja ? "text-5xl text-baja-pink font-display uppercase font-normal" : 
                      isDiamond ? "text-4xl text-white font-mono uppercase tracking-widest" :
                      isHeat ? "text-4xl text-heat-pink uppercase font-display" :
                      "font-display text-huge uppercase tracking-tighter text-on-surface"
                    )}>
                      {isBaja ? 'Vibe Sent' : isDiamond ? 'DATA TRANSMITTED' : isHeat ? 'SPLASH SENT' : 'TRANSMISSION_SENT'}
                    </h2>
                    <p className={cn("font-serif text-lg leading-relaxed px-4", (isBaja || isDiamond || isHeat) ? "text-inherit opacity-60" : "text-on-surface opacity-60 italic")}>
                      {isBaja ? "The beach council is reviewing your glam. Points incoming soon base babe." : 
                       isDiamond ? "The central prism is verifying your spectral data. Calibrating XP value." :
                       isHeat ? "The heatwave is rising. Check the list soon for your splash points." :
                       "Field evidence is currently being authenticated by Bureau personnel. Certified value will be issued upon validation."}
                    </p>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={() => navigate('/deck')}
                      className={cn(
                        "w-full py-5 font-display text-2xl tracking-widest uppercase transition-all shadow-lg active:scale-95",
                        isBaja ? "bg-baja-pink text-white rounded-full shadow-[0px_8px_0px_#ff007f] hover:translate-y-1 hover:shadow-none" : 
                        isDiamond ? "bg-white text-black rounded-none shadow-[10px_10px_0px_rgba(255,255,255,0.1)]" :
                        isHeat ? "bg-heat-pink text-white rounded-full shadow-[0px_8px_0px_#cc0066] border-4 border-white" :
                        "bureau-btn w-full"
                      )}
                    >
                      {isBaja ? 'BACK TO BEACH' : isDiamond ? 'RETURN TO BASE' : isHeat ? 'BACK TO POOL' : 'RETURN_TO_DISPATCH'}
                    </button>
                    <p className={cn("micro-label mt-6", (isBaja || isDiamond || isHeat) ? "text-inherit opacity-40" : "opacity-40")}>
                      SERIAL_{Math.floor(Math.random()*900000)+100000} // AUTH_PENDING
                    </p>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {step === 'correction' && lastReview && (
          <ProofCorrection 
            review={lastReview} 
            onRetry={() => {
               setStep('review');
               clearReview();
            }}
            onDone={() => {
               handleSubmit(true); // Bypass review on "submit anyway"
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
