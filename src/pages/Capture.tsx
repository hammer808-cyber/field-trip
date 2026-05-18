import { useState, useRef, Suspense, lazy, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Camera, X, Check, Upload, Lock, Calendar, ChevronDown, MessageSquare, Zap, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { Sticker, Card as UICard } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { cn, safeToDate } from '../lib/utils';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { PalmTree, BeachTag as HeatBeachTag, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import type { ViewfinderCameraHandle } from '../components/ViewfinderCamera';
import { evaluateProof } from '../services/proofService';
import { uploadBase64Image } from '../services/storageService';
import { getGlobalConfig } from '../services/configService';

// Heavy component lazy load
const ViewfinderCamera = lazy(() => import('../components/ViewfinderCamera'));

import { ProofCorrection } from '../components/ProofCorrection';

export default function CapturePage() {
  const [params] = useSearchParams();
  const tripId = params.get('id');
  const navigate = useNavigate();
  const { 
    addEntry, 
    trips, 
    incomingFieldCheck, 
    resolveIncomingFieldCheck, 
    isLocked, 
    user, 
    profile, 
    activeSignal,
    lastReview,
    clearReview
  } = useApp();
  const cameraRef = useRef<ViewfinderCameraHandle>(null);
  const { skin, frankieMode, fc } = useTheme();
  
  const trip = trips.find(t => t.id === tripId) || trips[0] || { 
    id: 'unknown', 
    title: 'Unknown Mission', 
    type: 'Leave the House', 
    levels: { Standard: { points: 10, description: '' }, Advanced: { points: 20, description: '' }, Certified: { points: 35, description: '' } }, 
    image: '', 
    description: '',
    theAsk: '',
    status: 'active',
    baseXP: 100,
    difficulty: 1,
    proofType: ['photo']
  };
  
  const [showChallengeSelector, setShowChallengeSelector] = useState(false);
  const availableTrips = trips.filter(t => t.status !== 'locked');
  
  const [step, setStep] = useState<'viewfinder' | 'developing' | 'review' | 'pending' | 'correction'>('viewfinder');
  const [submissionStatus, setSubmissionStatus] = useState<'ready' | 'saving' | 'syncing' | 'submitted' | 'retry'>('ready');
  const [captureData, setCaptureData] = useState<{
    originalImageUrl: string;
    filteredImageUrl: string;
    metadata: any;
    trustLevel: string;
    filterId: string;
    reviewStatus: string;
    message?: string;
  } | null>(null);
  const [developingCaption, setDevelopingCaption] = useState('Developing...');
  const shouldReduceMotion = useReducedMotion();
  const [note, setNote] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'Standard' | 'Advanced' | 'Certified'>('Advanced');
  const [detourCompleted, setDetourCompleted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const isPlain = profile?.plainMode || frankieMode;
  const isReceipts = profile?.receiptsMode;

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  const onCapture = (data: any) => {
    setCaptureData(data);
    setDevelopingCaption('Developing...');
    setStep('developing');
  };

  useEffect(() => {
    if (step === 'developing') {
      const timer1 = setTimeout(() => setDevelopingCaption('Ready.'), 2200);
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
    
    // Trigger capture from viewfinder
    setTimeout(() => {
      if (cameraRef.current) {
        cameraRef.current.capture();
      } else {
        // Fallback for demo
        onCapture({
          originalImageUrl: trip.image,
          filteredImageUrl: trip.image,
          metadata: { source: 'camera', metadataStatus: 'verified' },
          trustLevel: 'live',
          filterId: 'original',
          reviewStatus: 'approved'
        });
      }
      setIsUploading(false);
    }, 500);
  };

  const handleSubmit = async (bypassReview = false) => {
    if (!user || !profile || !captureData || isUploading) return;

    setSubmissionStatus('saving');
    setIsUploading(true);

    try {
      if (!bypassReview) {
        try {
          const review = await evaluateProof(
            user.uid, 
            trip.id, 
            trip.title, 
            trip.description || trip.theAsk || '', 
            { note, receiptsMode: isReceipts }, 
            captureData.originalImageUrl
          );
          if (review.status === 'needsMoreProof' || review.status === 'rejected') {
            setStep('correction');
            setIsUploading(false);
            return;
          }
        } catch (error: any) {
          console.warn("Evaluation uplink unstable:", error.message);
        }
      }

      setStep('pending');
      setSubmissionStatus('syncing');

      // Upload both original and filtered images
      const now = Date.now();
      const [{ url: originalUrl }, { url: filteredUrl }] = await Promise.all([
        uploadBase64Image(user.uid, 'proofs/original', `orig_${now}.jpg`, captureData.originalImageUrl),
        uploadBase64Image(user.uid, 'proofs/filtered', `filt_${now}.jpg`, captureData.filteredImageUrl)
      ]);
      
      await addEntry({
        tripId: trip.id,
        proofImage: filteredUrl,
        originalImageUrl: originalUrl,
        filteredImageUrl: filteredUrl,
        fieldNote: note || 'A successful field trip entry.',
        selectedLevel,
        detourCompleted,
        crewId: profile.crewId || undefined,
        userId: user.uid,
        uploadSource: captureData.metadata.source,
        photoTakenAt: captureData.metadata.photoTakenAt || null,
        fileLastModifiedAt: (() => {
          const d = safeToDate(captureData.metadata.fileLastModified);
          return d ? d.toISOString() : null;
        })(),
        submittedAt: new Date().toISOString(),
        metadataStatus: captureData.metadata.metadataStatus,
        captureTrustLevel: captureData.trustLevel as any,
        filterUsed: captureData.filterId,
        filterIntensity: 1.0,
        reviewStatus: captureData.reviewStatus as any
      });

      setSubmissionStatus('submitted');
      if (incomingFieldCheck) resolveIncomingFieldCheck();
      setIsUploading(false);
    } catch (error: any) {
      console.error("Submission fatal error:", error);
      setIsUploading(false);
      setSubmissionStatus('retry');
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-sans relative overflow-hidden",
      isBaja ? "bg-baja-sand text-baja-pink" : 
      isDiamond ? "bg-black text-white" :
      isHeat ? "bg-heat-yellow text-white" :
      "bg-white"
    )}>
      {/* Backgrounds */}
      {!isPlain && !isBaja && !isDiamond && !isHeat && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
             style={{ 
               backgroundImage: 'linear-gradient(var(--color-on-surface) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-on-surface) 1.5px, transparent 1.5px)', 
               backgroundSize: '48px 48px' 
             }} 
        />
      )}
      {/* High-Voltage HUD / Scanline Overlay */}
      {!isPlain && !isBaja && !isDiamond && !isHeat && (
        <div className="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.015)_50%)] bg-[length:100%_3px] opacity-10" />
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30 pointer-events-auto">
        <div className="space-y-4">
          {!isPlain && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-brand-lime shadow-[0_0_8px_var(--color-brand-lime)]" />
              <p className={cn("micro-label font-bold tracking-wider italic", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-white" : "text-brand-lime")}>
                {isBaja ? 'COASTAL SNAP' : isDiamond ? 'OPTICAL CALIBRATION' : isHeat ? 'PHOTO ROLL' : fc('ACTIVE SIGNAL // PHOTO MODE', 'READY')}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4 bg-on-surface text-white p-5 border-4 border-white/20 shadow-[10px_10px_0px_black] rotate-[-1deg]">
                {!isPlain && (
                  <div className="flex flex-col gap-1.5">
                    <div className="w-6 h-1.5 bg-brand-orange animate-pulse" />
                    <div className="w-3 h-1.5 bg-brand-orange opacity-40" />
                  </div>
                )}
                <h2 className={cn("font-display text-5xl uppercase tracking-tight leading-tight italic font-bold", isPlain && "drop-shadow-[4px_4px_0_black]")}>
                  {isPlain ? fc('PHOTO', 'TAKE PHOTO') : fc('PHOTO', 'PHOTO')}
                </h2>
             </div>
             
             <div className="relative group">
                <button 
                  onClick={() => setShowChallengeSelector(!showChallengeSelector)}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 border-4 transition-all active:scale-95 shadow-[8px_8px_0px_black] italic",
                    isPlain ? "bg-white text-black border-black" :
                    isBaja ? "bg-white text-baja-pink border-baja-pink" :
                    isDiamond ? "bg-white/10 text-white border-white/20 blur-bg" :
                    isHeat ? "bg-heat-pink text-white border-white" :
                    "bg-brand-lime text-on-surface border-on-surface font-bold"
                  )}
                >
                  <span className={cn("font-bold text-sm uppercase tracking-wider", isPlain && "text-xl font-display")}>{trip.title}</span>
                  <ChevronDown className={cn("w-5 h-5 transition-transform text-on-surface/60 stroke-[3]", showChallengeSelector && "rotate-180")} />
                </button>
             </div>
          </div>
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
              isPlain ? "border-8 border-white rounded-none shadow-none bg-paper" :
              isBaja ? "border-[12px] border-white rounded-[3rem] shadow-[0_20px_50px_rgba(255,77,148,0.3)] bg-white/20" : 
              isDiamond ? "border-[1px] border-white/40 rounded-none bg-black ring-[12px] ring-white/5" :
              isHeat ? "border-[8px] border-white rounded-[2rem] shadow-[0_15px_40px_rgba(255,140,0,0.5)] bg-white/10" :
              "border-4 border-on-surface bg-black shadow-[32px_32px_0px_rgba(0,0,0,0.15)] rounded-sm"
            )}>
              {/* Corner Brackets for High Voltage */}
              {!isBaja && !isDiamond && !isHeat && (
                <>
                  <div className="absolute top-6 left-6 w-16 h-16 border-t-8 border-l-8 border-brand-lime z-40 opacity-90 shadow-[0_0_15px_var(--color-brand-lime)]" />
                  <div className="absolute top-6 right-6 w-16 h-16 border-t-8 border-r-8 border-brand-lime z-40 opacity-90 shadow-[0_0_15px_var(--color-brand-lime)]" />
                  <div className="absolute bottom-6 left-6 w-16 h-16 border-b-8 border-l-8 border-brand-lime z-40 opacity-90 shadow-[0_0_15px_var(--color-brand-lime)]" />
                  <div className="absolute bottom-6 right-6 w-16 h-16 border-b-8 border-r-8 border-brand-lime z-40 opacity-90 shadow-[0_0_15px_var(--color-brand-lime)]" />
                  
                  {/* Rec Indicator */}
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-on-surface px-6 py-2.5 rounded-none z-40 shadow-[6px_6px_0px_var(--color-brand-orange)] border-2 border-white/20">
                    <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-[11px] font-mono text-white font-bold tracking-widest italic">{fc('LENS_ACTIVE', 'CAMERA LIVE')}</span>
                  </div>
                </>
              )}
              
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-on-surface/5"><Camera className="w-12 h-12 opacity-10 animate-pulse" /></div>}>
                <ViewfinderCamera challenge={trip} ref={cameraRef} onCapture={onCapture} />
              </Suspense>
              {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.3 : 0.4} />}
            </div>

            {/* UI Actions */}
            <div className="flex items-center gap-8 w-full max-w-md pt-12 px-6">
              <button 
                onClick={() => navigate(-1)} 
                className="p-6 rounded-none bg-white border-4 border-on-surface text-on-surface hover:bg-brand-lime transition-all shadow-[8px_8px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <X className="w-8 h-8 stroke-[4]" />
              </button>
              <button 
                onClick={handleCaptureClick}
                disabled={isUploading || isLocked}
                className={cn(
                  "flex-grow py-8 rounded-none font-display text-3xl uppercase tracking-tight transition-all shadow-[16px_16px_0px_black] active:translate-x-2 active:translate-y-2 active:shadow-none overflow-hidden relative font-bold italic",
                  isBaja ? "bg-baja-pink text-white" : isDiamond ? "bg-white text-black" : isHeat ? "bg-heat-pink text-white" : "bg-brand-orange text-white border-4 border-on-surface hover:bg-on-surface"
                )}
              >
                <span className="relative z-10">{isUploading ? fc('PROCESSING...', 'PROCESSING...') : fc('TAKE PHOTO', 'TAKE PHOTO')}</span>
                {!isBaja && !isDiamond && !isHeat && (
                   <div className="absolute top-0 right-0 w-24 h-full bg-white/20 -skew-x-12 translate-x-8" />
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'developing' && captureData && (
          <motion.div
            key="developing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center p-6 z-50 bg-on-surface/90 backdrop-blur-2xl"
          >
             <motion.div layoutId="proof-card" className="bg-white p-6 pb-16 shadow-[24px_24px_0px_black] border-2 border-black max-w-xs w-full">
                <div className="aspect-[3/4] w-full overflow-hidden relative bg-paper-dark border-2 border-on-surface">
                   <motion.img 
                     src={captureData.filteredImageUrl} 
                     alt="Developing Proof" 
                     className="w-full h-full object-cover grayscale brightness-125 contrast-150"
                     initial={{ filter: 'grayscale(1) blur(12px) brightness(1.6)', opacity: 0.3 }}
                     animate={{ filter: 'grayscale(0) blur(0px) brightness(1)', opacity: 1 }}
                     transition={{ duration: 2.5 }}
                   />
                   {/* Prism Overlay for nightlife look */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-brand-lime/10 via-transparent to-brand-magenta/10 mix-blend-overlay pointer-events-none" />
                </div>
                <div className="mt-10 text-left space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="h-1 flex-grow bg-brand-orange" />
                      <p className="font-mono text-[10px] uppercase font-black tracking-[0.4em] text-on-surface">{developingCaption}</p>
                   </div>
                   <div className="flex justify-between items-center opacity-40">
                      <span className="text-[8px] font-mono">UPLINK_01</span>
                      <span className="text-[8px] font-mono">EST_TIME: 2.4s</span>
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}

        {step === 'review' && captureData && (
          <motion.div 
            key="review"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-grow flex flex-col items-center p-6 pt-32 z-10 overflow-y-auto bg-white"
          >
            <div className="w-full max-w-md space-y-12">
               <div className="bg-white border-4 border-on-surface shadow-[24px_24px_0px_black] overflow-visible relative">
                  <div className="absolute -top-6 left-8 bg-brand-lime text-on-surface px-6 py-3 text-[12px] font-bold uppercase tracking-wider border-4 border-on-surface shadow-[8px_8px_0px_black] italic">PROOF // VERIFIED</div>
                  <div className="p-10 pt-16 space-y-12">
                     <motion.div layoutId="proof-card" className="aspect-square bg-paper-dark border-4 border-on-surface shadow-[16px_16px_0px_var(--color-brand-magenta)] relative overflow-hidden rotate-[-1deg]">
                       <img src={captureData.filteredImageUrl} alt="Proof" className="w-full h-full object-cover sepia-[0.1] contrast-125 brightness-110" />
                       <div className="absolute bottom-0 left-0 w-full bg-on-surface text-brand-lime p-4 font-mono text-[11px] uppercase tracking-tight italic font-bold">SIGNAL_SOURCE: {captureData.metadata.source} // LATENCY_{Math.round(Math.random() * 20)}ms</div>
                       
                       {/* Scanner line detail */}
                       <div className="absolute inset-x-0 h-2 bg-brand-lime opacity-30 top-1/2 animate-scan pointer-events-none" />
                     </motion.div>
                     
                     {/* Metadata Trust Banner */}
                     <div className={cn(
                       "flex items-center gap-6 p-6 border-4 shadow-[8px_8px_0px_black] italic",
                       captureData.trustLevel === 'live' ? "bg-brand-lime/10 border-brand-lime text-on-surface" :
                       captureData.trustLevel === 'verifiedCameraRoll' ? "bg-brand-cyan/10 border-brand-cyan text-on-surface" :
                       "bg-brand-orange/10 border-brand-orange text-on-surface"
                     )}>
                       <div className={cn("p-3 border-4 shadow-[4px_4px_0px_black]", 
                         captureData.trustLevel === 'live' ? "bg-brand-lime border-on-surface" :
                         "bg-white border-on-surface"
                       )}>
                         {captureData.trustLevel === 'live' ? <ShieldCheck className="w-8 h-8 text-on-surface stroke-[3]" /> : <AlertCircle className="w-8 h-8 text-on-surface stroke-[3]" />}
                       </div>
                       <div className="flex flex-col gap-1">
                         <span className="font-black text-sm uppercase tracking-[0.3em]">{captureData.trustLevel.toUpperCase()}</span>
                         <span className="text-[11px] opacity-60 font-serif italic leading-tight font-bold">{captureData.message || (captureData.trustLevel === 'live' ? "Photo verified for field trip." : "Legacy data detected. Subject to audit.")}</span>
                       </div>
                     </div>

                     <div className="space-y-10">
                        <div className="space-y-6 border-l-8 border-brand-orange pl-8">
                          <p className="text-[12px] font-bold tracking-wider opacity-50 uppercase italic">ACTIVE_MISSION_TARGET</p>
                          <h3 className="font-display text-5xl md:text-6xl uppercase tracking-tight leading-tight text-on-surface font-bold italic">{trip.title}</h3>
                        </div>

                        <div className="space-y-6 bg-paper-dark p-8 border-4 border-on-surface shadow-[10px_10px_0px_black] italic">
                          <p className="text-[11px] font-black tracking-[0.3em] uppercase opacity-60">CHOOSE_SIGNAL_INTENSITY</p>
                          <div className="grid grid-cols-3 gap-6">
                             {(['Standard', 'Advanced', 'Certified'] as const).map(level => (
                               <button
                                 key={level}
                                 onClick={() => setSelectedLevel(level)}
                                 className={cn(
                                   "p-4 border-4 transition-all text-center shadow-[4px_4px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 font-black",
                                   selectedLevel === level ? "border-on-surface bg-brand-orange text-white" : "border-on-surface/20 bg-white text-on-surface hover:border-brand-orange"
                                 )}
                               >
                                 <div className="text-[10px] uppercase tracking-tighter italic">{level}</div>
                                 <div className="text-[13px] font-mono leading-none mt-2 italic">
                                   +{trip.levels?.[level]?.points || Math.round((trip.baseXP || trip.basePoints || 100) * (level === 'Standard' ? 1 : level === 'Advanced' ? 1.5 : 2))}
                                 </div>
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-4 group">
                           <label className="text-[12px] font-bold tracking-wider uppercase flex items-center gap-4 italic">
                             <MessageSquare className="w-5 h-5 text-brand-orange stroke-[3]" />
                             FIELD_NOTE
                           </label>
                           <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Describe the vibe landscape with confidence..."
                            className="w-full h-40 bg-white border-4 border-on-surface focus:border-brand-magenta focus:ring-0 focus:outline-none p-6 font-serif text-2xl text-on-surface shadow-inner italic font-medium placeholder:opacity-30"
                          />
                        </div>

                        <div className="flex flex-col gap-6 pt-4">
                           <button onClick={() => handleSubmit()} className="w-full py-10 bg-brand-orange text-white font-display text-4xl uppercase tracking-tight border-4 border-on-surface shadow-[16px_16px_0px_black] active:shadow-none active:translate-x-2 active:translate-y-2 transition-all font-bold italic hover:bg-on-surface">{fc('SEND_PHOTO', 'SEND PHOTO')}</button>
                           <button onClick={() => { setCaptureData(null); setStep('viewfinder'); }} className="text-[12px] font-bold uppercase tracking-wider text-on-surface opacity-40 hover:opacity-100 hover:text-error flex items-center justify-center gap-4 transition-all italic">
                             <X className="w-5 h-5 stroke-[4]" />
                             CANCEL_AND_RESET
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
               
               {/* Footer security badge */}
               <div className="flex justify-center items-center gap-4 py-8">
                  <div className="h-[2px] w-12 bg-on-surface/10" />
                  <span className="text-[8px] font-mono opacity-30 select-none">BUREAU_ENCRYPTION_ACTIVE // 4096_BIT</span>
                  <div className="h-[2px] w-12 bg-on-surface/10" />
               </div>
            </div>
          </motion.div>
        )}

        {step === 'pending' && captureData && (
          <motion.div 
            key="pending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-grow flex flex-col items-center justify-center p-6 space-y-16 z-10 bg-white text-on-surface"
          >
            <div className="relative group w-full max-w-lg">
               <div className="bg-white border-4 border-on-surface shadow-[32px_32px_0px_black] p-16 text-center space-y-16 relative overflow-hidden">
                  {/* Decorative prisms */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-brand-lime opacity-10 rotate-45 translate-x-24 -translate-y-24" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-magenta opacity-10 rotate-45 -translate-x-24 translate-y-24" />
                  
                  <div className="relative mx-auto w-64 h-80">
                    <div className="absolute inset-0 border-8 p-4 bg-paper-dark shadow-[20px_20px_0px_rgba(0,0,0,0.1)] border-on-surface rotate-6 transition-transform group-hover:rotate-12">
                      <img src={captureData.filteredImageUrl} alt="Entry" className="w-full h-full object-cover grayscale brightness-110 contrast-125" />
                    </div>
                    {/* Approved Stamp overlay look */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-20 border-8 border-brand-orange text-brand-orange flex items-center justify-center font-display text-4xl uppercase tracking-[0.2em] rotate-[-15deg] bg-white shadow-[8px_8px_0px_black] z-20 font-black italic">
                      SENT
                    </div>
                  </div>
                  <div className="space-y-8 pt-12">
                    <h2 className="font-display text-7xl md:text-8xl uppercase tracking-tighter text-on-surface leading-[0.7] font-black italic">
                      {submissionStatus === 'submitted' ? 'SUCCESS' : 'TRANSMITTING'}
                    </h2>
                    <div className="h-2 w-32 bg-brand-orange mx-auto shadow-[0_0_10px_var(--color-brand-orange)]" />
                    <p className="font-serif text-2xl leading-relaxed px-6 opacity-80 italic font-medium">
                      {submissionStatus === 'submitted' ? "Your field proof has been encrypted and synced with Fieldtrip HQ." : "Stabilizing transmission signal. Documenting parameters. Please hold position."}
                    </p>
                  </div>
                  <div className="pt-10">
                    <button onClick={() => navigate('/deck')} className="w-full py-6 bg-on-surface text-white font-display text-3xl uppercase tracking-tighter shadow-[12px_12px_0px_var(--color-brand-lime)] active:shadow-none active:translate-x-2 active:translate-y-2 transition-all font-black italic hover:bg-brand-orange">DASHBOARD</button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {step === 'correction' && lastReview && (
          <ProofCorrection 
            review={lastReview} 
            onRetry={() => { setStep('review'); clearReview(); }}
            onDone={() => { handleSubmit(true); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
