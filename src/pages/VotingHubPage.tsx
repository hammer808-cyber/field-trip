import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Trophy, 
  ShieldAlert, 
  Newspaper, 
  Lock,
  Clock,
  ChevronRight,
  ChevronLeft,
  Users,
  Info,
  Award,
  BookOpen,
  X,
  Vote,
  Sparkles,
  ArrowRight,
  Gavel,
  ThumbsUp,
  ThumbsDown,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Card } from '../components/UI';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { VotingHub as VotingModule } from '../components/VotingHub';
import { FIELD_MATERIALS } from '../utils/styleHelpers';
import { 
  getTribunalCases, 
  getResolvedTribunalCases, 
  castTribunalVote, 
  getTribunalVotesForUser 
} from '../services/tribunalService';
import { TribunalCase, TribunalVote } from '../types/game';
import { TribunalVerdict } from '../logic/firelightTribunal';
import { getServerDate } from '../services/timeService';
import { 
  getCurrentVotingCycle, 
  getVotingPhase, 
  getDaysLeftInSubmissionWindow, 
  getVotingHoursLeft 
} from '../services/votingCycleService';
import { getStarterProgress } from '../services/canonicalProgress';
import { FieldtripLoader } from '../components/FieldtripLoader';

type VotingTab = 'vote' | 'tribunal' | 'results';

import { FieldPageHero } from '../components/FieldPageHero';
import { EmptyStatePanel } from '../components/FieldtripLoader';
import { FieldButton, PlayerPageBody, PlayerPageShell } from '../components/player';
import { GatedFeaturePanel } from '../components/GatedFeaturePanel';

export default function VotingHubPage() {
  const { user, currentWeekNumber, activeSeason, isVotingWindowOpen, unlockDiscoverySticker, isTribunalUnlocked, canonicalProgress } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = (searchParams.get('tab') as VotingTab) || 'vote';
  const [showFullRules, setShowFullRules] = useState(false);
  
  const [tribunalCases, setTribunalCases] = useState<TribunalCase[]>([]);
  const [resolvedCases, setResolvedCases] = useState<TribunalCase[]>([]);
  const [userTribunalVotes, setUserTribunalVotes] = useState<Record<string, TribunalVerdict>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [clockInfo, setClockInfo] = useState(() => {
    const now = getServerDate();
    const cycle = getCurrentVotingCycle(now, undefined, activeSeason?.id);
    const phase = getVotingPhase(now, cycle);
    const daysLeft = getDaysLeftInSubmissionWindow(now, cycle);
    const hoursLeft = getVotingHoursLeft(now, cycle);
    return { phase, daysLeft, hoursLeft };
  });
  const starterProgress = getStarterProgress(canonicalProgress);
  const isVotingUnlocked = starterProgress.starterComplete === true;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getServerDate();
      const cycle = getCurrentVotingCycle(now, undefined, activeSeason?.id);
      const phase = getVotingPhase(now, cycle);
      const daysLeft = getDaysLeftInSubmissionWindow(now, cycle);
      const hoursLeft = getVotingHoursLeft(now, cycle);
      setClockInfo({ phase, daysLeft, hoursLeft });
    }, 10000);
    return () => clearInterval(interval);
  }, [activeSeason?.id]);

  useEffect(() => {
    if (activeTab === 'tribunal') {
      unlockDiscoverySticker('tribunal_view', 'voting');
    }
  }, [activeTab]);

  useEffect(() => {
    const loadTribunalData = async () => {
      if (!user || !activeSeason) return;
      setIsLoading(true);
      try {
        const [cases, resolved, votes] = await Promise.all([
          getTribunalCases(currentWeekNumber, activeSeason.id),
          getResolvedTribunalCases(currentWeekNumber, activeSeason.id),
          getTribunalVotesForUser(user.uid)
        ]);
        setTribunalCases(cases);
        setResolvedCases(resolved);
        const voteMap: Record<string, TribunalVerdict> = {};
        votes.forEach(v => {
          voteMap[v.caseId] = v.vote;
        });
        setUserTribunalVotes(voteMap);
      } catch (err) {
        console.error("Failed to load tribunal", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (user && activeSeason) {
      loadTribunalData();
    }
  }, [user, activeSeason, currentWeekNumber]);

  const handleTribunalVote = async (caseId: string, vote: TribunalVerdict) => {
    if (!user || !activeSeason) return;
    try {
      await castTribunalVote(user.uid, caseId, vote);
      setUserTribunalVotes(prev => ({ ...prev, [caseId]: vote }));
      const updatedCases = await getTribunalCases(currentWeekNumber, activeSeason.id);
      setTribunalCases(updatedCases);
    } catch (err) {
      console.error("Vote failed", err);
    }
  };

  const setActiveTab = (tab: VotingTab) => {
    setSearchParams({ tab });
  };

  return (
    <PlayerPageShell department="voting" className="skin-voting">
      <FieldPageHero
        variant="editorial"
        department="voting"
        eyebrow="Weekly event"
        title="VOTING"
        subtitle="This week's community ballot and awards."
        backgroundIcon={<Trophy className="w-64 h-64" />}
        infoCardLabel="Clock"
        infoCardValue={
          clockInfo.phase === 'submission' 
            ? `${clockInfo.daysLeft}D` 
            : clockInfo.phase === 'voting' 
              ? `${clockInfo.hoursLeft}H` 
              : 'Live'
        }
        infoCardSubtext={
          clockInfo.phase === 'submission' 
            ? 'Days left in the submission window' 
            : clockInfo.phase === 'voting' 
              ? 'Hours left to vote' 
              : 'Results released'
        }
        infoCardAccent={
          clockInfo.phase === 'submission' 
            ? 'blue' 
            : clockInfo.phase === 'voting' 
              ? 'orange' 
              : 'lime'
        }
        tabs={[
          { id: 'vote', label: 'Ballot' },
          { id: 'tribunal', label: 'Tribunal', locked: !isTribunalUnlocked },
          { id: 'results', label: 'Results' }
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as VotingTab)}
      />

      <PlayerPageBody>

         <AnimatePresence mode="wait">
            {activeTab === 'vote' && (
              <motion.div 
                key="vote-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                 <div className="bg-white border-4 border-on-surface p-5 sm:p-6 shadow-[8px_8px_0px_black] rounded-[1.75rem] overflow-hidden relative">
                    <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.018)_1.5px,transparent_0)] bg-[size:14px_14px] pointer-events-none" />
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-center">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-14 h-14 border-4 border-on-surface rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_black]",
                          clockInfo.phase === 'voting' ? "bg-brand-lime" : "bg-brand-cyan"
                        )}>
                          {clockInfo.phase === 'voting' ? <Vote className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                        </div>
                        <div className="space-y-1 text-left">
                          <p className="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-on-surface/40">Weekly Voting</p>
                          <h4 className="text-3xl sm:text-4xl font-display font-black uppercase italic tracking-tighter leading-none">
                            {clockInfo.phase === 'voting' ? 'Vote Now' : clockInfo.phase === 'submission' ? 'Ballot Building' : 'Results Ready'}
                          </h4>
                          <p className="text-xs sm:text-sm font-serif italic text-on-surface/65 leading-relaxed">
                            {clockInfo.phase === 'voting'
                              ? 'Choose up to three approved receipts. Your ballot is protected and saved by the server.'
                              : clockInfo.phase === 'submission'
                                ? 'Approved submissions are being added to the weekly ballot.'
                                : 'Final winners appear after admin review.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                        <button
                          type="button"
                          onClick={() => setShowFullRules(true)}
                          className="bureau-btn justify-center bg-white text-xs text-on-surface"
                        >
                          <BookOpen className="h-4 w-4" />
                          Voting Rules
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(clockInfo.phase === 'awards' ? '/big-board/results' : '/voting/ballot')}
                          disabled={!isVotingUnlocked && clockInfo.phase !== 'awards'}
                          className="bureau-btn justify-center bg-brand-lime text-xs text-on-surface"
                        >
                          {clockInfo.phase === 'awards' ? 'View Results' : clockInfo.phase === 'voting' ? 'Vote Now' : 'Preview Ballot'}
                        </button>
                      </div>
                    </div>
                 </div>

                 {isVotingUnlocked ? <VotingModule noCard /> : <VotingLockedPanel approvedCount={starterProgress.starterApprovedCount} />}
              </motion.div>
            )}

             {activeTab === 'tribunal' && (
              <motion.div 
                key="tribunal-tab"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-12"
              >
                 <div className="text-left space-y-2">
                    <h2 className="text-3xl font-display font-black uppercase italic text-on-surface leading-none">Tribunal</h2>
                    <p className="text-sm font-sans font-bold text-on-surface/65">
                       Community review for flagged receipts. Admins make the final call.
                    </p>
                 </div>

	                 {isLoading && isTribunalUnlocked ? (
                      <FieldtripLoader variant="voting" label="Tribunal Docket" estimatedStep="LOADING CASE FILES" showProgress />
                   ) : !isTribunalUnlocked ? (
                    <div className="py-32 border-4 border-on-surface rounded-[3rem] bg-white text-center space-y-6 shadow-[10px_10px_0px_black]">
                       <div className="w-20 h-20 bg-brand-orange text-white rounded-3xl mx-auto flex items-center justify-center border-4 border-on-surface shadow-[4px_4px_0px_black] rotate-2">
                          <Lock className="w-10 h-10" />
                       </div>
                       <div className="space-y-2">
                          <h3 className="font-display text-4xl uppercase italic font-black">Docket Locked</h3>
                          <p className="font-serif italic text-xl text-on-surface/50 font-bold">Complete all 3 Starter Missions to access the Tribunal.</p>
                       </div>
                       <button onClick={() => navigate('/missions')} className="px-8 py-3 bg-on-surface text-white rounded-xl font-display text-xl font-black uppercase italic shadow-[6px_6px_0px_var(--color-brand-orange)] active:shadow-none hover:bg-brand-magenta transition-all">Go to Missions</button>
                    </div>
                 ) : tribunalCases.length === 0 ? (
                    <EmptyStatePanel
                      title="No cases right now"
                      body="The Tribunal docket is empty."
                      hint="Flagged receipts appear here after admin review."
                      icon={<Gavel className="h-8 w-8" />}
                    />
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {tribunalCases.map(c => (
                         <Card key={c.id} className="bg-white border-4 border-on-surface p-8 rounded-[2.5rem] shadow-[12px_12px_0px_black] flex flex-col space-y-6 text-left relative overflow-hidden group">
                             <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                   <div className="bg-brand-magenta text-white px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-widest border border-on-surface shadow-[2px_2px_0px_black] mb-2 inline-block">
                                      OPEN_CASE_{c.id.slice(-4).toUpperCase()}
                                   </div>
                                   <h3 className="text-2xl font-display font-black uppercase italic text-on-surface leading-none truncate">{c.title}</h3>
                                   <p className="text-[10px] font-mono font-black text-on-surface/40 uppercase">Operative: {c.playerName}</p>
                                </div>
                                <div className="w-12 h-12 bg-paper-dark border-2 border-on-surface rounded-xl flex items-center justify-center shrink-0">
                                   <Gavel className="w-6 h-6 text-on-surface opacity-30" />
                                </div>
                             </div>

                             <div className="aspect-video bg-on-surface/5 border-2 border-on-surface overflow-hidden rounded-2xl relative">
                                <img src={c.proofImage} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                   <p className="text-xs text-white font-serif italic line-clamp-2">"{c.fieldNote}"</p>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <p className="text-[10px] font-mono font-bold uppercase text-on-surface/40 tracking-widest">CAST YOUR VERDICT</p>
                                <div className="grid grid-cols-2 gap-4">
                                   <button 
                                     onClick={() => handleTribunalVote(c.id, 'valid')}
                                     className={cn(
                                       "flex items-center justify-center gap-3 py-4 border-4 border-on-surface font-display text-lg font-black uppercase italic shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all",
                                       userTribunalVotes[c.id] === 'valid' 
                                         ? "bg-brand-lime text-on-surface" 
                                         : "bg-white text-on-surface hover:bg-brand-lime/10"
                                     )}
                                   >
                                      <ThumbsUp className="w-5 h-5" />
                                      Valid
                                      <span className="ml-1 opacity-40">({c.validVotes ?? 0})</span>
                                   </button>
                                   <button 
                                     onClick={() => handleTribunalVote(c.id, 'sus')}
                                     className={cn(
                                       "flex items-center justify-center gap-3 py-4 border-4 border-on-surface font-display text-lg font-black uppercase italic shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all",
                                       userTribunalVotes[c.id] === 'sus' 
                                         ? "bg-brand-magenta text-white" 
                                         : "bg-white text-brand-magenta hover:bg-brand-magenta/10"
                                     )}
                                   >
                                      <ThumbsDown className="w-5 h-5" />
                                      Signal
                                      <span className="ml-1 opacity-40">({c.susVotes ?? 0})</span>
                                   </button>
                                </div>
                             </div>
                         </Card>
                       ))}
                    </div>
                 )}
              </motion.div>
            )}

            {activeTab === 'results' && (
              <motion.div 
                key="results-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                  <div className="text-left space-y-2">
                    <h2 className="text-3xl font-display font-black uppercase italic text-on-surface leading-none">Results</h2>
                    <p className="text-sm font-sans font-bold text-on-surface/65">
                       Resolved cases from this week's event.
                    </p>
                 </div>

                 {resolvedCases.length === 0 ? (
                    <EmptyStatePanel
                      title="No results yet"
                      body="Resolved Tribunal cases will show up here."
                      hint="Come back after this week's review."
                      icon={<History className="h-8 w-8" />}
                    />
                 ) : (
                    <div className="space-y-6">
                       {resolvedCases.map(c => (
                         <div key={c.id} className="bg-white border-4 border-on-surface p-6 rounded-[2rem] shadow-[8px_8px_0px_black] flex items-center gap-6 text-left group hover:scale-[1.01] transition-transform">
                             <div className="w-20 h-20 bg-paper-dark border-2 border-on-surface rounded-2xl overflow-hidden shrink-0">
                                <img src={c.proofImage} alt={c.title} className="w-full h-full object-cover grayscale" />
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                   <h4 className="text-xl font-display font-black uppercase italic text-on-surface truncate">{c.title}</h4>
                                   <span className={cn(
                                      "px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border-2 border-on-surface shadow-[2px_2px_0px_black]",
                                      c.outcome === 'called_out' || c.outcome === 'community_sus_recommendation' ? "bg-brand-magenta text-white" : "bg-brand-lime text-on-surface"
                                   )}>
                                      {c.outcome === 'called_out' || c.outcome === 'community_sus_recommendation' ? 'SUS' : 'VALID'}
                                   </span>
                                </div>
                                <p className="text-xs font-serif italic text-on-surface/50 font-bold">
                                   Verdict: {c.outcome === 'called_out' ? 'Called out by the field.' : 'Upheld by the field.'}
                                </p>
                             </div>
                             <div className="shrink-0 text-right space-y-1">
                                <p className="text-[10px] font-mono font-black text-on-surface/40 uppercase">VOTES</p>
                                <p className="text-lg font-display font-black text-on-surface leading-none">{Number(c.totalVotes ?? 0)}</p>
                             </div>
                         </div>
                       ))}
                    </div>
                 )}
              </motion.div>
            )}
         </AnimatePresence>
      </PlayerPageBody>

      {/* Rules Modal Overlay */}
      <AnimatePresence>
        {showFullRules && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullRules(false)}
              className="absolute inset-0 bg-on-surface/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 100, opacity: 0 }}
              className="relative w-full max-w-xl bg-paper border-[6px] border-on-surface shadow-[32px_32px_0px_black] overflow-hidden flex flex-col"
            >
               <div className="p-10 space-y-8 text-left">
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <span className="text-[10px] font-mono font-black text-brand-orange uppercase tracking-[0.3em]">FIELD_RULES_V4.2</span>
                        <h2 className="text-6xl font-display font-black uppercase italic tracking-tighter text-on-surface drop-shadow-[4px_4px_0px_var(--color-brand-cyan)]">THE RULES</h2>
                     </div>
                     <button onClick={() => setShowFullRules(false)} className="p-3 bg-on-surface text-brand-lime hover:bg-brand-magenta hover:text-white transition-colors border-2 border-on-surface"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="space-y-6 font-serif text-lg italic text-on-surface/80">
                     <p>01. You can't vote for your own findings.</p>
                     <p>02. Vote once per category during the voting window.</p>
                     <p>03. Only approved receipt submissions are eligible.</p>
                     <p>04. Points are finalized after admin review.</p>
                  </div>

                  <button 
                    onClick={() => setShowFullRules(false)}
                    className="w-full py-4 bg-on-surface text-white font-display text-xl font-black uppercase italic tracking-widest shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]"
                  >
                    I UNDERSTAND
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PlayerPageShell>
  );
}

function VotingLockedPanel({ approvedCount: _approvedCount }: { approvedCount: number }) {
  return <GatedFeaturePanel featureName="Voting" />;
}
