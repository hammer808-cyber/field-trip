import React from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Card, FieldBadge } from './UI';
import { Lock, Clock, GraduationCap, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { formatSafeDateOnly, cn } from '../lib/utils';
import { FieldtripLoader } from './FieldtripLoader';

export function GameWrapper({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    loading, 
    isSeasonActive, 
    activeSeason, 
    profile, 
    gameConfig,
    onboardingCompletedCount,
    isOnboardingComplete,
    onboardingCompleted
  } = useApp();
  const { t, isAdmin } = useTheme();

  if (loading) {
    return (
      <FieldtripLoader
        variant="checkin"
        label="Fieldtrip Check-In"
        estimatedStep="PROFILE SYNC"
        fullScreen
        showProgress
      />
    );
  }

  // Guest Mode
  if (!user) return <>{children}</>;

  // Season Inactive Overlay - BYPASSED FOR ADMINS & DEV
  if (!isSeasonActive && !activeSeason && !isAdmin && !import.meta.env.DEV) {
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

  // Pre-Season or Closed Season - BYPASSED FOR ADMINS & DEV
  if (activeSeason && activeSeason.status !== 'active' && !isAdmin && !import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-on-surface/5 flex items-center justify-center border-2 border-dashed border-on-surface/20">
            <Lock className="w-8 h-8 opacity-40" />
          </div>
          <h2 className="text-huge text-4xl tracking-tighter uppercase font-black">{activeSeason.title}</h2>
          <FieldBadge variant="sticker" color="orange" className="mx-auto">{activeSeason.status.toUpperCase()}</FieldBadge>
          <p className="text-sm opacity-60">
            {activeSeason.status === 'pre-season' 
              ? "The season is currently being mapped. Check back soon for deployment orders."
              : "This season has concluded. Bureau analysts are currently processing the field data."
            }
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-left p-3 border-2 border-on-surface/10">
              <span className="micro-label opacity-40">STARTS</span>
              <p className="text-xs font-mono">{formatSafeDateOnly(activeSeason.startDate)}</p>
            </div>
            <div className="text-left p-3 border-2 border-on-surface/10">
              <span className="micro-label opacity-40">ENDS</span>
              <p className="text-xs font-mono">{formatSafeDateOnly(activeSeason.endDate)}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Onboarding Stage
  if (profile && !isOnboardingComplete) {
    const ONBOARDING_ROUTE_PREFIXES = [
      '/onboarding',
      '/classification',
      '/field-kit',
      '/permissions',
      '/field-type',
      '/persona',
      '/quiz',
      '/setup',
      '/welcome',
      '/vibe-check',
      '/field-id'
    ];

    const isOnboardingRoute = ONBOARDING_ROUTE_PREFIXES.some((prefix) =>
      location.pathname.startsWith(prefix)
    );

    if (!isOnboardingRoute) {
      return (
        <div className="relative min-h-screen">
          {children}
        </div>
      );
    }
  }

  return (
    <>
      {(isAdmin || import.meta.env.DEV) && (!isSeasonActive || activeSeason?.status !== 'active' || activeSeason?.id === 'dev-season-2026') && (
        <div className="fixed top-2 sm:top-20 right-2 sm:right-4 z-[100] pointer-events-none flex flex-row sm:flex-col items-center sm:items-end gap-1 sm:gap-2">
          <FieldBadge variant="sticker" color="black" className="text-[6px] sm:text-[8px] opacity-70 border-dashed border border-brand-orange py-0.5 px-1 sm:py-1 sm:px-2 leading-none">
            {isAdmin ? 'ADMIN_BYPASS' : 'DEV_ACTIVE'}
          </FieldBadge>
          {activeSeason?.id === 'dev-season-2026' && (
            <div className="bg-brand-orange text-white text-[5px] sm:text-[7px] px-1 sm:px-2 py-0.5 font-bold uppercase tracking-widest leading-none">
              FALLBACK_MODE
            </div>
          )}
        </div>
      )}
      {children}
    </>
  );
}
