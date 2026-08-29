import React from 'react';
import { useApp } from '../context/AppContext';
import { canAccessFeature } from '../services/canonicalProgress';
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

  return <GatedFeaturePanel featureName={FEATURE_LABEL[requiredFeature]} />;
}
