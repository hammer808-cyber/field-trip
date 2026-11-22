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

/**
 * What the user sees when the server rate-limits a mission call
 * (Nov 21, 2026 — first-time-user blocker fix). The raw limiter error
 * is `TOO_MANY_AUTH_REQUESTS`; showing that string blocks the user
 * with jargon and no next step. A 429 is transient — the bucket refills
 * — so the message says what happened and what to do. Capture renders
 * this with its "Retry mission setup" button, so the user is never at
 * a dead end.
 */
export const RATE_LIMITED_MESSAGE =
  'Too many requests right now. Give it a minute, then try again.';

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(RATE_LIMITED_MESSAGE);
    }
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
