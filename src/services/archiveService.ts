import { authenticatedFetch } from '../lib/api';

export interface ArchivePreviewInput {
  startAt: string;
  endAt: string;
  statuses: string[];
}

export interface ArchiveRunInput {
  startAt: string;
  endAt: string;
  statuses: string[];
  includeSubmissions: boolean;
  includeProofReviews: boolean;
  reverseXp: boolean;
  confirmationText: string;
}

export interface ArchivePreviewResult {
  success: boolean;
  count: number;
  countByStatus: Record<string, number>;
  countByDeck: Record<string, number>;
  countByUser: Record<string, number>;
  totalAwardedXp: number;
  proofReviewCount: number;
  alreadyArchivedCount: number;
  sampleSubmissionIds: string[];
}

export interface ArchiveRunResult {
  success: boolean;
  archiveBatchId: string;
  submissionsMatched: number;
  submissionsArchived: number;
  proofReviewsArchived: number;
  xpReversedTotal: number;
  usersUpdated: number;
  errors: string[];
}

export interface ArchiveBatch {
  id: string;
  archiveBatchId: string;
  type: string;
  startAt: string;
  endAt: string;
  statuses: string[];
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  submissionsMatched: number;
  submissionsArchived: number;
  proofReviewsArchived: number;
  reverseXp: boolean;
  xpReversedTotal: number;
  usersUpdated: number;
  errors?: string[];
  notes?: string;
}

export async function previewSubmissionArchive(input: ArchivePreviewInput): Promise<ArchivePreviewResult> {
  const response = await authenticatedFetch('/api/admin/previewSubmissionArchive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Preview failed');
  }
  return response.json();
}

export async function runSubmissionArchive(input: ArchiveRunInput): Promise<ArchiveRunResult> {
  const response = await authenticatedFetch('/api/admin/runSubmissionArchive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Run archive failed');
  }
  return response.json();
}

export async function getArchiveHistory(): Promise<ArchiveBatch[]> {
  const response = await authenticatedFetch('/api/admin/archive-history', {
    method: 'GET'
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to fetch history');
  }
  const data = await response.json();
  return data.batches;
}
