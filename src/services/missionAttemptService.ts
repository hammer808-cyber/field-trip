import { authenticatedFetch } from '../lib/api';
import type {
  BonusEligibility,
  MissionAttemptHintState,
  MissionHint,
} from '../logic/missionScoring';

export interface MissionAttemptRecord extends MissionAttemptHintState {
  attemptId: string;
  userId: string;
  missionId: string;
  deckId: string | null;
  status: 'active' | 'pending_review' | 'needs_more_proof' | 'approved' | 'rejected';
  startedAt: string;
  timezone: string;
  localEligibilityDate: string;
  potentialMaxScoreAfterHint: number;
  eligibleBonuses: BonusEligibility[];
  appliedBonus: BonusEligibility | null;
  rotationId: string;
  entryId?: string | null;
  hint: MissionHint;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `MISSION_ATTEMPT_REQUEST_FAILED_${response.status}`);
    (error as any).details = payload?.details || null;
    throw error;
  }
  return payload as T;
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
  } catch {
    return 'America/Los_Angeles';
  }
}

export async function startOrResumeMissionAttempt(
  missionId: string,
  timezone = getBrowserTimezone(),
): Promise<MissionAttemptRecord> {
  const response = await authenticatedFetch('/api/missions/attempts/start', {
    method: 'POST',
    body: JSON.stringify({ missionId, timezone }),
  });
  return parseApiResponse<MissionAttemptRecord>(response);
}

export async function revealMissionHint(attemptId: string): Promise<MissionAttemptRecord> {
  const response = await authenticatedFetch('/api/missions/attempts/hint', {
    method: 'POST',
    body: JSON.stringify({ attemptId }),
  });
  return parseApiResponse<MissionAttemptRecord>(response);
}

export async function linkMissionAttemptToEntry(
  attemptId: string,
  entryId: string,
): Promise<MissionAttemptRecord> {
  const response = await authenticatedFetch('/api/missions/attempts/link-entry', {
    method: 'POST',
    body: JSON.stringify({ attemptId, entryId }),
  });
  return parseApiResponse<MissionAttemptRecord>(response);
}
