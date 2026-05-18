import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Sticker } from './UI';
import { VoteCategory, Entry } from '../types/game';
import { getVoteStandings } from '../services/voteService';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Check, ListFilter, AlertTriangle, Clock, Lock, User, Info, Trophy as TrophyIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES: { id: VoteCategory; label: string; description: string }[] = [
  { id: 'best_photo', label: 'Lens Laureate', description: 'Exceptional visual composition and clarity.' },
  { id: 'most_mysterious', label: 'Most Mysterious', description: 'Elicits deep curiosity or supernatural dread.' },
  { id: 'funniest_proof', label: 'Funniest Proof', description: 'Technically absurd or purely comedic evidence.' },
  { id: 'boldest_explorer', label: 'Most Iconic Detour', description: 'High-risk or exceptionally brave documentation.' },
  { id: 'best_field_note', label: 'Best Field Note', description: 'Profound or evocative field commentary.' },
  { id: 'most_chaotic', label: 'Most Chaotic', description: 'Pure, unadulterated field energy.' },
];

export const VotingHub = () => {
  const { 
    user, profile, currentWeekNumber, isVotingWindowOpen, isWeekLocked, castVote, userVotes 
  } = useApp();
  
  const [selectedCategory, setSelectedCategory] = useState<VoteCategory>(CATEGORIES[0].id);
  const [eligibleEntries, setEligibleEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [winners, setWinners] = useState<Record<string, { entryId: string; count: number }>>({});
  const [showResults, setShowResults] = useState(false);

  const isVotingOpen = isVotingWindowOpen(currentWeekNumber);
  const isLocked = isWeekLocked(currentWeekNumber);

  useEffect(() => {
    if (currentWeekNumber <= 0) return;

    const fetchEntries = async () => {
      setLoading(true);
      try {
        // Fetch approved entries for the current week
        // Note: Entry type might need weekNumber, but if it doesn't we might need to filter by date or tripId
        // Assuming we store weekNumber in Entry for easier voting
        const q = query(
          collection(db, 'entries'),
          where('status', '==', 'approved'),
          limit(50) // Keep it manageable for the UI
        );
        const snap = await getDocs(q);
        setEligibleEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry)));

        // If week is locked, fetch winners
        if (isLocked) {
          const winnerMap: any = {};
          for (const cat of CATEGORIES) {
            const standings = await getVoteStandings(currentWeekNumber, cat.id);
            if (standings.length > 0) {
              winnerMap[cat.id] = standings[0];
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
  }, [currentWeekNumber, isLocked]);

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

  const getVoteForCategory = (catId: VoteCategory) => {
    return userVotes?.find(v => v.category === catId);
  };

  if (currentWeekNumber <= 0) return null;

  return (
    <Card className="bg-white border-8 border-on-surface overflow-hidden shadow-[24px_24px_0px_black] relative">
      {/* HUD Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      <header className="p-10 bg-on-surface text-white border-b-4 border-on-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
        {/* Decorative prisms */}
        <div className="absolute top-0 right-0 w-64 h-full bg-brand-lime opacity-10 -skew-x-12 translate-x-16" />
        
        <div className="space-y-3 relative z-10 text-left">
          <div className="flex items-center gap-5">
             <div className="p-3 bg-brand-orange border-4 border-white shadow-[8px_8px_0px_var(--color-brand-magenta)] -rotate-3 group-hover:rotate-0 transition-transform">
               <Trophy className="w-12 h-12 text-white stroke-[3]" />
             </div>
             <div className="space-y-0">
               <div className="flex items-center gap-3">
                 <span className="w-3 h-3 bg-brand-lime animate-pulse shadow-[0_0_8px_var(--color-brand-lime)]" />
                 <span className="font-display text-xs font-black tracking-[0.3em] uppercase text-brand-lime italic">BUREAU_TRIBUNAL</span>
               </div>
               <h2 className="font-display text-6xl uppercase tracking-tighter leading-none font-black italic">Voting_Hub</h2>
             </div>
          </div>
          <p className="font-display text-[10px] font-black opacity-40 uppercase tracking-[0.5em] italic">WEEK_00{currentWeekNumber} // HONORS_AND_ACCOLADES</p>
        </div>
        <div className="flex gap-4 relative z-10">
          {!isVotingOpen && !isLocked && (
            <div className="px-6 py-2 bg-white/10 border-2 border-white/20 text-[10px] font-black uppercase tracking-widest text-white/40 italic">VOTING_PENDING</div>
          )}
          {isVotingOpen && (
            <div className="px-6 py-2 bg-brand-lime text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_black] text-[10px] font-black uppercase tracking-widest animate-pulse italic translate-y-[-4px]">VOTING_OPEN</div>
          )}
          {isLocked && (
            <div className="px-6 py-2 bg-white text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_var(--color-brand-orange)] text-[10px] font-black uppercase tracking-widest italic">RESULTS_FINAL</div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[700px] relative z-10">
        {/* Categories Sidebar */}
        <div className="border-r-4 border-on-surface/10 bg-on-surface/5 p-8 space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-on-surface/20 pb-6 text-left">
             <ListFilter className="w-5 h-5 opacity-40 stroke-[3]" />
             <p className="font-display text-xs font-black tracking-[0.3em] opacity-40 uppercase italic">JUDGEMENT_LANES</p>
          </div>
          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
              const userVote = getVoteForCategory(cat.id);
              const winner = winners[cat.id];
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "w-full text-left p-6 transition-all flex flex-col gap-3 border-4 relative group/cat",
                    isActive 
                      ? "bg-on-surface text-white border-on-surface shadow-[8px_8px_0px_var(--color-brand-lime)] scale-[1.02] z-10" 
                      : "hover:bg-brand-lime/10 border-on-surface/10 bg-white hover:border-on-surface/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display uppercase tracking-tight text-xl font-black italic">{cat.label.replace(' ', '_')}</span>
                    {userVote && <Check className={cn("w-5 h-5 stroke-[4]", isActive ? "text-brand-lime" : "text-brand-orange")} />}
                    {isLocked && winner && <TrophyIcon className="w-5 h-5 text-brand-orange" />}
                  </div>
                  <p className={cn(
                    "text-[11px] leading-tight font-display uppercase tracking-tight font-black opacity-40 italic",
                    isActive ? "text-white/60" : ""
                  )}>
                    {cat.description}
                  </p>
                  <div className={cn(
                    "absolute bottom-0 right-0 w-8 h-8 bg-brand-lime/20 -skew-x-12 translate-x-4 translate-y-4 transition-transform",
                    isActive ? "translate-x-0 translate-y-0" : "group-hover/cat:translate-x-2 group-hover/cat:translate-y-2"
                  )} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Voting Content Area */}
        <div className="lg:col-span-3 p-12 relative flex flex-col bg-white">
          {!isVotingOpen && !isLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[8px] z-20">
              <div className="text-center space-y-8 max-w-md p-12 bg-white border-8 border-on-surface shadow-[24px_24px_0px_black] rotate-[-2deg]">
                 <div className="p-6 bg-on-surface/5 border-4 border-on-surface inline-block shadow-[8px_8px_0px_black] -rotate-6">
                    <Clock className="w-16 h-16 opacity-10" />
                 </div>
                 <div className="space-y-4 text-left">
                    <h3 className="font-display text-6xl uppercase tracking-tighter leading-none italic font-black">Window_Locked</h3>
                    <div className="h-2 w-16 bg-brand-orange" />
                    <p className="font-display text-xl uppercase italic font-black opacity-60 leading-tight">Voting opens for Week {currentWeekNumber} once the submission cycle terminates. Access currently restricted.</p>
                 </div>
              </div>
            </div>
          )}

          {isLocked && (winners[selectedCategory] || showResults) ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8">
              <header className="border-b-8 border-on-surface pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-brand-orange animate-pulse" />
                    <p className="font-display text-xs font-black tracking-[0.3em] uppercase text-brand-orange italic">FINAL_ADJUDICATION</p>
                  </div>
                  <h3 className="font-display text-7xl uppercase tracking-tighter leading-[0.75] font-black italic text-on-surface border-b-4 border-brand-lime pb-2 w-fit">{CATEGORIES.find(c => c.id === selectedCategory)?.label.replace(' ', '_')}</h3>
                </div>
                <div className="text-right">
                  <p className="font-display text-[10px] font-black opacity-40 uppercase tracking-[0.5em] italic">CONSENSUS_STAMP</p>
                  <p className="font-display text-3xl uppercase text-brand-lime bg-on-surface px-6 py-2 shadow-[6px_6px_0px_var(--color-brand-orange)] italic translate-x-[-6px]">VERIFIED</p>
                </div>
              </header>

              {winners[selectedCategory] ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start text-left">
                  <div className="space-y-10">
                    <div className="p-12 bg-white border-8 border-on-surface shadow-[24px_24px_0px_black] relative overflow-hidden group">
                       {/* Prism light effect */}
                       <div className="absolute top-0 right-0 w-48 h-48 bg-brand-lime opacity-20 rotate-45 translate-x-24 -translate-y-24 group-hover:translate-x-12 group-hover:-translate-y-12 transition-transform duration-1000" />
                       
                       <Trophy className="mb-8 w-20 h-20 text-brand-orange stroke-[3] -rotate-12" />
                       <div className="space-y-4">
                         <p className="font-display text-xs font-black text-on-surface/40 uppercase tracking-[0.4em] italic leading-none">CATEGORY_LAUREATE</p>
                         <h4 className="font-display text-7xl uppercase leading-[0.75] tracking-tighter font-black italic">Field_Consensus</h4>
                         <p className="font-display text-2xl mt-8 opacity-80 leading-none uppercase font-black italic tracking-tighter">"This transmission defines the cycle. Bonus points (+25) have been dispatched to agent's uplink."</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-8 p-8 bg-brand-lime border-4 border-on-surface shadow-[12px_12px_0px_black] -rotate-1">
                      <div className="bg-on-surface text-brand-lime p-5 border-4 border-on-surface shadow-[6px_6px_0px_var(--color-brand-orange)] rotate-3">
                        <User className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-display text-[10px] font-black opacity-40 uppercase tracking-[0.4em] italic">RECIPIENT_ID</p>
                        <p className="font-display text-5xl uppercase tracking-tighter leading-none font-black italic">{eligibleEntries.find(e => e.id === winners[selectedCategory].entryId)?.userName || 'AGENT_REDACTED'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="aspect-[3/4] bg-on-surface border-8 border-on-surface overflow-hidden shadow-[32px_32px_0px_rgba(0,0,0,0.1)] relative group rotate-2 hover:rotate-0 transition-transform duration-500">
                    <img 
                      src={eligibleEntries.find(e => e.id === winners[selectedCategory].entryId)?.proofImage} 
                      className="w-full h-full object-cover grayscale brightness-110 group-hover:scale-105 transition-transform duration-700"
                      alt="Winning entry"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                       <p className="text-white font-display text-xs uppercase tracking-[0.3em] bg-brand-orange px-4 py-2 italic font-black shadow-[4px_4px_0px_black]">WINNING_SIGNAL_DOC_001</p>
                    </div>
                    {/* Retro Filter Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                  </div>
                </div>
              ) : (
                <div className="py-32 text-center space-y-6 border-8 border-dashed border-on-surface/10 bg-on-surface/5">
                  <p className="font-display text-3xl italic uppercase font-black text-on-surface/40 tracking-tighter">No_Clear_Consensus_Reached</p>
                  <p className="font-display text-sm uppercase font-black opacity-20 tracking-widest italic">Judgement lane cycle terminated without majority.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8">
               <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-on-surface pb-8 text-left gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-brand-orange animate-pulse shadow-[0_0_10px_var(--color-brand-orange)]" />
                    <p className="font-display text-xs font-black tracking-[0.4em] uppercase text-brand-orange italic">ACTIVE_BALLOT</p>
                  </div>
                  <h3 className="font-display text-7xl uppercase tracking-tighter text-on-surface leading-[0.75] font-black italic border-b-4 border-brand-lime pb-2 w-fit">{CATEGORIES.find(c => c.id === selectedCategory)?.label.replace(' ', '_')}</h3>
                  <p className="font-display text-xl uppercase italic font-black opacity-40 leading-none tracking-tight">"Select the signal that commands this category."</p>
                </div>
                <div className="text-right bg-on-surface text-brand-lime p-6 border-4 border-on-surface shadow-[10px_10px_0px_var(--color-brand-orange)] -rotate-1">
                  <p className="font-display text-[10px] font-black opacity-40 tracking-[0.5em] uppercase italic">VOTES_SYNCED</p>
                  <p className="font-display text-5xl leading-none pt-2 font-black italic tracking-tighter">{userVotes?.length || 0}<span className="text-2xl opacity-40 ml-2">/ {CATEGORIES.length}</span></p>
                </div>
              </header>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-10 opacity-60">
                   <div className="p-10 bg-white border-8 border-on-surface shadow-[16px_16px_0px_var(--color-brand-lime)]">
                      <motion.div 
                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      >
                        <ListFilter className="w-24 h-24 text-brand-orange stroke-[3]" />
                      </motion.div>
                   </div>
                  <div className="space-y-2">
                    <p className="font-display text-sm uppercase font-black tracking-[0.5em] animate-pulse italic">Scanning_Signal_Transmissions...</p>
                    <div className="w-48 h-1 bg-on-surface/10 mx-auto relative overflow-hidden">
                       <motion.div 
                         className="absolute inset-0 bg-brand-lime"
                         animate={{ x: ["-100%", "100%"] }}
                         transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                       />
                    </div>
                  </div>
                </div>
              ) : eligibleEntries.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                  {eligibleEntries.map((entry) => {
                    const isCandidate = entry.userId !== user?.uid;
                    const isVotedFor = getVoteForCategory(selectedCategory)?.entryId === entry.id;

                    return (
                      <button
                        key={entry.id}
                        disabled={!isCandidate}
                        onClick={() => handleVote(entry.id)}
                        className={cn(
                          "group relative flex flex-col border-4 transition-all text-left bg-white",
                          isVotedFor ? "border-on-surface shadow-[12px_12px_0px_var(--color-brand-orange)] -translate-x-1 -translate-y-1 z-10" : "border-on-surface/10 hover:border-on-surface/40 hover:shadow-[12px_12px_0px_black] hover:-translate-y-1",
                          !isCandidate && "opacity-40 grayscale cursor-not-allowed border-dashed"
                        )}
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-on-surface relative">
                          <img src={entry.proofImage} alt="" className="w-full h-full object-cover contrast-110 group-hover:scale-105 transition-transform duration-500" />
                          {isVotedFor && (
                             <div className="absolute inset-0 bg-brand-orange/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
                               <div className="w-20 h-20 bg-white border-4 border-on-surface flex items-center justify-center shadow-[8px_8px_0px_black] rotate-6 animate-in zoom-in-50 duration-300">
                                  <Check className="w-12 h-12 text-on-surface stroke-[5]" />
                               </div>
                               <span className="text-[11px] bg-on-surface text-white px-3 py-1 font-black uppercase tracking-[0.2em] shadow-[4px_4px_0px_black] italic">VOTE_STAMPED</span>
                             </div>
                          )}
                          {!isCandidate && (
                            <div className="absolute top-2 right-2 flex gap-2">
                               <div className="px-3 py-1 bg-on-surface text-[9px] font-black text-white uppercase tracking-tighter italic border-2 border-white shadow-[3px_3px_0px_black]">SELF_SIGNAL</div>
                            </div>
                          )}
                          {/* HUD Overlay */}
                          <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
                        </div>
                        <div className="p-5 bg-white space-y-1 relative border-t-2 border-on-surface/10">
                          <p className="font-display text-xl uppercase truncate font-black text-on-surface italic leading-none">{entry.userName}</p>
                          <p className="font-display text-[10px] opacity-40 truncate uppercase tracking-widest italic font-black">{entry.tripTitle}</p>
                          {isCandidate && !isVotedFor && (
                             <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-6 h-6 rounded-full border-4 border-brand-orange flex items-center justify-center">
                                   <div className="w-2.5 h-2.5 bg-brand-orange rounded-full animate-ping" />
                                </div>
                             </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-32 text-center space-y-8 bg-on-surface/5 border-8 border-dashed border-on-surface/10 relative overflow-hidden">
                  <div className="p-8 bg-white border-4 border-on-surface inline-block shadow-[12px_12px_0px_black] rotate-6 relative z-10">
                    <AlertTriangle className="w-20 h-20 text-brand-orange stroke-[3]" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <p className="font-display text-5xl uppercase tracking-tighter leading-none italic font-black">Silent_Frequency</p>
                    <p className="font-display text-xl uppercase italic opacity-60 font-black tracking-tight">Approved entries for this cycle are pending Bureau authentication.</p>
                  </div>
                  <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="p-8 bg-on-surface/5 border-t-4 border-on-surface flex flex-col md:flex-row justify-between items-center gap-6 relative">
        <div className="flex items-center gap-5 opacity-60 max-w-2xl text-left">
          <div className="w-10 h-10 shrink-0 rounded-none bg-on-surface text-white flex items-center justify-center border-2 border-on-surface shadow-[4px_4px_0px_var(--color-brand-lime)]">
            <Info className="w-5 h-5" />
          </div>
          <p className="font-display text-xs italic uppercase font-black leading-tight tracking-tight">Bureau Notice: Consensus pick bonuses are awarded upon cycle structural lock. Your vote is anonymous and immutable. Adhere to the vibe protocols at all times.</p>
        </div>
        <div className="flex items-center gap-6 bg-white border-4 border-on-surface px-6 py-3 shadow-[8px_8px_0px_black] -rotate-1">
           <p className="font-display text-[10px] font-black opacity-40 uppercase tracking-[0.4em] italic leading-none">PROTOCOL_UPLINK:</p>
           {isVotingOpen ? (
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-brand-lime shadow-[0_0_10px_var(--color-brand-lime)] animate-pulse" />
                <span className="font-display text-xs text-on-surface font-black uppercase tracking-widest italic">
                  LIVE_SIGNAL_UPSTREAM
                </span>
             </div>
           ) : (
             <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 opacity-40 stroke-[3]" />
                <span className="font-display text-xs opacity-40 uppercase tracking-widest font-black italic">
                  UPLINK_OFFLINE // SEC_LOCKED
                </span>
             </div>
           )}
        </div>
      </footer>
    </Card>
  );
};
