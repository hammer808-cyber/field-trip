import { useState, useRef, Suspense, lazy, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Camera, X, Check, Upload, Lock, Calendar, ChevronDown, MessageSquare, Zap, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { Sticker, Card as UICard } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
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
    incomingSnitch, 
    resolveIncomingSnitch, 
    isLocked, 
    user, 
    profile, 
    activeSignal,
    lastReview,
    clearReview
  } = useApp();
  const cameraRef = useRef<ViewfinderCameraHandle>(null);
  
  const trip = trips.find(t => t.id === tripId) || trips[0] || { 
    id: 'unknown', 
    title: 'Unknown Mission', 
    type: 'Leave the House', 
    levels: { Scout: { points: 10, description: '' }, Explorer: { points: 20, description: '' }, Legend: { points: 35, description: '' } }, 
    image: '', 
    theAsk: '',
    status: 'active'
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
  const [developingCaption, setDevelopingCaption] = useState('Developing Proof...');
  const shouldReduceMotion = useReducedMotion();
  const [note, setNote] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'Scout' | 'Explorer' | 'Legend'>('Explorer');
  const [detourCompleted, setDetourCompleted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { skin, frankieMode } = useTheme();
  
  const isPlain = profile?.plainMode || frankieMode;
  const isReceipts = profile?.receiptsMode;

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  const onCapture = (data: any) => {
    setCaptureData(data);
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
          const review = await evaluateProof(user.uid, trip.id, trip.title, trip.theAsk, { note, receiptsMode: isReceipts }, captureData.originalImageUrl);
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
        crewId: profile.crewId,
        userId: user.uid,
        uploadSource: captureData.metadata.source,
        photoTakenAt: captureData.metadata.photoTakenAt || null,
        fileLastModifiedAt: captureData.metadata.fileLastModified ? new Date(captureData.metadata.fileLastModified).toISOString() : null,
        submittedAt: new Date().toISOString(),
        metadataStatus: captureData.metadata.metadataStatus,
        captureTrustLevel: captureData.trustLevel,
        filterUsed: captureData.filterId,
        filterIntensity: 1.0,
        reviewStatus: captureData.reviewStatus
      });

      setSubmissionStatus('submitted');
      if (incomingSnitch) resolveIncomingSnitch();
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
      "bg-black text-white"
    )}>
      {/* Backgrounds */}
      {isBaja && (
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-baja-pink rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-baja-aqua rounded-full blur-[100px]" />
        </div>
      )}
      {isDiamond && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-0 w-80 h-80 bg-white/10 rounded-full blur-[120px]" />
        </div>
      )}
      {isHeat && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-10 left-10 w-96 h-96 bg-heat-pink rounded-full blur-[100px]" />
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30 pointer-events-auto">
        <div className="space-y-1">
          {!isPlain && (
            <p className={cn("micro-label", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-white" : "text-brand-orange")}>
              {isBaja ? 'COASTAL SCAN' : isDiamond ? 'OPTICAL CALIBRATION' : isHeat ? 'PHOTO ROLL' : 'TACTICAL_LENS // SEC_EVIDENCE'}
            </p>
          )}
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-3">
                {!isPlain && <div className="w-2 h-2 rounded-full bg-error animate-pulse" />}
                <h2 className={cn("font-display text-xl uppercase tracking-tighter", isPlain && "text-4xl text-white drop-shadow-[4px_4px_0_black]")}>
                  {isPlain ? 'MISSION: CAPTURE' : 'LIVE_SIGNAL'}
                </h2>
             </div>
             
             <div className="relative group">
                <button 
                  onClick={() => setShowChallengeSelector(!showChallengeSelector)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 border transition-all active:scale-95",
                    isPlain ? "bg-white text-black border-4 border-black" :
                    isBaja ? "bg-white text-baja-pink border-baja-pink" :
                    isDiamond ? "bg-white/10 text-white border-white/20 blur-bg" :
                    isHeat ? "bg-heat-pink text-white border-white" :
                    "bg-on-surface/10 text-white border-on-surface/20"
                  )}
                >
                  <span className={cn("font-mono text-[10px] uppercase tracking-widest", isPlain && "text-sm font-display")}>{trip.title}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showChallengeSelector && "rotate-180")} />
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
              "border-4 border-white/10 bg-black shadow-2xl"
            )}>
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-on-surface/5"><Camera className="w-12 h-12 opacity-10 animate-pulse" /></div>}>
                <ViewfinderCamera challenge={trip} ref={cameraRef} onCapture={onCapture} />
              </Suspense>
              {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.3 : 0.4} />}
            </div>

            {/* UI Actions */}
            <div className="flex items-center gap-6 w-full max-w-md pt-8 px-4">
              <button 
                onClick={() => navigate(-1)} 
                className="p-4 rounded-full bg-white/10 border border-white/20 text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <button 
                onClick={handleCaptureClick}
                disabled={isUploading || isLocked}
                className={cn(
                  "flex-grow py-4 rounded-full font-display text-xl uppercase tracking-widest transition-all",
                  isBaja ? "bg-baja-pink text-white" : isDiamond ? "bg-white text-black" : isHeat ? "bg-heat-pink text-white" : "bg-brand-orange text-white"
                )}
              >
                {isUploading ? 'CAPTURING...' : 'CAPTURE EVIDENCE'}
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
            className="flex-grow flex flex-col items-center justify-center p-6 z-50 bg-black/60 backdrop-blur-md"
          >
             <motion.div layoutId="proof-card" className="bg-white p-4 pb-12 shadow-2xl">
                <div className="aspect-square w-64 overflow-hidden relative bg-on-surface/5">
                   <motion.img 
                     src={captureData.filteredImageUrl} 
                     alt="Developing Proof" 
                     className="w-full h-full object-cover"
                     initial={{ filter: 'grayscale(1) blur(12px) brightness(1.6)', opacity: 0.3 }}
                     animate={{ filter: 'grayscale(0) blur(0px) brightness(1)', opacity: 1 }}
                     transition={{ duration: 2.5 }}
                   />
                </div>
                <div className="mt-8 text-center space-y-2">
                   <p className="font-mono text-[10px] uppercase font-bold tracking-[0.3em] text-on-surface">{developingCaption}</p>
                   <div className="h-1 w-24 bg-brand-orange mx-auto" />
                </div>
             </motion.div>
          </motion.div>
        )}

        {step === 'review' && captureData && (
          <motion.div 
            key="review"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-grow flex flex-col items-center p-6 pt-24 z-10 overflow-y-auto bg-paper"
          >
            <div className="w-full max-w-sm space-y-8">
               <div className="notice-card p-0 overflow-visible relative">
                  <div className="file-tab">VALIDATION_FORM // FT-01-A</div>
                  <div className="p-8 space-y-8">
                     <motion.div layoutId="proof-card" className="aspect-square evidence-frame rotate-1">
                       <img src={captureData.filteredImageUrl} alt="Proof" className="w-full h-full object-cover" />
                       <div className="evidence-label uppercase">CAPTURE_SOURCE: {captureData.metadata.source}</div>
                     </motion.div>
                     
                     {/* Metadata Trust Banner */}
                     <div className={cn(
                       "flex items-center gap-3 p-4 border",
                       captureData.trustLevel === 'live' ? "bg-green-500/10 border-green-500/50 text-green-500" :
                       captureData.trustLevel === 'verifiedCameraRoll' ? "bg-blue-500/10 border-blue-500/50 text-blue-500" :
                       "bg-brand-orange/10 border-brand-orange/50 text-brand-orange"
                     )}>
                       {captureData.trustLevel === 'live' ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                       <div className="flex flex-col">
                         <span className="font-mono text-[10px] font-bold uppercase">{captureData.trustLevel.replace(/([A-Z])/g, '_$1')}</span>
                         <span className="text-[8px] opacity-80">{captureData.message || (captureData.trustLevel === 'live' ? "Direct camera capture verified." : "Metadata authenticity check required.")}</span>
                       </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-1">
                          <p className="micro-label text-brand-orange">RECORD_OBJECTIVE</p>
                          <h3 className="font-display text-3xl uppercase tracking-tighter leading-none text-on-surface">{trip.title}</h3>
                        </div>

                        <div className="space-y-4">
                          <p className="micro-label">SELECT_INTENSITY</p>
                          <div className="grid grid-cols-3 gap-2">
                             {(['Scout', 'Explorer', 'Legend'] as const).map(level => (
                               <button
                                 key={level}
                                 onClick={() => setSelectedLevel(level)}
                                 className={cn(
                                   "p-2 border transition-all text-center",
                                   selectedLevel === level ? "border-brand-orange bg-brand-orange text-white" : "border-on-surface/10 bg-on-surface/5 text-on-surface hover:border-brand-orange/40"
                                 )}
                               >
                                 <div className="text-[8px] font-bold uppercase">{level}</div>
                                 <div className="text-[10px] font-mono leading-none">+{trip.levels[level]?.points}</div>
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                           <label className="micro-label">FIELD_JOURNAL_LOG</label>
                           <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Document your findings..."
                            className="w-full h-32 bg-paper-dark border-2 border-on-surface/10 focus:border-brand-orange focus:outline-none p-4 font-serif text-lg text-on-surface"
                          />
                        </div>

                        <div className="flex flex-col gap-3">
                           <button onClick={() => handleSubmit()} className="bureau-btn w-full">DISPATCH_VALIDATION</button>
                           <button onClick={() => { setCaptureData(null); setStep('viewfinder'); }} className="micro-label opacity-40 hover:opacity-100">SCRAP_AND_RETAKE</button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {step === 'pending' && captureData && (
          <motion.div 
            key="pending"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-grow flex flex-col items-center justify-center p-6 space-y-12 z-10 bg-paper text-on-surface"
          >
            <div className="relative group w-full max-w-md">
               <div className="bureau-panel border-dashed p-16 text-center space-y-10">
                  <div className="relative mx-auto w-48 h-64">
                    <div className="absolute inset-0 border-2 p-2 bg-white shadow-2xl border-brand-green rotate-3">
                      <img src={captureData.filteredImageUrl} alt="Entry" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="font-display text-huge uppercase tracking-tighter text-on-surface">
                      {submissionStatus === 'submitted' ? 'TRANSMISSION_SENT' : 'DISPATCHING...'}
                    </h2>
                    <p className="font-serif text-lg leading-relaxed px-4 opacity-70 italic">
                      {submissionStatus === 'submitted' ? "Your evidence has been dispatched to the Bureau." : "Uplink protocols active. Please wait."}
                    </p>
                  </div>
                  <div className="pt-6">
                    <button onClick={() => navigate('/deck')} className="bureau-btn w-full">RETURN_TO_DISPATCH</button>
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
