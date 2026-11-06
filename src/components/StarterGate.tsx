import React from 'react';
import { useApp } from '../context/AppContext';
import { canAccessFeature, LOTERIA_ENABLED } from '../services/canonicalProgress';
import { GatedFeaturePanel, type GatedFeatureName } from './GatedFeaturePanel';

interface StarterGateProps {
  requiredFeature: 'crew' | 'memories' | 'leaderboard' | 'voting' | 'loteria';
  children: React.ReactNode;
}

const FEATURE_LABEL: Record<StarterGateProps['requiredFeature'], GatedFeatureName> = {
  crew: 'Crew',
  memories: 'Dex',
  leaderboard: 'Big Board',
  voting: 'Voting',
  loteria: 'Loteria',
};

export function StarterGate({ requiredFeature, children }: StarterGateProps) {
  const { isAdmin, canonicalProgress } = useApp();
  const featureKey = requiredFeature === 'leaderboard' ? 'voting' : requiredFeature;
  const isFeatureUnlocked = canAccessFeature(canonicalProgress, featureKey, { isAdmin });

  if (isFeatureUnlocked || isAdmin) {
    return <>{children}</>;
  }

  // A barred feature is unfinished work, not a starter lock — say so.
  if (requiredFeature === 'loteria' && !LOTERIA_ENABLED) {
    return <GatedFeaturePanel featureName="Loteria" reason="coming_soon" />;
  }

  return <GatedFeaturePanel featureName={FEATURE_LABEL[requiredFeature]} />;
}
