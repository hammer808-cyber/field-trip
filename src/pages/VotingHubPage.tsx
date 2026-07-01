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
  HelpCircle,
  X,
  Zap,
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

type VotingTab = 'vote' | 'tribunal' | 'results';

import { FieldPageHero } from '../components/FieldPageHero';

export default function VotingHubPage() {
  const { user, currentWeekNumber, activeSeason, isVotingWindowOpen, unlockDiscoverySticker, isTribunalUnlocked } = useApp();
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
    const cycle = getCurrentVotingCycle(now);
    const phase = getVotingPhase(now, cycle);
    const daysLeft = getDaysLeftInSubmissionWindow(now, cycle);
    const hoursLeft = getVotingHoursLeft(now, cycle);
    return { phase, daysLeft, hoursLeft };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getServerDate();
      const cycle = getCurrentVotingCycle(now);
      const phase = getVotingPhase(now, cycle);
      const daysLeft = getDaysLeftInSubmissionWindow(now, cycle);
      const hoursLeft = getVotingHoursLeft(now, cycle);
      setClockInfo({ phase, daysLeft, hoursLeft });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen bg-paper pb-56 sm:pb-64 relative overflow-hidden ft-paper-texture">
      {/* Visual Spiral Notebook Rings at the top */}
      <div className="w-full flex justify-center py-1 opacity-55 z-20 relative select-none pointer-events-none mb-3 pt-3">
        <div className="h-4 w-60 border-y-2 border-on-surface bg-[#EAE5D8] flex justify-between px-4 rounded-full shadow-[inset_0_2px_4.5px_rgba(0,0,0,0.15)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-2.5 h-6 bg-slate-400 border-2 border-on-surface rounded-full -mt-1 shadow" />
          ))}
        </div>
      </div>

      <FieldPageHero
        eyebrow="WEEKLY_COMMUNITY_MATCHUP"
        title="PEER VOTE"
        subtitle="Sector 7-B // Field Headquarters"
        backLabel="My_Findings"
        backTo="/missions"
        backgroundIcon={<Trophy className="w-64 h-64" />}
        infoCardLabel="STATION_CLOCK"
        infoCardValue={
          clockInfo.phase === 'submission' 
            ? `${clockInfo.daysLeft}D` 
            : clockInfo.phase === 'voting' 
              ? `${clockInfo.hoursLeft}H` 
              : 'LIVE'
        }
        infoCardSubtext={
          clockInfo.phase === 'submission' 
            ? 'DAYS LEFT // SUBMISSION WINDOW ACTIVE' 
            : clockInfo.phase === 'voting' 
              ? 'HOURS LEFT // CAST MATCHUP BALLOTS' 
              : 'WEEKLY RESULTS RELEASED'
        }
        infoCardAccent={
          clockInfo.phase === 'submission' 
            ? 'blue' 
            : clockInfo.phase === 'voting' 
              ? 'orange' 
              : 'lime'
        }
        tabs={[
          { id: 'vote', label: 'Weekly Votes' },
          { id: 'tribunal', label: 'Tribunal', locked: !isTribunalUnlocked },
          { id: 'results', label: 'Results' }
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as VotingTab)}
      />

      {/* 3. MAIN CONTENT */}
      <main className="max-w-6xl mx-auto p-4 sm:p-8 overflow-hidden">

         <AnimatePresence mode="wait">
            {activeTab === 'vote' && (
              <motion.div 
                key="vote-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                 <div className="bg-brand-lime border-4 border-on-surface p-6 shadow-[10px_10px_0px_black] flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.4),transparent)] opacity-50" />
                    <div className="flex items-center gap-4 relative z-10">
                       <Zap className="w-8 h-8 text-on-surface animate-bounce" />
                       <div className="space-y-0.5 text-left">
                          <h4 className="text-2xl font-display font-black uppercase italic tracking-tighter">Participation Bonus</h4>
                          <p className="text-[10px] font-mono font-black uppercase tracking-widest text-on-surface/60">Uplink confirmed // +5 XP per category casted</p>
                       </div>
                    </div>
                    <div className="bg-on-surface text-brand-lime px-6 py-2 font-display text-3xl font-black italic border-2 border-white shadow-[4px_4px_0px_black] relative z-10">
                       +50 XP MAX
                    </div>
                 </div>

                 <VotingModule noCard />
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
                    <h2 className="text-5xl font-display font-black uppercase italic text-on-surface leading-none">The Tribunal</h2>
                    <p className="text-sm font-serif italic text-on-surface/40 leading-none tracking-widest pl-1 font-bold">
                       // PEER_MODERATION_CHANNEL
                    </p>
                 </div>

                 {!isTribunalUnlocked ? (
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
                    <div className="py-32 border-4 border-dashed border-on-surface/10 rounded-[3rem] text-center space-y-6">
                       <Gavel className="w-16 h-16 mx-auto opacity-10" />
                       <p className="font-display text-2xl uppercase italic font-black opacity-30">Docket is Clear</p>
                    </div>
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
                    <h2 className="text-5xl font-display font-black uppercase italic text-on-surface leading-none">Outcome Log</h2>
                    <p className="text-sm font-serif italic text-on-surface/40 leading-none tracking-widest pl-1 font-bold">
                       // RESOLVED_CASE_HISTORY
                    </p>
                 </div>

                 {resolvedCases.length === 0 ? (
                    <div className="py-32 border-4 border-dashed border-on-surface/10 rounded-[3rem] text-center space-y-6">
                       <History className="w-16 h-16 mx-auto opacity-10" />
                       <p className="font-display text-2xl uppercase italic font-black opacity-30">No Historic Data</p>
                    </div>
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
      </main>

      {/* Floating Rules Action */}
      <button 
        onClick={() => setShowFullRules(true)}
        className="fixed bottom-32 right-8 w-16 h-16 bg-brand-yellow text-on-surface border-4 border-on-surface rounded-full flex items-center justify-center shadow-[6px_6px_0px_black] hover:rotate-[360deg] transition-all duration-700 active:scale-95 group z-50 shadow-[10px_10px_0px_black]"
      >
        <HelpCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
      </button>

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
                     <p>02. Every vote earns you 5 XP immediately.</p>
                     <p>03. Win a 2.5x XP bonus if your pick wins the category!</p>
                     <p>04. Results are final at the end of the week.</p>
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
    </div>
  );
}
