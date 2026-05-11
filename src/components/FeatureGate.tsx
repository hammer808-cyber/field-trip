import React from 'react';
import { useApp } from '../context/AppContext';
import { AppConfig } from '../types/game';

interface FeatureGateProps {
  flag: keyof AppConfig['featureFlags'];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const { isFeatureEnabled } = useApp();
  
  if (!isFeatureEnabled(flag)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
