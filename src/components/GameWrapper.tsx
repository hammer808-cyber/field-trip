import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Card, Sticker } from './UI';
import { Lock, Clock, GraduationCap, Users } from 'lucide-react';
import { motion } from 'motion/react';

export function GameWrapper({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    loading, 
    isSeasonActive, 
    activeSeason, 
    profile, 
    gameConfig 
  } = useApp();
  const { t, isAdmin } = useTheme();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-paper font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-on-surface border-t-brand-orange animate-spin" />
          <span className="text-[10px] uppercase tracking-widest opacity-40">Synchronizing Bureau DNA...</span>
        </div>
      </div>
    );
  }

  // Guest Mode
  if (!user) return <>{children}</>;

  // Season Inactive Overlay - BYPASSED FOR ADMINS
  if (!isSeasonActive && !activeSeason && !isAdmin) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-on-surface/5 flex items-center justify-center border-2 border-dashed border-on-surface/20">
            <Clock className="w-8 h-8 opacity-40" />
          </div>
          <h2 className="text-huge text-4xl tracking-tighter uppercase font-black">Season Offline</h2>
          <p className="text-sm opacity-60">The bureau is currently in a recalibration phase. No active seasons detected in your sector.</p>
          <div className="h-px bg-on-surface/10" />
          <p className="text-[10px] uppercase font-bold tracking-widest text-brand-orange">Protocol: Standby for Dispatch</p>
        </Card>
      </div>
    );
  }

  // Pre-Season or Closed Season - BYPASSED FOR ADMINS
  if (activeSeason && activeSeason.status !== 'active' && !isAdmin) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-on-surface/5 flex items-center justify-center border-2 border-dashed border-on-surface/20">
            <Lock className="w-8 h-8 opacity-40" />
          </div>
          <h2 className="text-huge text-4xl tracking-tighter uppercase font-black">{activeSeason.title}</h2>
          <Sticker color="orange" className="mx-auto">{activeSeason.status.toUpperCase()}</Sticker>
          <p className="text-sm opacity-60">
            {activeSeason.status === 'pre-season' 
              ? "The season is currently being mapped. Check back soon for deployment orders."
              : "This season has concluded. Bureau analysts are currently processing the field data."
            }
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-left p-3 border-2 border-on-surface/10">
              <span className="micro-label opacity-40">STARTS</span>
              <p className="text-xs font-mono">{activeSeason.startDate.toDate().toLocaleDateString()}</p>
            </div>
            <div className="text-left p-3 border-2 border-on-surface/10">
              <span className="micro-label opacity-40">ENDS</span>
              <p className="text-xs font-mono">{activeSeason.endDate.toDate().toLocaleDateString()}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Onboarding Stage
  if (profile && !profile.onboardingCompleted) {
    const remaining = (gameConfig?.onboardingEntriesRequired || 3) - (profile.soloCount || 0);
    if (remaining > 0) {
      return (
        <div className="relative min-h-screen">
          {children}
          {/* Onboarding Banner */}
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-on-surface text-paper p-4 border-t-4 border-brand-orange"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-brand-orange" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest">Training Protocol Active</p>
                  <p className="text-xs opacity-60 font-mono">Complete {remaining} more solo mission{remaining > 1 ? 's' : ''} to unlock Crew access.</p>
                </div>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: gameConfig?.onboardingEntriesRequired || 3 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 border-2 ${i < (profile.soloCount || 0) ? 'bg-brand-orange border-brand-orange' : 'border-paper/20'}`} 
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      );
    }
  }

  return (
    <>
      {isAdmin && (!isSeasonActive || activeSeason?.status !== 'active') && (
        <div className="fixed top-20 right-4 z-[100] pointer-events-none">
          <Sticker color="black" className="text-[8px] opacity-80 border-dashed border-2 border-brand-orange">
            ADMIN_SEASON_BYPASS
          </Sticker>
        </div>
      )}
      {children}
    </>
  );
}
