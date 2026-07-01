import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getActiveSeason, getAppConfig } from '../services/seasonService';
import { recalculateWeeklySummary, getWeeklySummary } from '../services/summaryService';
import { logAdminAction } from '../services/moderationService';
import { Season, WeeklySummary } from '../types/game';
import { Card } from '../components/UI';
import { RefreshCw, Lock, Unlock, AlertTriangle, CheckCircle2, ChevronRight, BarChart3, Shield } from 'lucide-react';
import { cn, formatSafeDate } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function AdminLeaderboard() {
  const { user } = useApp();
  const { isAdmin } = useTheme();
  const navigate = useNavigate();
  const [season, setSeason] = useState<Season | null>(null);
  const [summaries, setSummaries] = useState<Record<number, WeeklySummary | null>>({});
  const [loading, setLoading] = useState(true);
  const [processingWeek, setProcessingWeek] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) {
        setLoading(false);
        return;
    }

    async function loadData() {
      try {
        const config = await getAppConfig();
        if (config?.activeSeasonId) {
          const s = await getActiveSeason(config.activeSeasonId);
          setSeason(s);
          
          if (s) {
            const summaryMap: Record<number, WeeklySummary | null> = {};
            for (const week of s.weeks) {
              const summary = await getWeeklySummary(s.id, week.number);
              summaryMap[week.number] = summary;
            }
            setSummaries(summaryMap);
          }
        }
      } catch (err) {
        console.error("[AdminLeaderboard] Failed to load layout data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAdmin]);

  const handleRecalculate = async (weekNumber: number) => {
    if (!season || !user) return;
    setProcessingWeek(weekNumber);
    try {
      await logAdminAction(user.uid, `week-${weekNumber}`, 'leaderboard', 'recalculate_summary', { seasonId: season.id, weekNumber });
      await recalculateWeeklySummary(season.id, weekNumber);
      const updated = await getWeeklySummary(season.id, weekNumber);
      setSummaries(prev => ({ ...prev, [weekNumber]: updated }));
    } catch (error) {
      console.error('Recalcultion failed:', error);
      alert('Recalculation failed. Check console for details.');
    } finally {
      setProcessingWeek(null);
    }
  };

  const toggleLock = async (weekNumber: number, currentLocked?: boolean) => {
    if (!season || !user) return;
    const summaryId = `${season.id}_${weekNumber}`;
    try {
      await logAdminAction(user.uid, summaryId, 'leaderboard', currentLocked ? 'unlock_week' : 'lock_week', { seasonId: season.id, weekNumber });
      await updateDoc(doc(db, 'weeklySummaries', summaryId), {
        isLocked: !currentLocked
      });
      setSummaries(prev => ({
        ...prev,
        [weekNumber]: prev[weekNumber] ? { ...prev[weekNumber]!, isLocked: !currentLocked } : null
      }));
    } catch (e) {
      alert('Failed to toggle lock.');
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse font-mono uppercase text-xs">Syncing Leaderboard Infrastructure...</div>;
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6 font-mono">
        <Shield className="w-16 h-16 text-error opacity-20" />
        <h1 className="text-xl font-black uppercase text-error">Access_Denied</h1>
        <p className="text-[10px] opacity-40 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
          Clearance Level 4 required for Leaderboard Scaling Management.
        </p>
        <button onClick={() => navigate('/missions')} className="px-6 py-2 border border-on-surface/20 text-[10px] uppercase tracking-widest hover:bg-on-surface/5 transition-colors">Return to Deck</button>
      </div>
    );
  }

  if (!season) return <div className="p-8 text-center text-error font-mono flex flex-col items-center gap-4">
    <AlertTriangle className="w-8 h-8 opacity-40" />
    <span className="text-xs uppercase font-bold tracking-widest">NO_ACTIVE_SEASON_FOUND</span>
  </div>;

  return (
    <div className="p-8 pb-32 max-w-5xl mx-auto space-y-12">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-brand-orange">
           <BarChart3 className="w-5 h-5" />
           <p className="micro-label font-bold uppercase tracking-widest">Bureau Admin / Leaderboard Scaling</p>
        </div>
        <h1 className="text-huge uppercase tracking-tighter leading-none">Weekly Summaries</h1>
        <p className="bureau-subhead">Manage pre-calculated weekly leaderboard data to ensure system scaling.</p>
      </header>

      <div className="grid gap-6">
        {season.weeks.map((week) => {
          const summary = summaries[week.number];
          const isProcessing = processingWeek === week.number;
          const isCalculated = !!summary;
          const isLocked = summary?.isLocked;

          return (
            <div key={week.number}>
              <Card className={cn(
                "p-6 border-l-8 transition-all",
                isLocked ? "border-on-surface/40 bg-on-surface/5" : 
                isCalculated ? "border-success bg-success/5" : "border-brand-orange bg-brand-orange/5"
              )}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-4xl leading-none">W{week.number.toString().padStart(2, '0')}</span>
                    <div className="h-8 w-px bg-on-surface/10" />
                    <div>
                      <p className="font-display uppercase text-xs tracking-widest opacity-40">CHALLENGE_ID</p>
                      <p className="font-mono text-xs">{week.fieldChallengeId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="space-y-1">
                      <p className="micro-label opacity-40">CALC_STATUS</p>
                      <div className="flex items-center gap-2">
                        {isCalculated ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-success uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            Pre-calculated
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-brand-orange uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            Pending Calculation
                          </span>
                        )}
                      </div>
                    </div>

                    {isCalculated && (
                      <div className="space-y-1">
                        <p className="micro-label opacity-40">LAST_RECALC</p>
                        <p className="font-mono text-[10px]">
                          {formatSafeDate(summary.lastCalculatedAt, undefined, 'N/A')}
                        </p>
                      </div>
                    )}

                    {isCalculated && (
                      <div className="space-y-1">
                         <p className="micro-label opacity-40">CREWS_AGGREGATED</p>
                         <p className="font-mono text-[10px] font-bold">
                           {Object.keys(summary.crewStats || {}).length} UNITS
                         </p>
                      </div>
                    )}

                    {isCalculated && (
                      <div className="space-y-1">
                         <p className="micro-label opacity-40">ACCOLADES & PAID STATUS</p>
                         <p className="font-mono text-[10px] font-bold">
                           {summary.voteWinners && Object.keys(summary.voteWinners).length > 0 ? (
                             <span className="text-brand-green uppercase">● FINALIZED & PAID</span>
                           ) : (
                             <span className="text-brand-orange uppercase">○ READY TO FINALIZE</span>
                           )}
                         </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {isCalculated && (
                    <button 
                      onClick={() => toggleLock(week.number, isLocked)}
                      className={cn(
                        "bureau-btn-outline text-xs px-4 py-2 flex items-center gap-2",
                        isLocked ? "opacity-50" : "text-brand-green border-brand-green"
                      )}
                    >
                      {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      {isLocked ? 'UNLOCK_WEEK' : 'LOCK_WEEK'}
                    </button>
                  )}

                  <button 
                    disabled={isProcessing || (isLocked && !user?.email?.includes('admin'))}
                    onClick={() => handleRecalculate(week.number)}
                    className={cn(
                      "bureau-btn flex items-center gap-2 py-4 px-6 h-auto font-display text-sm",
                      isCalculated ? "bg-on-surface" : "bg-brand-orange"
                    )}
                  >
                    <RefreshCw className={cn("w-5 h-5", isProcessing && "animate-spin")} />
                    {isCalculated ? 'FORCE_RECALCULATE' : 'INITIAL_CALCULATION'}
                  </button>
                </div>
              </div>
              
              {isLocked && !isProcessing && (
                <div className="mt-4 pt-4 border-t border-on-surface/10 flex items-center gap-2 opacity-60">
                   <Lock className="w-3 h-3" />
                   <p className="font-mono text-[8px] uppercase">This summary is locked. Changes to ScoreEvents will not be reflected until an admin forces a recalculation.</p>
                </div>
              )}
            </Card>
          </div>
          );
        })}
      </div>
      
      <div className="notice-card p-8 bg-brand-orange/5 border-dashed border-2 border-brand-orange/20 space-y-4">
        <h3 className="font-display text-xl uppercase tracking-tighter">Leaderboard Scaling Integrity</h3>
        <ul className="space-y-2 font-serif italic text-sm opacity-60 ml-4 list-disc">
          <li>Leaderboards now read from one Summary document per week instead of thousands of ScoreEvents.</li>
          <li>Recalculation scans all events to build an idempotent cache.</li>
          <li>"Top 3 Player Average" is calculated once during this process.</li>
          <li>Crews with no activity during the week remain registered in the summary with zero scores.</li>
        </ul>
      </div>
    </div>
  );
}
