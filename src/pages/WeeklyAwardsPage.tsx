import React, { useState, useEffect } from 'react';
import { ChevronRight, Trophy, Sparkles, AlertCircle, Zap, Clock, Lock, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/UI';
import { useApp } from '../context/AppContext';
import { getServerDate } from '../services/timeService';
import { getCurrentVotingCycle, getVotingPhase } from '../services/votingCycleService';
import { getWeeklySummary } from '../services/summaryService';
import { WeeklySummary } from '../types/game';
import { getDisplayLabel } from '../utils/labelUtils';

const CATEGORIES = [
  { id: 'best_field_note', label: 'Best Story Note', description: 'A note that made the find feel weirdly important.', icon: BookOpen },
  { id: 'best_photo_proof', label: 'Best Photo Receipt', description: 'A photo that made Trevor lean closer to the screen.', icon: Sparkles },
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

  const statusLabel = hasWinnersReleased
    ? 'Results Released'
    : phase === 'awards'
      ? 'Final Review'
      : 'Standby';

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-48 relative overflow-x-hidden ft-paper-texture">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 relative z-20">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link to="/voting" className="inline-flex items-center gap-2 px-4 py-3 bg-white border-4 border-on-surface shadow-[4px_4px_0px_black] hover:bg-brand-lime transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <ChevronRight className="w-5 h-5 rotate-180 stroke-[3]" />
            <span className="font-mono text-[10px] font-black uppercase tracking-widest">Voting</span>
          </Link>
          <div className="bg-on-surface text-white px-3 py-2 border-2 border-on-surface shadow-[3px_3px_0px_var(--color-brand-orange)] font-mono text-[9px] font-black uppercase tracking-widest">
            {statusLabel}
          </div>
        </div>

        <section className="bg-white border-[5px] border-on-surface shadow-[12px_12px_0px_black] rounded-[2rem] p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.018)_1.5px,transparent_0)] bg-[size:15px_15px] pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-brand-cyan text-on-surface border-2 border-on-surface px-3 py-1 shadow-[3px_3px_0px_black]">
                <span className="w-2 h-2 bg-brand-orange rounded-full animate-pulse" />
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.22em]">{getDisplayLabel('CURRENT_CYCLE')}</span>
              </div>
              <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-black uppercase italic tracking-tighter leading-[0.85] text-on-surface">
                Cycle {currentWeekNumber} Laureates
              </h1>
              <p className="font-serif italic text-base sm:text-lg text-on-surface/65 max-w-2xl">
                The Bureau is distilling weekly votes into final honors. Winners publish here after the weekly review snapshot is locked.
              </p>
            </div>
            <div className="bg-[#FFFCEB] border-4 border-on-surface p-5 sm:p-6 shadow-[7px_7px_0px_black] space-y-4">
              <div className="flex items-center gap-3">
                {hasWinnersReleased ? <Trophy className="w-8 h-8 text-brand-orange" /> : <Clock className="w-8 h-8 text-brand-orange" />}
                <div>
                  <p className="font-mono text-[9px] font-black uppercase tracking-widest text-on-surface/45">Release State</p>
                  <p className="font-display text-2xl font-black uppercase italic leading-none">{statusLabel}</p>
                </div>
              </div>
              <p className="font-serif italic text-sm text-on-surface/65">
                {hasWinnersReleased
                  ? 'The weekly snapshot is locked. Laureates are live.'
                  : phase === 'awards'
                    ? 'Awards phase is active. Final admin review is pending.'
                    : 'Come back during awards phase for winners and recap notes.'}
              </p>
            </div>
          </div>
        </section>
      </header>

      <main className="relative z-10 mt-8 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <section className="bg-white/80 border-4 border-on-surface rounded-[2rem] shadow-[8px_8px_0px_black] p-4 sm:p-8">
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
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 items-stretch">
                <Card className="p-6 sm:p-8 border-4 border-on-surface bg-white shadow-[8px_8px_0px_black] rounded-[1.5rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-full bg-brand-orange/5 -skew-x-12 translate-x-12" />
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-4 bg-on-surface text-brand-orange border-4 border-on-surface shadow-[5px_5px_0px_var(--color-brand-orange)]">
                        {phase === 'awards' ? <Trophy className="w-8 h-8 stroke-[2.5]" /> : <Lock className="w-8 h-8 stroke-[2.5]" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black tracking-widest text-[#B5A585] uppercase">
                          {phase === 'awards' ? 'CONSENSUS_PENDING' : 'BROADCAST_STANDBY'}
                        </p>
                        <h2 className="font-display text-3xl sm:text-5xl uppercase tracking-tighter leading-[0.9] font-black italic">
                          Honors Pending
                        </h2>
                      </div>
                    </div>

                    <div className="p-5 bg-paper-dark border-4 border-on-surface space-y-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-brand-orange animate-pulse" />
                        <p className="font-black text-xs uppercase tracking-widest">
                          {phase === 'awards' ? 'Final review is active' : 'Enroute to Sunday release'}
                        </p>
                      </div>
                      <p className="font-serif italic text-on-surface/75 leading-relaxed">
                        {phase === 'awards'
                          ? 'Weekly consensus is wrapping up. The final archive command unlocks the official accolades.'
                          : `Crowning of Cycle ${currentWeekNumber} laureates, consensus statistics, and awards release here during the weekly results window.`}
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CATEGORIES.slice(0, 4).map((cat, idx) => {
                    const Icon = cat.icon;
                    return (
                      <div key={cat.id} className="bg-white border-4 border-on-surface p-5 shadow-[6px_6px_0px_black] rounded-[1.25rem] space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <Icon className="w-6 h-6 text-brand-orange" />
                          <span className="font-mono text-[8px] font-black uppercase text-on-surface/35">CAT_{idx + 1}</span>
                        </div>
                        <h3 className="font-display text-xl font-black uppercase italic leading-none">{cat.label}</h3>
                        <p className="text-xs font-serif italic text-on-surface/60 leading-relaxed">{cat.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </section>

        {/* 2. Hall of Records */}
        <section className="bg-white border-4 border-dashed border-on-surface/20 rounded-[2rem] p-8 sm:p-12 text-center space-y-6">
          <Sparkles className="w-10 h-10 text-brand-lime animate-pulse opacity-60 mx-auto" />
          <div className="space-y-2">
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/35">{getDisplayLabel('PROTOCOL_HISTORY')}</p>
            <h3 className="font-display text-3xl sm:text-5xl uppercase tracking-tighter font-black text-on-surface/35">Hall of Records</h3>
            <p className="font-serif italic text-on-surface/45 leading-relaxed max-w-xl mx-auto">
              Digital dust on the archives. Historical weekly results will stack here once more cycles close.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
