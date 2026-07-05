import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from './UI';
import { VoteCategory, Entry } from '../types/game';
import { getVoteStandings } from '../services/voteService';
import { collection, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Check, ListFilter, AlertTriangle, Clock, Lock, User, Info, Trophy as TrophyIcon, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { getServerDate } from '../services/timeService';
import { getCurrentVotingCycle, getVotingPhase } from '../services/votingCycleService';
import { getWeeklyBallotId, isWeeklyCandidateEligible } from '../logic/weeklyVoting';

const CATEGORIES: { id: VoteCategory; label: string; description: string }[] = [
  { id: 'best_field_note', label: 'Best Field Note', description: 'Profound or evocative field commentary.' },
  { id: 'best_photo_proof', label: 'Best Photo Proof', description: 'Exceptional visual composition and clarity.' },
  { id: 'most_legendary_errand', label: 'Most Legendary Errand', description: 'Completing an errand of mythical proportions.' },
  { id: 'goblin_energy_award', label: 'Goblin Energy Award', description: 'Exceptional speed, chaotic creativity, or frantic vibes.' },
  { id: 'cleanest_completion', label: 'Cleanest Completion', description: 'Peerless professionalism and absolute alignment with the rules.' },
  { id: 'underdog_award', label: 'Underdog Award', description: 'Remarkable resilience or courage under pressure.' },
];

export const VotingHub = ({ noCard = false }: { noCard?: boolean }) => {
  const { 
    user, currentWeekNumber, isVotingWindowOpen, isWeekLocked, castVote, userVotes, activeSeason 
  } = useApp();
  
  const [selectedCategory, setSelectedCategory] = useState<VoteCategory>(CATEGORIES[0].id);
  const [eligibleEntries, setEligibleEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [winners, setWinners] = useState<Record<string, { entryId: string; count: number; userName?: string; tripTitle?: string; fieldNote?: string; proofImage?: string }>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSummaryLocked, setIsSummaryLocked] = useState(false);
  const [currentIndexes, setCurrentIndexes] = useState<Record<string, number>>({});

  const mapCandidateToEntry = (candidate: any): Entry => {
    const tripId = candidate.tripId || candidate.missionId || candidate.challengeId || '';
    const proofImage = candidate.proofImage || candidate.photoUrl || candidate.imageUrl || candidate.thumbnailUrl || '';
    return {
      id: candidate.entryId, // canonical entry id used by the server vote endpoint
      entryId: candidate.entryId,
      uid: candidate.userId,
      userId: candidate.userId,
      userName: candidate.userName || candidate.displayName || 'Agent',
      displayName: candidate.displayName || candidate.userName || 'Agent',
      username: candidate.userName || candidate.displayName || 'Agent',
      missionId: tripId,
      challengeId: tripId,
      tripId,
      deckId: candidate.deckId || 'd1',
      tripTitle: candidate.tripTitle || candidate.missionTitle || 'Field Trip Mission',
      proofImage,
      imageUrl: proofImage,
      storagePath: candidate.storagePath || null,
      fieldNote: candidate.fieldNote || candidate.note || '',
      weekNumber: candidate.weekNumber,
      seasonId: candidate.seasonId,
      categories: Array.isArray(candidate.categories) ? candidate.categories : CATEGORIES.map(cat => cat.id),
      status: 'approved',
      xpValue: 150,
      xpAwarded: true,
      createdAt: candidate.createdAt || candidate.approvedAt || new Date().toISOString(),
      updatedAt: candidate.updatedAt || candidate.createdAt || new Date().toISOString()
    } as Entry;
  };

  const [phase, setPhase] = useState(() => {
    const now = getServerDate();
    const cycle = getCurrentVotingCycle(now);
    return getVotingPhase(now, cycle);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getServerDate();
      const cycle = getCurrentVotingCycle(now);
      setPhase(getVotingPhase(now, cycle));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const isVotingOpen = phase === 'voting';
  const isLocked = phase === 'awards' || isWeekLocked(currentWeekNumber) || isSummaryLocked;

  useEffect(() => {
    if (currentWeekNumber <= 0) return;

    const fetchEntries = async () => {
      setLoading(true);
      try {
        let winnerMap: any = {};
        // Fetch current week summary status
        if (activeSeason) {
          const summarySnap = await getDoc(doc(db, 'weeklySummaries', `${activeSeason.id}_${currentWeekNumber}`));
          if (summarySnap.exists()) {
            const summaryData = summarySnap.data();
            setIsSummaryLocked(!!summaryData?.isLocked);
            if (summaryData?.voteWinners) {
              winnerMap = summaryData.voteWinners;
            }
          } else {
            setIsSummaryLocked(false);
          }
        }

        const seasonId = activeSeason?.id || 'heatwave-receipts';
        const ballotId = getWeeklyBallotId(seasonId, currentWeekNumber);
        const ballotSnap = await getDoc(doc(db, 'weeklyBallots', ballotId));
        let fetchedCandidates: Entry[] = [];

        if (ballotSnap.exists()) {
          const candidatesSnap = await getDocs(query(
            collection(db, 'weeklyBallots', ballotId, 'candidates'),
            limit(120)
          ));
          fetchedCandidates = candidatesSnap.docs
            .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
            .filter(candidate => candidate.entryId && candidate.userId && candidate.isEligible !== false && candidate.isDisqualified !== true)
            .map(mapCandidateToEntry);
        }

        if (fetchedCandidates.length === 0) {
          const q = query(
          collection(db, 'ballotCandidates'),
          where('weekNumber', '==', currentWeekNumber),
          where('seasonId', '==', seasonId)
          );
          const snap = await getDocs(q);
          fetchedCandidates = snap.docs
            .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
            .filter(candidate => candidate.entryId && candidate.userId)
            .map(mapCandidateToEntry);
        }

        setEligibleEntries(fetchedCandidates);

        if (isLocked) {
          // If no stored winners, and user is admin, compute on the fly as fallback
          const userIsAdmin = user?.email?.includes('admin');
          if (Object.keys(winnerMap).length === 0 && userIsAdmin) {
            for (const cat of CATEGORIES) {
              const standings = await getVoteStandings(currentWeekNumber, cat.id);
              if (standings.length > 0) {
                const entrySnap = await getDoc(doc(db, 'entries', standings[0].entryId));
                if (entrySnap.exists()) {
                  const entryData = entrySnap.data();
                  winnerMap[cat.id] = {
                    entryId: standings[0].entryId,
                    count: standings[0].count,
                    userName: entryData.userName || 'Anonymous Agent',
                    tripTitle: entryData.tripTitle || '',
                    proofImage: entryData.proofImage || '',
                    fieldNote: entryData.fieldNote || ''
                  };
                }
              }
            }
          }
          setWinners(winnerMap);
          setShowResults(true);
        }
      } catch (err) {
        console.error('Failed to fetch voting data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [currentWeekNumber, isLocked, activeSeason, user]);

  const handleVote = async (entryId: string) => {
    if (!isVotingOpen || !user) return;
    try {
      await castVote(entryId, currentWeekNumber, selectedCategory);
    } catch (err: any) {
      if (err.message === 'SELF_VOTE_PROHIBITED') {
        alert("BUREAU_PROTOCOL: Self-voting is strictly prohibited.");
      } else {
        alert("Transmission error. Please try again.");
      }
    }
  };

  const [forceRevote, setForceRevote] = useState<Record<string, boolean>>({});

  const getVoteForCategory = (catId: VoteCategory) => {
    return userVotes?.find(v => v.category === catId);
  };

  if (currentWeekNumber <= 0) return null;

  // Selected vote details
  const myVote = getVoteForCategory(selectedCategory);
  const votedEntry = myVote ? eligibleEntries.find(e => e.id === myVote.entryId || (e as any).entryId === myVote.entryId) : undefined;
  const isRevoting = forceRevote[selectedCategory];

  // Candidates that are not submitted by the user
  const categoryEntries = eligibleEntries.filter(entry => {
    const categories = Array.isArray((entry as any).categories) ? (entry as any).categories : CATEGORIES.map(cat => cat.id);
    return isWeeklyCandidateEligible({ ...entry, categories, isEligible: true }, selectedCategory);
  });
  const votableCandidates = categoryEntries.filter(entry => entry.userId !== user?.uid);
  const currentIdx = currentIndexes[selectedCategory] || 0;

  const content = (
    <>
      <header className={cn(
        "p-6 sm:p-12 bg-on-surface text-white border-b-8 border-on-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-10 relative overflow-hidden",
        noCard && "rounded-t-xl"
      )}>
        {/* Colorful Abstract Background */}
        <div className="absolute top-0 right-0 w-64 h-full bg-brand-magenta opacity-20 -skew-x-12 translate-x-12" />
        <div className="absolute top-0 left-0 w-32 h-full bg-brand-cyan opacity-20 skew-x-12 -translate-x-8" />
        
        <div className="space-y-2 sm:space-y-4 relative z-10 text-left">
          <div className="flex items-center gap-4 sm:gap-6">
             <div className="p-2 sm:p-4 bg-brand-orange border-4 border-white shadow-[8px_8px_0px_black] -rotate-3 group-hover:rotate-0 transition-transform">
               <Trophy className="w-8 h-8 sm:w-16 sm:h-16 text-white stroke-[3]" />
             </div>
             <div className="space-y-0 text-left">
               <div className="flex items-center gap-3">
                 <div className="w-3 h-3 bg-brand-lime shadow-[0_0_10px_var(--color-brand-lime)]" />
                 <span className="font-mono text-[10px] sm:text-xs font-black tracking-[0.4em] uppercase text-brand-lime italic">BUREAU_TRIBUNAL</span>
               </div>
               <h2 className="font-display text-4xl sm:text-8xl uppercase tracking-tighter leading-none font-black italic drop-shadow-[4px_4px_0px_black]">Voting_Hub</h2>
             </div>
          </div>
        </div>

        <div className="flex gap-3 sm:gap-6 relative z-10">
          {phase === 'voting' && (
            <div className="px-5 sm:px-8 py-2 sm:py-3 bg-brand-lime text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_black] text-[10px] sm:text-xs font-black uppercase tracking-widest animate-pulse italic">VOTING_OPEN</div>
          )}
          {phase === 'awards' && (
            <div className="px-5 sm:px-8 py-2 sm:py-3 bg-brand-magenta text-white border-4 border-on-surface shadow-[6px_6px_0px_black] text-[10px] sm:text-xs font-black uppercase tracking-widest italic">RESULTS_LOCKED</div>
          )}
          {phase === 'submission' && (
            <div className="px-5 sm:px-8 py-2 sm:py-3 bg-white text-on-surface/45 border-4 border-on-surface/20 shadow-[6px_6px_0px_black] text-[10px] sm:text-xs font-black uppercase tracking-widest italic">PREPARING_MATCHUP</div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[400px] sm:min-h-[700px] relative z-10 text-left">
        {/* Left Side Category Navigation Picker */}
        <div className="lg:col-span-1 border-b-2 sm:border-b-0 lg:border-r-4 border-on-surface bg-paper-dark/30 overflow-x-auto lg:overflow-x-visible no-scrollbar">
          <div className="flex lg:flex-col p-2 sm:p-6 gap-2 sm:gap-4 text-left">
            {CATEGORIES.map((cat, idx) => {
              const vote = getVoteForCategory(cat.id);
              const isActive = selectedCategory === cat.id;
              const colorClasses = [
                'shadow-[4px_4px_0px_var(--color-brand-orange)]',
                'shadow-[4px_4px_0px_var(--color-brand-magenta)]',
                'shadow-[4px_4px_0px_var(--color-brand-blue)]',
                'shadow-[4px_4px_0px_var(--color-brand-lime)]',
                'shadow-[4px_4px_0px_var(--color-brand-cyan)]',
                'shadow-[4px_4px_0px_var(--color-brand-yellow)]',
              ];
              const activeShadow = colorClasses[idx % colorClasses.length];

              return (
                <button
                  id={`cat-btn-${cat.id}`}
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "flex-shrink-0 lg:w-full text-left p-4 sm:p-6 border-[3px] sm:border-4 transition-all relative group overflow-hidden",
                    isActive 
                      ? cn("bg-on-surface text-white border-on-surface -rotate-1", activeShadow)
                      : "bg-white text-on-surface/40 border-on-surface/10 hover:border-on-surface/40 bg-paper-dark"
                  )}
                >
                  <div className="flex items-center gap-3 sm:gap-5 text-left">
                    <div className={cn(
                      "w-8 h-8 sm:w-12 sm:h-12 border-3 flex items-center justify-center shrink-0",
                      isActive ? "bg-brand-lime border-white shadow-[2px_2px_0px_black]" : "bg-on-surface/5 border-on-surface/10"
                    )}>
                      {vote ? <Check className="w-5 h-5 sm:w-8 sm:h-8" /> : <span className="text-xs sm:text-xl font-black italic">{idx + 1}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[8px] sm:text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">CAT_{idx + 1}</p>
                      <p className={cn("font-display text-base sm:text-3xl font-black uppercase leading-none truncate italic tracking-tighter", isActive ? "text-brand-lime" : "text-on-surface")}>{cat.label}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side Content Pane */}
        <div className="lg:col-span-3 p-3 sm:p-12 relative flex flex-col bg-white overflow-hidden text-left">
          <div className="space-y-6 sm:space-y-12 text-left">
             {/* Weekly Cycle Subsystem Status Banner */}
             <div className={cn(
                "p-4 border-2 sm:border-4 border-on-surface font-mono text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-[4px_4px_0px_black] rounded-xl select-none",
                phase === 'submission' && "bg-brand-blue/10 text-brand-blue border-brand-blue",
                phase === 'voting' && "bg-brand-lime/10 text-on-surface border-brand-lime animate-pulse",
                phase === 'awards' && "bg-brand-cyan/10 text-on-surface border-brand-cyan"
             )}>
                <Clock className="w-5 h-5 shrink-0" />
                <span>
                   {phase === 'submission' && "Weekly matchup is building. Come back Saturday to vote."}
                   {phase === 'voting' && "Voting is live for 24 hours."}
                   {phase === 'awards' && "Results are in. Weekly awards have been released."}
                </span>
             </div>

             <header className="border-b-2 sm:border-b-4 border-on-surface pb-3 sm:pb-8 text-left">
                <p className="font-display text-[8px] sm:text-xs font-black tracking-[0.2em] uppercase text-brand-orange italic">ACTIVE_BALLOT</p>
                <h3 className="font-display text-2xl sm:text-7xl uppercase tracking-tighter leading-none font-black italic text-on-surface border-b-2 sm:border-b-4 border-brand-lime pb-1 sm:pb-2 w-fit">{CATEGORIES.find(c => c.id === selectedCategory)?.label.replace(' ', '_')}</h3>
             </header>

              {isLocked && winners[selectedCategory] && (
               <div className="p-6 sm:p-10 bg-brand-cyan border-4 border-on-surface text-on-surface flex flex-col md:flex-row gap-6 sm:gap-10 items-center italic mb-12 shadow-[12px_12px_0px_black] relative overflow-hidden group">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.4),transparent)] opacity-40" />
                 <div className="p-3 sm:p-5 bg-white border-4 border-on-surface shadow-[6px_6px_0px_black] rotate-6 shrink-0 group-hover:rotate-0 transition-transform">
                   <Trophy className="w-8 h-8 sm:w-16 sm:h-16 text-on-surface stroke-[3]" />
                 </div>
                 <div className="space-y-2 text-left flex-grow relative z-10">
                   <div className="bg-on-surface text-brand-lime px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] inline-block mb-2">ACCOLADE UNLOCKED</div>
                   <h4 className="font-display text-3xl sm:text-6xl font-black uppercase text-on-surface leading-none tracking-tighter">Winner: {winners[selectedCategory].userName}</h4>
                   <p className="font-display text-sm sm:text-2xl font-black opacity-60 uppercase">{winners[selectedCategory].tripTitle || 'Field Entry'}</p>
                   {winners[selectedCategory].fieldNote && (
                     <p className="text-base sm:text-lg font-serif italic font-bold opacity-80 mt-4 leading-relaxed">"{winners[selectedCategory].fieldNote}"</p>
                   )}
                 </div>
                 <div className="text-right shrink-0 relative z-10">
                   <span className="font-mono text-[10px] sm:text-xs font-black tracking-widest opacity-40 uppercase block mb-1 underline">POPULAR CONSENSUS</span>
                   <span className="font-display text-4xl sm:text-7xl font-black italic text-brand-orange drop-shadow-[2px_2px_0px_black]">{winners[selectedCategory].count} Votes</span>
                 </div>
               </div>
             )}

             {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                    <ListFilter className="w-12 h-12 sm:w-20 sm:h-20" />
                  </motion.div>
                </div>
             ) : isLocked ? (
                /* Show standard locked list layout or winners view when results are sealed */
                eligibleEntries.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-10 text-left">
                     {eligibleEntries.map((entry, eIdx) => {
                      const isWinner = winners[selectedCategory]?.entryId === entry.id;
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "group relative flex flex-col border-4 border-on-surface text-left bg-white p-4 rounded-xl shadow-[8px_8px_0px_black]"
                          )}
                        >
                          <div className="aspect-[3/4] overflow-hidden bg-on-surface relative flex flex-col justify-end rounded-lg border-[3px] border-on-surface">
                            <img src={entry.proofImage} alt="" className="w-full h-full object-cover" />
                            {isWinner && (
                               <div className="absolute inset-x-0 bottom-0 bg-brand-yellow text-on-surface py-3 px-4 flex items-center justify-between border-t-4 border-on-surface z-20">
                                 <span className="font-display text-[10px] font-black uppercase tracking-widest italic font-bold">CHAMPION_SEED</span>
                                 <Trophy className="w-5 h-5 text-on-surface fill-current animate-bounce" />
                               </div>
                            )}
                          </div>
                          <div className="pt-5 pb-1 px-1 flex flex-col gap-1 text-left">
                            <p className="font-display text-2xl sm:text-3xl uppercase truncate font-black italic tracking-tighter text-on-surface leading-none">{entry.userName}</p>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <MapPin className="w-3 h-3 text-brand-orange shrink-0" />
                              <p className="font-mono text-[9px] sm:text-[11px] text-on-surface/40 font-black uppercase leading-none whitespace-nowrap overflow-hidden tracking-widest">{entry.tripTitle}</p>
                            </div>
                          </div>
                        </div>
                      );
                     })}
                  </div>
                ) : (
                  <div className="py-20 text-center border-4 border-dashed border-on-surface/10 bg-on-surface/5">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-display text-xl uppercase font-black italic opacity-40">Silent_Frequency</p>
                  </div>
                )
             ) : votedEntry && !isRevoting ? (
                /* 1. SECURED VOTE CONFIRMATION STATE */
                <div id="voted-locked-card" className="border-4 border-on-surface p-6 sm:p-12 hover:rotate-0 rounded-2xl shadow-[12px_12px_0px_var(--color-brand-magenta)] bg-white max-w-2xl mx-auto space-y-8 relative">
                   <div className="absolute top-4 right-4 bg-brand-magenta text-white border-2 border-on-surface font-mono text-[10px] font-extrabold px-3 py-1 uppercase tracking-wider rounded shadow-[2px_2px_0px_black] rotate-6">
                     VOTE SECURED
                   </div>
                   
                   <div className="space-y-2">
                     <p className="font-mono text-xs uppercase text-brand-magenta tracking-widest font-black">YOUR ACTIVE SELECTION</p>
                     <p className="font-display text-3xl sm:text-5xl font-black italic tracking-tight uppercase leading-none text-on-surface">You have voted in this Category!</p>
                   </div>

                   <div className="border-4 border-on-surface rounded-xl overflow-hidden shadow-[6px_6px_0px_black] bg-paper-dark">
                     <div className="aspect-[4/3] overflow-hidden bg-on-surface">
                       <img src={votedEntry.proofImage} alt="" className="w-full h-full object-cover" />
                     </div>
                     <div className="p-6 space-y-3 bg-white border-t-4 border-on-surface">
                       <p className="font-display text-4xl font-black uppercase leading-none italic tracking-tighter text-on-surface">{votedEntry.userName}</p>
                       <div className="flex items-center gap-2 text-on-surface/50 font-mono text-xs">
                         <MapPin className="w-4 h-4 text-brand-orange" />
                         <span className="uppercase tracking-widest font-bold">{votedEntry.tripTitle}</span>
                       </div>
                       {votedEntry.fieldNote && (
                         <div className="bg-paper-dark p-4 border-2 border-on-surface/10 rounded-lg">
                           <p className="font-serif italic text-base font-bold text-on-surface/80 leading-relaxed">"{votedEntry.fieldNote}"</p>
                         </div>
                       )}
                     </div>
                   </div>

                   <button
                     id="btn-revote"
                     className="w-full py-4 text-center font-display font-black text-xl border-4 border-on-surface bg-brand-lime hover:-rotate-1 transition-all uppercase tracking-tighter shadow-[4px_4px_0px_black]"
                     onClick={() => setForceRevote(prev => ({ ...prev, [selectedCategory]: true }))}
                   >
                     Change Choice / Cast Revote
                   </button>
                </div>
             ) : votableCandidates.length > 0 ? (
               /* 2. TINDER-SWIPE STYLE ONE-CANDIDATE ACTIVE DECISION ENGINE */
               currentIdx >= votableCandidates.length ? (
                 /* 2A. REPLAY/END OF LINEUP STATE */
                 <div id="deck-depleted-card" className="border-4 border-dashed border-on-surface/25 p-8 sm:p-20 text-center rounded-2xl bg-paper-dark/10 max-w-xl mx-auto space-y-6">
                    <Trophy className="w-16 h-16 mx-auto opacity-30 text-brand-orange" />
                    <div className="space-y-2">
                      <p className="font-display text-3xl font-black uppercase italic tracking-tighter text-on-surface">Lineup Traversed</p>
                      <p className="font-mono text-xs text-on-surface/55 uppercase tracking-widest font-black">You have reviewed all available candidate entries for this week.</p>
                    </div>
                    <button
                      id="btn-restart-deck"
                      className="inline-block px-10 py-4 font-display font-black text-lg border-4 border-on-surface bg-white text-on-surface hover:bg-brand-orange hover:text-white transition-all uppercase tracking-tighter shadow-[6px_6px_0px_black]"
                      onClick={() => {
                        setCurrentIndexes(prev => ({ ...prev, [selectedCategory]: 0 }));
                        setForceRevote(prev => ({ ...prev, [selectedCategory]: false }));
                      }}
                    >
                      Replay Submissions Lineup
                    </button>
                 </div>
               ) : (
                 /* 2B. THE PRIMARY TINDER DECK CARD */
                 (function() {
                   const candidate = votableCandidates[currentIdx];
                   return (
                     <div id={`active-candidate-${candidate.id}`} className="max-w-md mx-auto space-y-8 select-none">
                       {/* Deck Progress Bar Indicator */}
                       <div className="flex justify-between items-center font-mono text-xs">
                         <span className="font-bold text-on-surface/60 uppercase tracking-widest">Candidate {currentIdx + 1} of {votableCandidates.length}</span>
                         <span className="bg-brand-lime text-on-surface border-2 border-on-surface font-black px-2 py-0.5 tracking-wider rounded">POOL_ACTIVE</span>
                       </div>
                       
                       <div className="w-full bg-white border-4 border-on-surface rounded-2xl overflow-hidden shadow-[12px_12px_0px_black] bg-white relative animate-fade-in group">
                         {/* Giant high quality visual proof image */}
                         <div className="aspect-square sm:aspect-[4/5] bg-on-surface relative overflow-hidden border-b-4 border-on-surface">
                           <img src={candidate.proofImage} alt="" className="w-full h-full object-cover" />
                           <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-brand-lime font-mono text-[9px] font-black px-3 py-1 border-2 border-brand-lime rounded uppercase tracking-widest">
                             TRIBUNAL NOMINEE
                           </div>
                         </div>

                         {/* Submitter details and notes */}
                         <div className="p-6 sm:p-8 space-y-4 text-left">
                           <div className="space-y-1">
                             <p className="font-display text-4xl font-extrabold uppercase leading-none tracking-tighter italic text-on-surface">{candidate.userName}</p>
                             <div className="flex items-center gap-2 text-on-surface/40 font-mono text-xs font-bold uppercase tracking-widest">
                               <MapPin className="w-4 h-4 text-brand-orange shrink-0" />
                               <span className="truncate">{candidate.tripTitle}</span>
                             </div>
                           </div>

                           {candidate.fieldNote && (
                             <div className="bg-paper-dark p-4 border-2 border-on-surface/5 rounded-xl">
                               <p className="font-serif italic text-base sm:text-lg font-bold text-on-surface/80 leading-relaxed">
                                 "{candidate.fieldNote}"
                               </p>
                             </div>
                           )}
                         </div>
                       </div>

                       {/* Obvious Mobile-First Voting Actions (Big photo, obvious question, two large touch choices) */}
                       <div className="space-y-4">
                         <p className="text-center font-display text-lg sm:text-xl font-extrabold uppercase italic tracking-wide text-on-surface/75">
                           DO YOU REMIT VOTE ACCOLADE TO THIS AGENT?
                         </p>

                         <div className="grid grid-cols-2 gap-4">
                           {/* NO / SKIP BUTTON */}
                           <button
                             id="btn-vote-no"
                             onClick={() => {
                               setCurrentIndexes(prev => ({ ...prev, [selectedCategory]: (prev[selectedCategory] || 0) + 1 }));
                             }}
                             className="py-5 font-display font-black text-lg border-4 border-on-surface bg-paper-dark hover:bg-on-surface hover:text-white transition-all uppercase tracking-tighter shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none"
                           >
                             Skip / Next
                           </button>

                           {/* YES / VOTE BUTTON */}
                           <button
                             id="btn-vote-yes"
                             onClick={async () => {
                               await handleVote(candidate.id);
                               setCurrentIndexes(prev => ({ ...prev, [selectedCategory]: (prev[selectedCategory] || 0) + 1 }));
                               setForceRevote(prev => ({ ...prev, [selectedCategory]: false }));
                             }}
                             className="py-5 font-display font-black text-lg border-4 border-on-surface bg-brand-orange text-white hover:bg-brand-lime hover:text-on-surface hover:-rotate-1 transition-all uppercase tracking-tighter shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none"
                           >
                             Yes / Vote!
                           </button>
                         </div>
                       </div>
                     </div>
                   );
                 })()
               )
             ) : (
                /* No nominees in this category */
                <div id="silent-category-card" className="py-20 text-center border-4 border-dashed border-on-surface/10 bg-on-surface/5">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-display text-xl uppercase font-black italic opacity-40">Silent_Frequency</p>
                  <p className="font-mono text-xs text-on-surface/40 mt-2 uppercase tracking-wider font-extrabold">No other agent submissions in this category to vote on yet.</p>
                </div>
             )}
          </div>
        </div>
      </div>

      <footer className="p-4 sm:p-8 bg-on-surface/5 border-t-4 border-on-surface flex flex-col md:flex-row justify-between items-center gap-6 relative text-left">
        <div className="flex items-center gap-3 sm:gap-5 opacity-60 text-left">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <p className="font-display text-[8px] sm:text-xs italic uppercase font-black leading-tight">Consensus premiums awarded at structural lock.</p>
        </div>
        <div className="text-[8px] sm:text-[10px] font-black opacity-40 uppercase tracking-widest italic">PROTOCOL_UPLINK: ACTIVE</div>
      </footer>
    </>
  );

  if (noCard) return content;
  return (
    <Card className="bg-white border-8 border-on-surface overflow-hidden shadow-[24px_24px_0px_black] relative text-left">
      {content}
    </Card>
  );
};
