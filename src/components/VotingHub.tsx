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
  { id: 'boldest_explorer', label: 'Boldest Explorer', description: 'High-risk or exceptionally brave documentation.' },
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
    <Card className="bg-paper border-2 border-on-surface overflow-hidden">
      <header className="p-6 bg-on-surface text-paper border-b border-on-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <Trophy className="w-8 h-8 text-brand-orange" />
             <h2 className="font-display text-4xl uppercase tracking-tighter italic">Voting Hub</h2>
          </div>
          <p className="micro-label opacity-60">WEEK {currentWeekNumber} // HONORS & ACCOLADES</p>
        </div>
        <div className="flex gap-2">
          {!isVotingOpen && !isLocked && (
            <Sticker color="orange" className="text-[10px]">VOTING_PENDING</Sticker>
          )}
          {isVotingOpen && (
            <Sticker color="green" className="text-[10px] animate-pulse">VOTING_OPEN</Sticker>
          )}
          {isLocked && (
            <Sticker color="black" className="text-[10px]">RESULTS_FINAL</Sticker>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[500px]">
        {/* Categories Sidebar */}
        <div className="border-r border-on-surface/10 bg-on-surface/5 p-4 space-y-2">
          <p className="micro-label opacity-40 px-3 pb-2">CATEGORIES</p>
          {CATEGORIES.map((cat) => {
            const userVote = getVoteForCategory(cat.id);
            const winner = winners[cat.id];

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "w-full text-left p-4 transition-all flex flex-col gap-1 border-2",
                  selectedCategory === cat.id 
                    ? "bg-on-surface text-paper border-on-surface" 
                    : "hover:bg-on-surface/10 border-transparent bg-paper/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display uppercase tracking-widest text-xs">{cat.label}</span>
                  {userVote && <Check className="w-4 h-4 text-brand-orange" />}
                  {isLocked && winner && <TrophyIcon className="w-4 h-4 text-mustard" />}
                </div>
                <p className={cn(
                  "text-[10px] leading-tight font-serif italic",
                  selectedCategory === cat.id ? "opacity-60" : "opacity-40"
                )}>
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Voting Content Area */}
        <div className="lg:col-span-3 p-8 relative flex flex-col">
          {!isVotingOpen && !isLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-on-surface/5 backdrop-blur-[2px] z-20">
              <div className="text-center space-y-4 max-w-sm">
                 <Clock className="w-12 h-12 mx-auto opacity-20" />
                 <h3 className="font-display text-4xl uppercase tracking-tighter">Window Locked</h3>
                 <p className="font-serif italic opacity-60">Voting opens for Week {currentWeekNumber} once the submission cycle terminates.</p>
              </div>
            </div>
          )}

          {isLocked && (winners[selectedCategory] || showResults) ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <header className="border-b-2 border-on-surface/10 pb-4">
                <h3 className="font-display text-2xl uppercase tracking-widest text-brand-orange">Final Results: {CATEGORIES.find(c => c.id === selectedCategory)?.label}</h3>
                <p className="micro-label opacity-40">Accolades awarded by field agent consensus.</p>
              </header>

              {winners[selectedCategory] ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <div className="p-8 bg-mustard/10 border-2 border-mustard rotate-[-1deg] relative">
                       <Trophy className="absolute -top-6 -right-6 w-16 h-16 text-mustard" />
                       <p className="micro-label text-mustard mb-2">CATEGORY_WINNER</p>
                       <h4 className="font-display text-5xl uppercase leading-none tracking-tighter">Consensus Pick</h4>
                       <p className="font-serif italic text-xl mt-4 opacity-80">This agency approves. Bonus points (+25) were awarded to carrier.</p>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 border-2 border-on-surface/10">
                      <div className="bg-on-surface text-paper p-3 rounded-full">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="micro-label opacity-40">RECIPIENT</p>
                        <p className="font-display text-2xl uppercase">Agent {eligibleEntries.find(e => e.id === winners[selectedCategory].entryId)?.userName || 'REDACTED'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="aspect-square bg-on-surface/5 border-2 border-on-surface/10 overflow-hidden shadow-xl rotate-1">
                    <img 
                      src={eligibleEntries.find(e => e.id === winners[selectedCategory].entryId)?.proofImage} 
                      className="w-full h-full object-cover grayscale"
                      alt="Winning entry"
                    />
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center opacity-40">
                  <p className="font-serif italic">No consensus reached for this category.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
               <header className="flex justify-between items-end">
                <div className="space-y-1">
                  <h3 className="font-display text-3xl uppercase tracking-tighter text-brand-orange">{CATEGORIES.find(c => c.id === selectedCategory)?.label}</h3>
                  <p className="font-serif italic opacity-60">"Cast your judgement for the weekly zine."</p>
                </div>
                <div className="text-right">
                  <p className="micro-label opacity-40">VOTES_CAST</p>
                  <p className="font-mono text-2xl">{userVotes?.length || 0} / {CATEGORIES.length}</p>
                </div>
              </header>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <ListFilter className="w-12 h-12" />
                  </motion.div>
                  <p className="font-mono text-xs uppercase tracking-widest">Scanning Transmissions...</p>
                </div>
              ) : eligibleEntries.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {eligibleEntries.map((entry) => {
                    const isCandidate = entry.userId !== user?.uid;
                    const isVotedFor = getVoteForCategory(selectedCategory)?.entryId === entry.id;

                    return (
                      <button
                        key={entry.id}
                        disabled={!isCandidate}
                        onClick={() => handleVote(entry.id)}
                        className={cn(
                          "group relative flex flex-col border-2 transition-all text-left",
                          isVotedFor ? "border-brand-orange ring-4 ring-brand-orange/20" : "border-on-surface/10 hover:border-on-surface/40",
                          !isCandidate && "opacity-40 grayscale cursor-not-allowed"
                        )}
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-on-surface/5 relative">
                          <img src={entry.proofImage} alt="" className="w-full h-full object-cover" />
                          {isVotedFor && (
                             <div className="absolute inset-0 bg-brand-orange/20 flex items-center justify-center">
                               <Check className="w-12 h-12 text-white drop-shadow-md" />
                             </div>
                          )}
                          {!isCandidate && (
                            <div className="absolute top-2 right-2 flex gap-2">
                               <Sticker color="black" className="text-[7px]">SELF_RECORD</Sticker>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-white/50 backdrop-blur-sm">
                          <p className="font-display text-[10px] uppercase truncate opacity-80">{entry.userName}</p>
                          <p className="micro-label opacity-40 truncate">{entry.tripTitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <AlertTriangle className="w-12 h-12 mx-auto text-on-surface opacity-10" />
                  <div className="space-y-1">
                    <p className="font-display text-xl uppercase">No Transmissions Verified</p>
                    <p className="font-serif italic opacity-40 text-sm">Approved entries for this cycle are pending bureau authentication.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="p-4 bg-on-surface/5 border-t border-on-surface/10 flex justify-between items-center">
        <div className="flex items-center gap-2 opacity-40">
          <Info className="w-3 h-3" />
          <p className="text-[10px] font-mono">Consensus bonuses are awarded upon cycle lock.</p>
        </div>
        <div className="flex items-center gap-2">
           <p className="micro-label opacity-40">WINDOW STATUS:</p>
           {isVotingOpen ? (
             <span className="text-[10px] font-mono text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
               <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                 •
               </motion.div>
               LIVE_UPSTREAM
             </span>
           ) : (
             <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest flex items-center gap-1">
               <Lock className="w-2 h-2" /> DATA_SYPHON_OFFLINE
             </span>
           )}
        </div>
      </footer>
    </Card>
  );
};
