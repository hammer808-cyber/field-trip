export type MetadataStatus = 'verified' | 'missing' | 'mismatch' | 'unverified';
export type CaptureTrustLevel = 'live' | 'verifiedCameraRoll' | 'unverifiedCameraRoll';
export type ReviewStatus = 'approved' | 'pending_review' | 'rejected' | 'needs_more_proof';
export type UploadSource = 'camera' | 'cameraRoll';

export interface ProofReview {
  reviewId: string;
  entryId: string;
  userId: string;
  challengeId: string;
  deckId: string;

  status: ReviewStatus;
  photoUrl: string;
  imageUrl: string;
  storagePath: string | null;
  fieldNote: string;

  missionDrawnAt: string | null;
  capturedAt: string | null;
  uploadedAt: string;
  captureSource: string;

  proofChallengeCode: string | null;
  proofChallengeInstruction: string | null;
  proofChallengeConfirmed: boolean;

  metadata: {
    hasExif: boolean;
    cameraMake: string | null;
    cameraModel: string | null;
    createdAt: string | null;
    editingSoftware: string | null;
    gpsPresent: boolean;
    width: number;
    height: number;
  };

  verification: {
    aiRiskScore: number;
    proofTrustScore: number;
    riskLevel: string;
    riskReasons: string[];
    duplicateStatus: string;
    imageHash: string;
    perceptualHash: string;
    missionMatchScore: number;
    receiptChallengeResult?: any;
  };

  xpAwarded: boolean;
  confidenceScore?: number;
  missingRequirements?: string[];
  metadataSummary?: string;
  receiptChallengeResult?: any;
  findingType?: string | null;
  createdAt: any;
  updatedAt: any;
  
  // Legacy fields for compatibility
  id: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ProofRequirement {
  id: string;
  type: string;
  description: string;
  required: boolean;
  version?: string | number;
  objectKeywords?: string[];
  minimumPhotoCount?: number;
  requiresFieldNote?: boolean;
  requiresTimeWindow?: boolean;
  startTime?: string;
  endTime?: string;
  requiresObjectDetection?: boolean;
}

export type ProofStatus = ReviewStatus;

export interface ProofCheck {
  id?: string;
  status: ProofStatus;
  reason?: string;
  inputs?: any;
  confidenceScore?: number;
  missingRequirements?: string[];
  imageAnalysis?: AIAnalysis;
  cacheKey?: string;
  submissionId?: string;
  challengeId?: string;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AIAnalysis {
  // Common detector state fields
  status: "idle" | "analyzing" | "detected" | "not_detected" | "error" | "skipped" | "manual_review_required";
  requiredSubject: string;
  detectedSubject: boolean;
  confidence: number;
  detectedItems: string[];
  missingItems: string[];
  displayTitle: string;
  displayDetail: string;
  missionMatchScore: number;
  analyzedAt?: any; // timestamp
  modelUsed?: string;
  
  // Legacy or auxiliary fields
  labels?: string[];
  flagged?: boolean;
  reason?: string;
  visible_evidence?: string[];
  suggested_lore_tags?: string[];
}

export interface ImageMetadata {
  dateTimeOriginal?: string;
  createDate?: string;
  modifyDate?: string;
  fileLastModified?: number;
  photoTakenAt?: string;
  metadataStatus: MetadataStatus;
  latitude?: number | null;
  longitude?: number | null;
  make?: string;
  model?: string;
  software?: string;
}

export interface FilterSettings {
  id: string;
  name: string;
  intensity: number;
}

export const VIEWFINDER_FILTERS = [
  { id: 'original', name: 'Fieldtrip Original' },
  { id: 'disposable', name: 'Disposable' },
  { id: 'sunburnt', name: 'Sunburnt' },
  { id: 'photobooth', name: 'Mall Photo Booth' },
  { id: 'digital2003', name: '2003 Digital Camera' },
  { id: 'evidence', name: 'Summer Evidence' },
  { id: 'footage', name: 'Found Footage' },
  { id: 'blacktop', name: 'Blacktop Heatwave' },
  { id: 'polaroid', name: 'Polaroid Fade' },
  { id: 'night', name: 'Night Mission' }
] as const;

export type ViewfinderFilterId = typeof VIEWFINDER_FILTERS[number]['id'];

export interface ProofSubmission {
  id: string;
  userId: string;
  challengeId: string;
  uploadSource: UploadSource;
  
  // Metadata fields
  photoTakenAt: string | null; // ISO string
  fileLastModifiedAt: string | null;
  submittedAt: string; // ISO string
  metadataStatus: MetadataStatus;
  captureTrustLevel: CaptureTrustLevel;
  
  // Images
  originalImageUrl: string;
  filteredImageUrl: string;
  
  // Filter info
  filterUsed: ViewfinderFilterId;
  filterIntensity: number;
  
  // Review info
  reviewStatus: ReviewStatus;
}
