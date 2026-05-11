export type ProofStatus = 'pending' | 'approved' | 'needsMoreProof' | 'rejected';
export type ProofType = 'photo' | 'selfie' | 'receipt' | 'landmark' | 'document' | 'nature';

export interface ProofRequirement {
  id: string;
  challengeId: string;
  requiredProofTypes: ProofType[];
  minimumPhotoCount: number;
  requiresFieldNote: boolean;
  requiresLocationCheck: boolean;
  requiresTimeWindow: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  requiresObjectDetection: boolean;
  objectKeywords: string[];
  manualReviewRequired: boolean;
}

export interface ProofReview {
  id: string;
  entryId: string;
  userId: string;
  challengeId: string;
  status: ProofStatus;
  confidenceScore: number;
  missingRequirements: string[];
  reviewNotes: string;
  reviewedAt: string;
}

export interface AIAnalysis {
  contains_required_subject: boolean;
  visible_evidence: string[];
  missing_evidence: string[];
  confidence: number;
  reason: string;
  suggested_lore_tags: string[];
}
