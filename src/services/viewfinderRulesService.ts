import { TripCard } from '../types/challenges';

export interface ViewfinderRules {
  allowCameraRollUpload: boolean;
  requireLiveCapture: boolean;
  requirePhotoTakenWithinChallengeWindow: boolean;
  allowMissingExif: boolean;
  reviewIfMetadataMissing: boolean;
}

export type ViewfinderRulePreset = 'standard' | 'liveOnly' | 'cameraRollAllowed' | 'archiveAllowed' | 'manualReview' | 'finalChallenge';

export const VIEWFINDER_RULE_PRESETS: Record<ViewfinderRulePreset, ViewfinderRules> = {
  standard: {
    allowCameraRollUpload: true,
    requireLiveCapture: false,
    requirePhotoTakenWithinChallengeWindow: true,
    allowMissingExif: false,
    reviewIfMetadataMissing: true
  },
  liveOnly: {
    allowCameraRollUpload: false,
    requireLiveCapture: true,
    requirePhotoTakenWithinChallengeWindow: true,
    allowMissingExif: false,
    reviewIfMetadataMissing: false
  },
  cameraRollAllowed: {
    allowCameraRollUpload: true,
    requireLiveCapture: false,
    requirePhotoTakenWithinChallengeWindow: true,
    allowMissingExif: true,
    reviewIfMetadataMissing: true
  },
  archiveAllowed: {
    allowCameraRollUpload: true,
    requireLiveCapture: false,
    requirePhotoTakenWithinChallengeWindow: false,
    allowMissingExif: true,
    reviewIfMetadataMissing: false
  },
  manualReview: {
    allowCameraRollUpload: true,
    requireLiveCapture: false,
    requirePhotoTakenWithinChallengeWindow: true,
    allowMissingExif: true,
    reviewIfMetadataMissing: true
  },
  finalChallenge: {
    allowCameraRollUpload: false,
    requireLiveCapture: true,
    requirePhotoTakenWithinChallengeWindow: true,
    allowMissingExif: false,
    reviewIfMetadataMissing: false
  }
};

export const DEFAULT_VIEWFINDER_RULES: ViewfinderRules = VIEWFINDER_RULE_PRESETS.standard;

/**
 * Resolves the active viewfinder rules for a given challenge.
 * Logic: default preset rules + selected preset rules + individual challenge overrides.
 */
export function getViewfinderRulesForChallenge(challenge: TripCard): ViewfinderRules {
  const presetKey = challenge.viewfinderRulePreset || 'standard';
  const presetRules = VIEWFINDER_RULE_PRESETS[presetKey] || DEFAULT_VIEWFINDER_RULES;

  // Merge: Default -> Preset -> Direct challenge fields (deprecated but supported) -> Explicit overrides
  const rules: ViewfinderRules = {
    ...DEFAULT_VIEWFINDER_RULES,
    ...presetRules,
  };

  // Support old fields if they exist directly on challenge
  if (challenge.allowCameraRollUpload !== undefined) rules.allowCameraRollUpload = challenge.allowCameraRollUpload;
  if (challenge.requireLiveCapture !== undefined) rules.requireLiveCapture = challenge.requireLiveCapture;
  if (challenge.requirePhotoTakenWithinChallengeWindow !== undefined) rules.requirePhotoTakenWithinChallengeWindow = challenge.requirePhotoTakenWithinChallengeWindow;
  if (challenge.allowMissingExif !== undefined) rules.allowMissingExif = challenge.allowMissingExif;
  if (challenge.reviewIfMetadataMissing !== undefined) rules.reviewIfMetadataMissing = challenge.reviewIfMetadataMissing;

  // Use explicit overrides if present
  if (challenge.viewfinderRulesOverride) {
    if (challenge.viewfinderRulesOverride.allowCameraRollUpload !== undefined) {
      rules.allowCameraRollUpload = challenge.viewfinderRulesOverride.allowCameraRollUpload;
    }
    if (challenge.viewfinderRulesOverride.requireLiveCapture !== undefined) {
      rules.requireLiveCapture = challenge.viewfinderRulesOverride.requireLiveCapture;
    }
    if (challenge.viewfinderRulesOverride.requirePhotoTakenWithinChallengeWindow !== undefined) {
      rules.requirePhotoTakenWithinChallengeWindow = challenge.viewfinderRulesOverride.requirePhotoTakenWithinChallengeWindow;
    }
    if (challenge.viewfinderRulesOverride.allowMissingExif !== undefined) {
      rules.allowMissingExif = challenge.viewfinderRulesOverride.allowMissingExif;
    }
    if (challenge.viewfinderRulesOverride.reviewIfMetadataMissing !== undefined) {
      rules.reviewIfMetadataMissing = challenge.viewfinderRulesOverride.reviewIfMetadataMissing;
    }
  }

  return rules;
}
