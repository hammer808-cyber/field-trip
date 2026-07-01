import { authenticatedFetch } from '../lib/api';
import { getWeeklyVoteDocumentId } from '../logic/weeklyCycleLogic';

export interface WeeklyVoteRequest {
  weekId: string;
  entryId: string;
  slotOrCategory: string;
}

export interface WeeklyCycleDiagnostics {
  weekId: string;
  duplicateVotes: number;
  invalidVotes: number;
  staleCycles: number;
  missingResultSnapshots: number;
  legacyCompatibility: {
    preservedCollections: string[];
    migrationRequired: boolean;
  };
}

export function getCanonicalWeeklyVoteId(weekId: string, userId: string, slotOrCategory: string): string {
  return getWeeklyVoteDocumentId(weekId, userId, slotOrCategory);
}

export async function castCanonicalWeeklyVote(request: WeeklyVoteRequest): Promise<void> {
  const response = await authenticatedFetch('/api/voting/weekly/vote', {
    method: 'POST',
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'WEEKLY_VOTE_FAILED');
  }
}

export async function previewWeeklyVotingDiagnostics(seasonId: string, weekNumber: number): Promise<WeeklyCycleDiagnostics> {
  const params = new URLSearchParams({ seasonId, weekNumber: String(weekNumber) });
  const response = await authenticatedFetch(`/api/admin/voting/diagnostics?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'WEEKLY_DIAGNOSTICS_FAILED');
  }

  return response.json();
}
