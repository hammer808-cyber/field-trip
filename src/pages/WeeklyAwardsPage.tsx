import React, { useState, useEffect } from 'react';
import { ChevronRight, Trophy, Sparkles, AlertCircle, Zap, Clock, Lock, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/UI';
import { useApp } from '../context/AppContext';
import { TabbedSection } from '../components/TabbedSection';
import { getServerDate } from '../services/timeService';
import { getCurrentVotingCycle, getVotingPhase } from '../services/votingCycleService';
import { getWeeklySummary } from '../services/summaryService';
import { WeeklySummary } from '../types/game';
import { getDisplayLabel } from '../utils/labelUtils';

const CATEGORIES = [
  { id: 'best_field_note', label: 'Best Field Note', description: 'Profound or evocative field commentary.', icon: BookOpen },
  { id: 'best_photo_proof', label: 'Best Photo Proof', description: 'Exceptional visual composition and clarity.', icon: Sparkles },
  { id: 'most_legendary_errand', label: 'Most Legendary Errand', description: 'Completing an errand of mythical proportions.', icon: Trophy },
  { id: 'goblin_energy_award', label: 'Goblin Energy Award', description: 'Exceptional speed, chaotic creativity, or frantic vibes.', icon: Zap },
  { id: 'cleanest_completion', label: 'Cleanest Completion', description: 'Peerless professionalism and absolute alignment with the rules.', icon: Sparkles },
  { id: 'underdog_award', label: 'Underdog Award', description: 'Remarkable resilience or courage under pressure.', icon: AlertCircle },
];

export default function WeeklyAwardsPage() {
  const { currentWeekNumber, activeSeason } = useApp();
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!activeSeason?.id || !currentWeekNumber) {
      setLoading(false);
      return;
    }
    const loadData = async () => {
      setLoading(true);
      try {
        const summary = await getWeeklySummary(activeSeason.id, currentWeekNumber);
        setWeeklySummary(summary);
      } catch (err) {
        console.warn("[WeeklyAwardsPage] Failed to fetch weekly summary:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeSeason?.id, currentWeekNumber]);

  const hasWinnersReleased = phase === 'awards' && weeklySummary?.isLocked && weeklySummary?.voteWinners;

  return (
    <div className="min-h-screen bg-white pb-64 relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed top-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none overflow-hidden h-full z-0">
        <h1 className="text-[25vw] font-display uppercase tracking-tighter leading-none italic rotate-90 origin-top-right font-black">
          LAUREATES
        </h1>
      </div>

      <header className="max-w-6xl mx-auto px-6 pt-16 space-y-10 relative z-20">
        <div className="flex items-center gap-6">
          <Link to="/voting" className="p-3 bg-white border-4 border-on-surface shadow-[4px_4px_0px_black] hover:bg-brand-lime transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <ChevronRight className="w-6 h-6 rotate-180 stroke-[3]" />
          </Link>
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                 <span className="w-2 h-2 bg-brand-orange animate-pulse" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange">PROTOCOL_HONORS</p>
             </div>
             <p className="font-mono text-[9px] opacity-40 uppercase tracking-widest">Protocol_Archival // Weekly_Awards</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="field-label-wrapper">
             <div className="field-label-white-on-blue">
                <div className="field-label-white-on-blue-inner">
                   <h1 className="text-[3.5rem] sm:text-[6rem] md:text-[10rem] leading-[0.8] mb-0 break-words">
                      The_Honors
                   </h1>
                </div>
             </div>
          </div>
          <div className="bg-brand-lime text-on-surface p-8 border-4 border-on-surface shadow-[12px_12px_0px_black] max-w-3xl rotate-1">
            <p className="font-display text-2xl italic leading-tight uppercase font-black">
              "Ceremonial recognition for exceptional field performance. The Bureau acknowledges your contribution to the vibe landscape."
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mt-12">
        {/* 1. Cycle Laureates */}
        <TabbedSection
          id="cycle-laureates"
          eyebrow={getDisplayLabel('CURRENT_CYCLE')}
          title={`Cycle ${currentWeekNumber} Laureates`}
          quote="The Bureau is currently distilling field transmissions to identify the cycle laureates."
          colorClass="bg-brand-lime"
          statusLabel={hasWinnersReleased ? getDisplayLabel("broadcast_released") : phase === 'awards' ? getDisplayLabel("consensus_pending") : getDisplayLabel("standby_mode")}
          statusVariant={hasWinnersReleased ? "success" : phase === 'awards' ? "active" : "locked"}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
            {loading ? (
              <div className="p-12 text-center font-mono text-xs uppercase animate-pulse">
                Uplinking core database...
              </div>
            ) : hasWinnersReleased ? (
              // Released View of Winners
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {CATEGORIES.map((cat, idx) => {
                  const winner = weeklySummary?.voteWinners?.[cat.id];
                  const Icon = cat.icon;
                  if (!winner) return null;

                  return (
                    <Card key={cat.id} className="p-6 border-4 border-on-surface bg-white shadow-[8px_8px_0px_black] hover:-translate-y-1 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/10 -skew-x-12 translate-x-12 -translate-y-12 pointer-events-none" />
                      
                      <div className="space-y-6 text-left">
                        <div className="flex items-center justify-between">
                          <div className="p-3 bg-on-surface border-2 border-on-surface shadow-[3px_3px_0px_black] rounded-lg text-brand-lime">
                            <Icon className="w-6 h-6 stroke-[2.5]" />
                          </div>
                          <span className="font-mono text-[9px] font-bold bg-brand-orange text-white border-2 border-on-surface px-2.5 py-0.5 uppercase tracking-widest rotate-6">
                            CAT_{idx + 1}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest leading-none mb-1">{cat.label.toUpperCase()}</p>
                          <h4 className="font-display text-2xl font-black uppercase text-on-surface italic tracking-tight">{winner.userName}</h4>
                        </div>

                        {winner.proofImage && (
                          <div className="aspect-[16/10] overflow-hidden bg-on-surface relative rounded-lg border-2 border-on-surface">
                            <img src={winner.proofImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
                          </div>
                        )}

                        <div className="p-3 bg-paper-dark border-2 border-on-surface/10 rounded-lg space-y-1">
                          <p className="font-mono text-[8px] font-bold text-on-surface/40 leading-none">COMMUNITY_PROOF_ENTRY</p>
                          <p className="text-xs font-serif italic text-on-surface/80">"{winner.fieldNote || 'No field note submitted.'}"</p>
                        </div>

                        <div className="pt-4 border-t border-on-surface/10 flex justify-between items-center">
                          <span className="font-mono text-[9px] opacity-40 uppercase tracking-widest truncate max-w-[120px]">{winner.tripTitle}</span>
                          <span className="font-display text-sm font-black italic text-brand-orange shrink-0">{winner.count} votes</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : phase !== 'awards' ? (
              // Standby / Early Phase View
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                <Card className="p-12 border-8 border-on-surface bg-white shadow-[24px_24px_0px_black] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-full bg-brand-orange/5 -skew-x-12 translate-x-16" />
                  
                  <div className="space-y-10 relative z-10 text-left">
                    <div className="flex items-start gap-8">
                       <div className="p-5 bg-on-surface text-brand-orange border-4 border-on-surface shadow-[8px_8px_0px_var(--color-brand-orange)] group-hover:rotate-12 transition-transform">
                          <Lock className="w-12 h-12 stroke-[2.5]" />
                       </div>
                       <div className="space-y-2">
                          <p className="text-[11px] font-black tracking-widest text-[#B5A585] uppercase">BROADCAST_STANDBY</p>
                          <h2 className="font-display text-6xl uppercase tracking-tighter leading-[0.9] font-black italic">The_Honored_Class</h2>
                       </div>
                    </div>
                    
                    <div className="p-10 bg-paper-dark border-4 border-on-surface shadow-inner space-y-8">
                       <div className="space-y-4">
                          <div className="flex items-center gap-3">
                             <Clock className="w-5 h-5 text-brand-orange animate-pulse" />
                             <p className="font-black text-sm uppercase tracking-widest">Enroute to Sunday Release</p>
                          </div>
                          <p className="font-display text-xl italic text-on-surface/80 leading-relaxed uppercase font-black">
                             Crowning of Cycle {currentWeekNumber} laureates, consensus statistics, and XP rewards release here live on Sunday 00:00 UTC.
                          </p>
                       </div>
                       
                       <div className="pt-8 border-t-2 border-on-surface/10 flex justify-between items-center">
                          <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Come back Sunday to view</span>
                          <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest">TRANSMISSION_ENCRYPTED</span>
                       </div>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-col justify-center space-y-10">
                   <div className="bg-white border-4 border-on-surface p-10 shadow-[12px_12px_0px_black] rotate-2">
                      <p className="font-display text-3xl font-black uppercase text-on-surface italic leading-tight">"A legacy written in field code."</p>
                   </div>
                   <div className="flex items-center gap-6 p-8 bg-on-surface text-brand-lime border-4 border-on-surface shadow-[12px_12px_0px_var(--color-brand-orange)] -rotate-1">
                      <AlertCircle className="w-10 h-10 shrink-0" />
                      <p className="text-xs font-mono uppercase tracking-widest leading-loose">All winners are subject to Bureau verification. Fraudulent submissions will result in structural purge.</p>
                   </div>
                </div>
              </div>
            ) : (
              // Sunday / Awards Phase but pending finalization View
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                <Card className="p-12 border-8 border-on-surface bg-white shadow-[24px_24px_0px_black] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-full bg-brand-lime/5 -skew-x-12 translate-x-16" />
                  
                  <div className="space-y-10 relative z-10 text-left">
                    <div className="flex items-start gap-8">
                       <div className="p-5 bg-on-surface text-brand-lime border-4 border-on-surface shadow-[8px_8px_0px_var(--color-brand-orange)] group-hover:rotate-12 transition-transform">
                          <Trophy className="w-12 h-12 stroke-[2.5]" />
                       </div>
                       <div className="space-y-2">
                          <p className="text-[11px] font-black tracking-widest text-[#B5A585] uppercase">IDENTITY_VERIFIED</p>
                          <h2 className="font-display text-6xl uppercase tracking-tighter leading-[0.9] font-black italic">The_Honored_Class</h2>
                       </div>
                    </div>
                    
                    <div className="p-10 bg-paper-dark border-4 border-on-surface shadow-inner space-y-8">
                       <div className="space-y-4">
                          <div className="flex items-center gap-3">
                             <div className="w-4 h-4 bg-brand-magenta animate-ping" />
                             <p className="font-black text-sm uppercase tracking-widest">Consensus_Pending_Uplink</p>
                          </div>
                          <p className="font-display text-xl italic text-on-surface/80 leading-relaxed uppercase font-black">
                             Weekly consensus is wrapping up. Awaiting final terminal archive command to unlock accolades.
                          </p>
                       </div>
                       
                       <div className="pt-8 border-t-2 border-on-surface/10 flex justify-between items-center flex-wrap gap-4">
                          <div className="flex -space-x-4">
                             {[1,2,3,4].map(i => (
                               <div key={i} className="w-12 h-12 rounded-full bg-white border-4 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.1)] flex items-center justify-center text-[10px] font-black text-on-surface/20">?</div>
                             ))}
                          </div>
                          <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Awaiting_Consensus</span>
                       </div>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-col justify-center space-y-10">
                   <div className="bg-white border-4 border-on-surface p-10 shadow-[12px_12px_0px_black] rotate-2">
                      <p className="font-display text-3xl font-black uppercase text-on-surface italic leading-tight">"A legacy written in field code."</p>
                   </div>
                   <div className="flex items-center gap-6 p-8 bg-on-surface text-brand-lime border-4 border-on-surface shadow-[12px_12px_0px_var(--color-brand-orange)] -rotate-1">
                      <AlertCircle className="w-10 h-10 shrink-0" />
                      <p className="text-xs font-mono uppercase tracking-widest leading-loose">All winners are subject to Bureau verification. Fraudulent submissions will result in structural purge.</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        </TabbedSection>

        {/* 2. Hall of Records */}
        <TabbedSection
          id="hall-of-records"
          eyebrow={getDisplayLabel('PROTOCOL_HISTORY')}
          title="Hall of Records"
          quote="Digital dust on the archives. No historical data clusters detected in this sector."
          colorClass="bg-brand-orange"
          statusLabel={getDisplayLabel("standby_mode")}
          statusVariant="locked"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
             <div className="max-w-3xl mx-auto text-center space-y-12 bg-white border-8 border-dashed border-on-surface/20 p-20 rounded-[4rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                   <Sparkles className="w-10 h-10 text-brand-lime animate-pulse opacity-40" />
                </div>
                
                <div className="p-10 bg-white border-4 border-on-surface inline-block shadow-[16px_16px_0px_rgba(0,0,0,0.05)] rotate-6">
                   <Trophy className="w-24 h-24 opacity-5 stroke-[1]" />
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-display text-5xl uppercase tracking-tighter font-black text-on-surface/30">Archive_Null</h3>
                  <p className="font-display text-xl italic text-on-surface/40 leading-relaxed uppercase font-black max-w-sm mx-auto">"The halls remain silent. History is waiting for your imprint."</p>
                </div>

                <div className="pt-10 flex justify-center gap-3">
                   {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-3 h-3 rounded-full bg-on-surface/10" />
                   ))}
                </div>
             </div>
          </div>
        </TabbedSection>
      </main>
    </div>
  );
}
