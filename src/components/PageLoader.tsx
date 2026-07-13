import React from 'react';
import { FieldtripLoader } from './FieldtripLoader';

export function PageLoader() {
  return (
    <FieldtripLoader
      variant="checkin"
      label="Fieldtrip Check-In"
      estimatedStep="CHECKING IN"
      fullScreen
      showProgress
      reducedMotionFallback="Gathering your gear..."
    />
  );
}
