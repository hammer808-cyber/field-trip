import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronUp, 
  ChevronDown, 
  ExternalLink, 
  HelpCircle,
  Play,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTrevorGuideState, TrevorGuideAction } from '../logic/trevorLogic';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export function FieldGuideAssist() {
  const { 
    user, 
    profile, 
    activeTrip, 
    onboardingCompleted,
    starterApprovedCount,
    starterState,
    submittedPendingChallengeIds,
    needsMoreProofChallengeIds,
    rejectedChallengeIds,
    isFeatureEnabled,
    fieldGuideAssistEnabled,
    isReviewWindowOpen,
    isVotingWindowOpen,
    activeSeason,
    isAdmin,
    isHeatwaveDeckUnlocked,
    isSocalSummerUnlocked,
    hasConfirmedLegal
  } = useApp();
  
  const { skin } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewState, setHasNewState] = useState(false);
  
  const currentRoute = location.pathname;

  // Derive counts from sets for Trevor
  const pendingReviewCount = submittedPendingChallengeIds.size;
  const needsMoreProofCount = needsMoreProofChallengeIds.size;
  const rejectedCount = rejectedChallengeIds.size;
  
  const currentWeekNumber = useApp().currentWeekNumber;
  const currentWeek = activeSeason ? activeSeason.weeks.find(w => w.number === currentWeekNumber) : null;
  const isVotingOpen = isVotingWindowOpen(currentWeekNumber);

  // ACTIONABLE PROOF RESOLVER for Onboarding
  const actionableStarterProof = starterState.needsMoreProofMissionId && starterState.needsMoreProofEntryId
    ? { id: starterState.needsMoreProofEntryId, missionId: starterState.needsMoreProofMissionId, status: 'needs_more_proof' }
    : starterState.rejectedMissionId && starterState.rejectedEntryId
      ? { id: starterState.rejectedEntryId, missionId: starterState.rejectedMissionId, status: 'rejected' }
      : null;

  const trevorState = getTrevorGuideState({
    currentRoute,
    user,
    profile,
    activeMission: activeTrip,
    starterApprovedCount,
    starterPendingCount: pendingReviewCount,
    starterSubmittedUniqueCount: starterState.submittedUniqueCount,
    needsMoreProofCount,
    rejectedCount,
    actionableStarterProof,
    legalComplete: hasConfirmedLegal,
    personaComplete: !!profile?.fieldClassificationComplete,
    canUseHeatwaveDeck: isHeatwaveDeckUnlocked,
    canUseSocalSummerDeck: isSocalSummerUnlocked,
    onboardingCompleted,
    hasActiveMission: !!activeTrip,
    isVotingOpen,
  });

  // Track state changes to highlight Trevor
  useEffect(() => {
    if (trevorState) {
      setHasNewState(true);
      const timer = setTimeout(() => setHasNewState(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [trevorState?.message]);

  if (!fieldGuideAssistEnabled || !trevorState || !user) return null;

  // Exclude some routes manually if needed, although getTrevorGuideState does most
  const isCapture = currentRoute.startsWith('/capture');
  const isMissionSubmitted = currentRoute.startsWith('/mission-submitted');
  
  if (isCapture || isMissionSubmitted) return null;

  const handleAction = (action: TrevorGuideAction) => {
    if (action.route) {
      navigate(action.route);
    } else if (action.action) {
      action.action();
    }
    setIsExpanded(false);
  };

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  return (
    <div className={cn(
      "fixed bottom-[calc(90px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[90] transition-all duration-300",
      isCapture && "opacity-20 hover:opacity-100 pointer-events-none hover:pointer-events-auto scale-90 origin-bottom"
    )}>
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-white border-[4px] border-on-surface p-5 shadow-[8px_8px_0px_black] rounded-[2rem] relative overflow-hidden",
              trevorState.tone === 'warning' ? "border-brand-orange shadow-[8px_8px_0px_var(--color-brand-orange)]" : ""
            )}
          >
            {/* Header / Trevor Identity */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full border-2 border-on-surface bg-brand-cyan overflow-hidden shrink-0">
                <img 
                  referrerPolicy="no-referrer"
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Trevor&backgroundColor=b6e3f4" 
                  alt="Trevor" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div>
                <p className="font-display font-black uppercase text-[10px] tracking-tight leading-none text-on-surface/40 mb-0.5">Field Guide Assist</p>
                <p className={cn(
                  "font-display font-black uppercase text-sm italic tracking-tighter leading-none",
                  trevorState.tone === 'warning' ? "text-brand-orange" : "text-brand-cyan"
                )}>
                  Trevor // Counselor
                </p>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="ml-auto p-1 text-on-surface/30 hover:text-on-surface"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            {/* Message Area */}
            <div className="bg-neutral-50 border-2 border-dashed border-on-surface/10 rounded-2xl p-4 mb-5">
              <p className="font-serif italic text-sm text-on-surface leading-relaxed">
                “{trevorState.message}”
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleAction(trevorState.primaryAction)}
                className={cn(
                  "w-full py-3 px-4 flex items-center justify-center gap-2 font-display font-black uppercase italic text-xs tracking-tight border-2 border-on-surface shadow-[4px_4px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-on-surface transition-all",
                  trevorState.tone === 'warning' ? "bg-brand-orange text-white" : "bg-brand-lime"
                )}
              >
                {trevorState.primaryAction.label}
                <ArrowRight size={14} className="stroke-[3]" />
              </button>

              {trevorState.secondaryAction && (
                <button
                  onClick={() => handleAction(trevorState.secondaryAction!)}
                  className="w-full py-2.5 px-4 flex items-center justify-center gap-2 font-mono font-black uppercase text-[9px] tracking-widest text-on-surface/60 hover:text-on-surface border-2 border-transparent transition-all"
                >
                  {trevorState.secondaryAction.label}
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex justify-center"
          >
            <button
              onClick={() => setIsExpanded(true)}
              className={cn(
                "group flex items-center gap-3 bg-white border-[3px] border-on-surface pl-2 pr-4 py-1.5 rounded-full shadow-[4px_4px_0px_black] hover:shadow-[6px_6px_0px_black] active:translate-x-0.5 active:translate-y-0.5 transition-all relative",
                hasNewState && "animate-bounce shadow-[4px_4px_0px_var(--color-brand-cyan)] border-brand-cyan",
                trevorState.tone === 'warning' && "border-brand-orange shadow-[4px_4px_0px_var(--color-brand-orange)]"
              )}
            >
              {/* Pulse notification dot */}
              {hasNewState && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-cyan rounded-full border-2 border-on-surface animate-ping" />
              )}
              
              <div className="w-7 h-7 rounded-full border-2 border-on-surface bg-brand-cyan overflow-hidden shrink-0 group-hover:rotate-12 transition-transform">
                <img 
                  referrerPolicy="no-referrer"
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Trevor&backgroundColor=b6e3f4" 
                  alt="Trevor" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className="font-display font-black uppercase text-[10px] italic tracking-tight text-on-surface leading-none">
                {trevorState.primaryAction.label}
              </span>
              <div className="flex items-center justify-center w-5 h-5 bg-on-surface/5 rounded-full">
                <ChevronUp size={14} className="text-on-surface/40 group-hover:text-on-surface transition-colors" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
