import React from 'react';
import { useApp } from '../context/AppContext';
import { canAccessFeature, LOTERIA_ENABLED, VOTING_ENABLED, ZINES_ENABLED, type FeatureKey } from '../services/canonicalProgress';
import { GatedFeaturePanel, type GatedFeatureName } from './GatedFeaturePanel';

interface StarterGateProps {
  requiredFeature: 'crew' | 'memories' | 'leaderboard' | 'voting' | 'loteria' | 'zines';
  children: React.ReactNode;
}

const FEATURE_LABEL: Record<StarterGateProps['requiredFeature'], GatedFeatureName> = {
  crew: 'Crew',
  memories: 'Dex',
  leaderboard: 'Big Board',
  voting: 'Voting',
  loteria: 'Loteria',
  zines: 'Zines',
};

export function StarterGate({ requiredFeature, children }: StarterGateProps) {
  const { isAdmin, canonicalProgress } = useApp();
  // The leaderboard has its own key (Nov 17, 2026): it used to borrow
  // Voting's key, so parking Voting locked the Big Board for every
  // non-admin even at 3/3 starters. canAccessFeature returns true for
  // 'leaderboard' once the starter check passes — no kill switch.
  const featureKey: FeatureKey = requiredFeature;
  const isFeatureUnlocked = canAccessFeature(canonicalProgress, featureKey, { isAdmin });

  if (isFeatureUnlocked || isAdmin) {
    return <>{children}</>;
  }

  // Parked features are unfinished work, not a starter lock — say so.
  // Flip the matching *_ENABLED flag in canonicalProgress when one ships.
  const PARKED: Partial<Record<StarterGateProps['requiredFeature'], boolean>> = {
    loteria: !LOTERIA_ENABLED,
    zines: !ZINES_ENABLED,
    voting: !VOTING_ENABLED,
  };
  if (PARKED[requiredFeature]) {
    return <GatedFeaturePanel featureName={FEATURE_LABEL[requiredFeature]} reason="coming_soon" />;
  }

  return <GatedFeaturePanel featureName={FEATURE_LABEL[requiredFeature]} />;
}
