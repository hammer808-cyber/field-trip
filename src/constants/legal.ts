
export const CURRENT_TERMS_VERSION = "beta-terms-v1.0";
export const CURRENT_PRIVACY_VERSION = "privacy-v1.0";
export const CURRENT_COMMUNITY_RULES_VERSION = "community-rules-v1.0";
export const CURRENT_SAFETY_RULES_VERSION = "safety-v1.0";

export interface LegalConsentDoc {
  accepted: boolean;
  acceptedAt: any;
  userId: string;
  termsVersion: string;
  privacyVersion: string;
  communityRulesVersion: string;
  safetyRulesVersion: string;
  isAdultConfirmed: boolean;
  platform?: string;
  appVersion?: string;
}
