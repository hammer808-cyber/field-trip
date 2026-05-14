export type MetadataStatus = 'verified' | 'missing' | 'mismatch' | 'unverified';
export type CaptureTrustLevel = 'live' | 'verifiedCameraRoll' | 'unverifiedCameraRoll';
export type ReviewStatus = 'approved' | 'pending' | 'pendingReview' | 'rejected' | 'autoRejected' | 'needsMoreProof';
export type UploadSource = 'camera' | 'cameraRoll';

export interface ProofReview {
  id: string;
  status: ReviewStatus;
  notes?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  entryId: string;
  challengeId: string;
  userId: string;
  confidenceScore?: number;
  missingRequirements?: string[];
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

export type ProofStatus = 'approved' | 'pending' | 'rejected' | 'needsMoreProof';

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
  labels: string[];
  confidence: number;
  flagged: boolean;
  contains_required_subject?: boolean;
  missing_evidence?: string[];
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
