import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { authenticatedFetch } from '../lib/api';
import { db } from '../lib/firebase';
import {
  WEEKLY_VOTE_CATEGORIES,
  getWeeklyBallotEmptyReason,
  getWeeklyBallotLookup,
  normalizeWeeklyCandidateCategories,
  type WeeklyBallotEmptyReason,
  type WeeklyBallotLookup,
  type WeeklyVoteCategory,
} from '../logic/weeklyVoting';
import {
  FIELDTRIP_VOTING_TIMEZONE,
  getCurrentVotingCycle,
  type VotingCycleStatus,
} from './votingCycleService';
import {
  getWeeklyCategoryBallotId,
  getWeeklyCategoryFromBallotId,
} from '../logic/weeklyCategories';

export type WeeklyBallotSource = 'canonical' | 'legacy' | 'none';

export interface WeeklyBallotCandidateRecord {
  id: string;
  entryId: string;
  userId: string;
  categories: WeeklyVoteCategory[];
  [key: string]: unknown;
}

export interface WeeklyBallotReadModel {
  lookup: WeeklyBallotLookup;
  source: WeeklyBallotSource;
  cycleStatus: VotingCycleStatus;
  ballotStatus: string | null;
  ballotExists: boolean;
  nominees: WeeklyBallotCandidateRecord[];
  nomineeCountByCategory: Record<WeeklyVoteCategory, number>;
  maxVotesPerVoter: number;
  existingSelectedProofIds: string[];
  reason: WeeklyBallotEmptyReason;
  diagnosticMessage: string | null;
}

export interface CanonicalWeeklyBallotVoteRequest {
  cycleId: string;
  ballotId: string;
  selectedProofIds: string[];
}

export interface WeeklyCycleDiagnostics {
  success: boolean;
  seasonId: string;
  weekNumber: number;
  season: {
    configuredActiveSeasonId: string | null;
    startsAt: string | null;
    endsAt: string | null;
    status: string;
    computedCurrentWeek: number;
    computedWeekId: string | null;
    configuredWeekFound: boolean;
    configuredWeekStartsAt: string | null;
    timingSource: string;
  };
  cycle: {
    id: string;
    timezone: string;
    status: string;
    submissionStartsAt: string;
    submissionEndsAt: string;
    ballotLocksAt: string;
    votingStartsAt: string;
    votingEndsAt: string;
    resultsPublishAt: string;
  };
  catalyst: {
    documentId: string;
    title: string | null;
    configured: boolean;
    source: 'firestore' | 'fallback' | 'missing';
    fallbackTemplateWeekNumber: number | null;
  };
  ballot: {
    canonicalBallotId: string;
    canonicalBallotCount: number;
    canonicalBallotStatus: string | null;
    canonicalResultExists: boolean;
    legacyBallotId: string;
    legacyBallotExists: boolean;
    categoryCount: number;
    nomineeCount: number;
    nomineeCountByCategory: Record<string, number>;
    hiddenReason: string | null;
    exclusionReasonCounts: Record<string, number>;
    excludedProofSamples: Array<{ entryId: string; reasons: string[] }>;
    clientQueryRequirements: string[];
  };
  counts: Record<string, number | boolean>;
  duplicateSlots: unknown[];
  malformedVoteIds: string[];
  invalidVotes: unknown[];
  canonicalIssues: unknown[];
  staleCycles: unknown[];
  missingResultSnapshots: string[];
  warnings: string[];
}

function getErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code || '');
  }
  return error instanceof Error ? error.message : String(error || '');
}

function normalizeCandidate(id: string, data: Record<string, unknown>): WeeklyBallotCandidateRecord {
  return {
    ...data,
    id,
    entryId: String(data.entryId || data.proofId || id),
    userId: String(data.userId || data.uid || data.ownerId || ''),
    categories: normalizeWeeklyCandidateCategories(data.categories),
  };
}

function getNomineeCounts(nominees: WeeklyBallotCandidateRecord[]) {
  return Object.fromEntries(WEEKLY_VOTE_CATEGORIES.map(category => [
    category,
    nominees.filter(candidate => candidate.categories.includes(category)).length,
  ])) as Record<WeeklyVoteCategory, number>;
}

function emptyReadModel(
  lookup: WeeklyBallotLookup,
  cycleStatus: VotingCycleStatus,
  errorCode?: string
): WeeklyBallotReadModel {
  return {
    lookup,
    source: 'none',
    cycleStatus,
    ballotStatus: null,
    ballotExists: false,
    nominees: [],
    nomineeCountByCategory: getNomineeCounts([]),
    maxVotesPerVoter: 3,
    existingSelectedProofIds: [],
    reason: getWeeklyBallotEmptyReason({ cycleStatus, ballotExists: false, nomineeCount: 0, errorCode }),
    diagnosticMessage: errorCode || null,
  };
}

export async function loadWeeklyBallot(params: {
  seasonId: string;
  weekNumber: number;
  now: Date;
  userId?: string | null;
}): Promise<WeeklyBallotReadModel> {
  const { seasonId, weekNumber, now, userId } = params;
  const lookup = getWeeklyBallotLookup(seasonId, weekNumber, now);
  const currentCycle = getCurrentVotingCycle(now, FIELDTRIP_VOTING_TIMEZONE, seasonId);

  try {
    const canonicalBallotRef = doc(db, lookup.canonicalBallotPath);
    const canonicalBallotSnap = await getDoc(canonicalBallotRef);
    if (canonicalBallotSnap.exists()) {
      const ballotData = canonicalBallotSnap.data();
      const ballotStatus = String(ballotData.status || '');
      const hasFrozenEligibleIds = Array.isArray(ballotData.eligibleProofIds);
      const eligibleProofIds = new Set(
        hasFrozenEligibleIds
          ? ballotData.eligibleProofIds.map(String)
          : []
      );
      const nomineesSnap = await getDocs(collection(db, lookup.canonicalEntriesPath));
      const nominees = nomineesSnap.docs
        .map(candidate => normalizeCandidate(candidate.id, candidate.data()))
        .filter(candidate =>
          candidate.entryId &&
          candidate.userId &&
          candidate.isEligible !== false &&
          candidate.isDisqualified !== true &&
          (!hasFrozenEligibleIds || eligibleProofIds.has(candidate.entryId))
        );
      let existingSelectedProofIds: string[] = [];
      if (userId) {
        const voteSnap = await getDoc(doc(db, `${lookup.canonicalBallotPath}/votes/${userId}`));
        if (voteSnap.exists()) {
          existingSelectedProofIds = Array.isArray(voteSnap.data().selectedProofIds)
            ? voteSnap.data().selectedProofIds.map(String)
            : [];
        }
      }
      const baseReason = getWeeklyBallotEmptyReason({
        cycleStatus: currentCycle.status,
        ballotExists: true,
        nomineeCount: nominees.length,
      });
      const reason = currentCycle.status === 'voting_open' && !['locked', 'open'].includes(ballotStatus)
        ? ballotStatus === 'closed' || ballotStatus === 'calculated' || ballotStatus === 'published'
          ? 'voting_closed'
          : 'voting_opens_soon'
        : baseReason;
      return {
        lookup,
        source: 'canonical',
        cycleStatus: currentCycle.status,
        ballotStatus,
        ballotExists: true,
        nominees,
        nomineeCountByCategory: getNomineeCounts(nominees),
        maxVotesPerVoter: Math.max(1, Number(ballotData.maxVotesPerVoter || 3)),
        existingSelectedProofIds,
        reason,
        diagnosticMessage: null,
      };
    }
  } catch (error) {
    const errorCode = getErrorCode(error);
    console.warn('[WeeklyVoting] Canonical ballot read failed:', errorCode);
    return emptyReadModel(lookup, currentCycle.status, errorCode);
  }

  // Historical compatibility is read-only here. New ballot generation and
  // canonical votes remain under votingCycles/{cycleId}.
  try {
    const legacyBallotRef = doc(db, 'weeklyBallots', lookup.legacyBallotId);
    const legacyBallotSnap = await getDoc(legacyBallotRef);
    if (legacyBallotSnap.exists()) {
      const ballotData = legacyBallotSnap.data();
      const nomineesSnap = await getDocs(collection(db, 'weeklyBallots', lookup.legacyBallotId, 'candidates'));
      const nominees = nomineesSnap.docs
        .map(candidate => normalizeCandidate(candidate.id, candidate.data()))
        .filter(candidate => candidate.entryId && candidate.userId && candidate.isEligible !== false && candidate.isDisqualified !== true);
      const legacyReason = currentCycle.status === 'voting_open'
        ? 'schema_mismatch'
        : getWeeklyBallotEmptyReason({
          cycleStatus: currentCycle.status,
          ballotExists: true,
          nomineeCount: nominees.length,
        });
      return {
        lookup,
        source: 'legacy',
        cycleStatus: currentCycle.status,
        ballotStatus: String(ballotData.phase || ''),
        ballotExists: true,
        nominees,
        nomineeCountByCategory: getNomineeCounts(nominees),
        maxVotesPerVoter: WEEKLY_VOTE_CATEGORIES.length,
        existingSelectedProofIds: [],
        reason: legacyReason,
        diagnosticMessage: currentCycle.status === 'voting_open'
          ? 'canonical_ballot_required_for_new_votes'
          : 'legacy_weekly_ballot_compatibility',
      };
    }

    const flatCandidates = await getDocs(query(
      collection(db, 'ballotCandidates'),
      where('seasonId', '==', seasonId),
      where('weekNumber', '==', weekNumber)
    ));
    if (!flatCandidates.empty) {
      const nominees = flatCandidates.docs.map(candidate => normalizeCandidate(candidate.id, candidate.data()));
      return {
        ...emptyReadModel(lookup, currentCycle.status),
        source: 'legacy',
        nominees,
        nomineeCountByCategory: getNomineeCounts(nominees),
        diagnosticMessage: 'flat_candidates_exist_but_ballot_not_generated',
      };
    }
    return emptyReadModel(lookup, currentCycle.status);
  } catch (error) {
    const errorCode = getErrorCode(error);
    console.warn('[WeeklyVoting] Legacy compatibility read failed:', errorCode);
    return emptyReadModel(lookup, currentCycle.status, errorCode);
  }
}

export async function castCanonicalWeeklyVote(request: CanonicalWeeklyBallotVoteRequest): Promise<void> {
  const response = await authenticatedFetch('/api/voting/weekly/vote', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'WEEKLY_VOTE_FAILED');
  }
}

// ---------------------------------------------------------------------------
// Slice 2 (Nov 21, 2026): six per-award category ballots, canonical
// results, lazy finalize, admin candidate moves. Scope stays
// community_weekly; crew ballots are out of scope for this slice.
// ---------------------------------------------------------------------------

export interface WeeklyCategoryBallotReadModel {
  category: WeeklyVoteCategory;
  ballotId: string;
  ballotStatus: string | null;
  ballotExists: boolean;
  nominees: WeeklyBallotCandidateRecord[];
  maxVotesPerVoter: number;
  existingSelectedProofIds: string[];
  reason: WeeklyBallotEmptyReason;
}

export interface WeeklyCategoryBallotsReadModel {
  cycleId: string;
  seasonId: string;
  ballots: WeeklyCategoryBallotReadModel[];
  /** True when at least one of the six category ballots exists. */
  anyBallotExists: boolean;
}

async function readCategoryBallot(input: {
  cycleId: string;
  category: WeeklyVoteCategory;
  cycleStatus: VotingCycleStatus;
  userId?: string | null;
}): Promise<WeeklyCategoryBallotReadModel> {
  const { cycleId, category, cycleStatus, userId } = input;
  const ballotId = getWeeklyCategoryBallotId(cycleId, category);
  const ballotPath = `votingCycles/${cycleId}/ballots/${ballotId}`;
  const ballotSnap = await getDoc(doc(db, ballotPath));
  if (!ballotSnap.exists()) {
    return {
      category,
      ballotId,
      ballotStatus: null,
      ballotExists: false,
      nominees: [],
      maxVotesPerVoter: 1,
      existingSelectedProofIds: [],
      reason: getWeeklyBallotEmptyReason({ cycleStatus, ballotExists: false, nomineeCount: 0 }),
    };
  }
  const ballotData = ballotSnap.data();
  const ballotStatus = String(ballotData.status || '');
  const hasFrozenEligibleIds = Array.isArray(ballotData.eligibleProofIds);
  const eligibleProofIds = new Set(
    hasFrozenEligibleIds ? ballotData.eligibleProofIds.map(String) : [],
  );
  const nomineesSnap = await getDocs(collection(db, `${ballotPath}/entries`));
  const nominees = nomineesSnap.docs
    .map(candidate => normalizeCandidate(candidate.id, candidate.data()))
    .filter(candidate =>
      candidate.entryId &&
      candidate.userId &&
      candidate.isEligible !== false &&
      candidate.isDisqualified !== true &&
      (!hasFrozenEligibleIds || eligibleProofIds.has(candidate.entryId))
    );
  let existingSelectedProofIds: string[] = [];
  if (userId) {
    const voteSnap = await getDoc(doc(db, `${ballotPath}/votes/${userId}`));
    if (voteSnap.exists()) {
      existingSelectedProofIds = Array.isArray(voteSnap.data().selectedProofIds)
        ? voteSnap.data().selectedProofIds.map(String)
        : [];
    }
  }
  const baseReason = getWeeklyBallotEmptyReason({
    cycleStatus,
    ballotExists: true,
    nomineeCount: nominees.length,
  });
  const reason = cycleStatus === 'voting_open' && !['locked', 'open'].includes(ballotStatus)
    ? ballotStatus === 'closed' || ballotStatus === 'calculated' || ballotStatus === 'published'
      ? 'voting_closed'
      : 'voting_opens_soon'
    : baseReason;
  return {
    category,
    ballotId,
    ballotStatus,
    ballotExists: true,
    nominees,
    maxVotesPerVoter: Math.max(1, Number(ballotData.maxVotesPerVoter || 1)),
    existingSelectedProofIds,
    reason,
  };
}

/**
 * Load all six category ballots for the current cycle — one ballot per
 * accolade, each with its own eligibleProofIds and maxVotesPerVoter=1.
 * Replaces the single-ballot load for the Slice 2 ballot UI; the old
 * loadWeeklyBallot stays for legacy fallback reads.
 */
export async function loadWeeklyCategoryBallots(params: {
  seasonId: string;
  weekNumber: number;
  now: Date;
  userId?: string | null;
}): Promise<WeeklyCategoryBallotsReadModel> {
  const { seasonId, now, userId } = params;
  const cycle = getCurrentVotingCycle(now, FIELDTRIP_VOTING_TIMEZONE, seasonId);
  const ballots = await Promise.all(
    WEEKLY_VOTE_CATEGORIES.map(category =>
      readCategoryBallot({ cycleId: cycle.id, category, cycleStatus: cycle.status, userId }).catch(error => {
        console.warn(`[WeeklyVoting] Category ballot read failed (${category}):`, getErrorCode(error));
        return {
          category,
          ballotId: getWeeklyCategoryBallotId(cycle.id, category),
          ballotStatus: null,
          ballotExists: false,
          nominees: [],
          maxVotesPerVoter: 1,
          existingSelectedProofIds: [],
          reason: getWeeklyBallotEmptyReason({
            cycleStatus: cycle.status,
            ballotExists: false,
            nomineeCount: 0,
            errorCode: getErrorCode(error),
          }),
        } satisfies WeeklyCategoryBallotReadModel;
      }),
    ),
  );
  return {
    cycleId: cycle.id,
    seasonId,
    ballots,
    anyBallotExists: ballots.some(ballot => ballot.ballotExists),
  };
}

export interface CanonicalWeeklyWinner {
  entryId: string;
  userId: string;
  displayName: string;
  voteTotal: number;
}

export interface CanonicalWeeklyResult {
  ballotId: string;
  category: WeeklyVoteCategory;
  cycleId: string;
  isFinal: boolean;
  winner: CanonicalWeeklyWinner | null;
  validVoteCount: number;
}

/**
 * Read the CANONICAL results for a cycle: one doc per category ballot
 * at votingCycles/{cycleId}/results/{ballotId}, each with a single
 * winner (or null when nothing was finalized). A missing or
 * non-final doc reads as null for that award — never a fake winner.
 */
export async function loadCanonicalWeeklyResults(
  cycleId: string,
): Promise<Record<WeeklyVoteCategory, CanonicalWeeklyResult | null>> {
  const results = {} as Record<WeeklyVoteCategory, CanonicalWeeklyResult | null>;
  await Promise.all(
    WEEKLY_VOTE_CATEGORIES.map(async category => {
      const ballotId = getWeeklyCategoryBallotId(cycleId, category);
      try {
        const resultSnap = await getDoc(doc(db, `votingCycles/${cycleId}/results/${ballotId}`));
        if (!resultSnap.exists()) {
          results[category] = null;
          return;
        }
        const data = resultSnap.data() || {};
        const parsedCategory = getWeeklyCategoryFromBallotId(String(data.ballotId || ballotId), cycleId) || category;
        const winner = data.winner && (data.winner.entryId || data.winner.proofId)
          ? {
            entryId: String(data.winner.entryId || data.winner.proofId),
            userId: String(data.winner.userId || ''),
            displayName: String(data.winner.displayName || data.winner.userName || 'Field Agent'),
            voteTotal: Number(data.winner.voteTotal || 0),
          }
          : null;
        results[category] = {
          ballotId,
          category: parsedCategory,
          cycleId,
          isFinal: data.isFinal === true,
          winner,
          validVoteCount: Number(data.validVoteCount || 0),
        };
      } catch (error) {
        console.warn(`[WeeklyVoting] Canonical result read failed (${category}):`, getErrorCode(error));
        results[category] = null;
      }
    }),
  );
  return results;
}

export interface FinalizeIfDueResult {
  due: boolean;
  reason: string;
  cycleId: string;
  finalized?: unknown;
}

/**
 * Ask the server to lazily finalize the current cycle if the Saturday
 * voting window has closed and results are not published yet. Never
 * throws: a failed call (network, auth, server error) logs and returns
 * null so the voting page keeps working — results simply stay
 * unpublished until the next load.
 */
export async function finalizeWeeklyResultsIfDue(input: {
  seasonId: string;
  cycleId?: string;
}): Promise<FinalizeIfDueResult | null> {
  try {
    const response = await authenticatedFetch('/api/voting/weekly/finalize-if-due', {
      method: 'POST',
      body: JSON.stringify({ seasonId: input.seasonId, ...(input.cycleId ? { cycleId: input.cycleId } : {}) }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.warn('[WeeklyVoting] finalize-if-due rejected:', error.error || response.status);
      return null;
    }
    const data = await response.json().catch(() => ({}));
    return {
      due: data.due === true,
      reason: String(data.reason || ''),
      cycleId: String(data.cycleId || input.cycleId || ''),
      finalized: data.finalized,
    };
  } catch (error) {
    console.warn('[WeeklyVoting] finalize-if-due call failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export interface MoveWeeklyCandidateInput {
  seasonId: string;
  cycleId: string;
  fromBallotId: string;
  toBallotId: string;
  entryId: string;
  reason: string;
}

/**
 * Move one candidate between two category ballots in the same week
 * (admin-only). The server refuses once ballots are locked
 * (BALLOT_ALREADY_FROZEN) — the error code is thrown as the message so
 * the admin UI can surface the refusal plainly.
 */
export async function moveWeeklyCandidate(input: MoveWeeklyCandidateInput): Promise<unknown> {
  const response = await authenticatedFetch('/api/admin/voting/move-candidate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'WEEKLY_CANDIDATE_MOVE_FAILED');
  }
  return response.json();
}

export async function previewWeeklyVotingDiagnostics(
  seasonId?: string,
  weekNumber?: number
): Promise<WeeklyCycleDiagnostics> {
  const params = new URLSearchParams();
  if (seasonId) params.set('seasonId', seasonId);
  if (weekNumber && weekNumber > 0) params.set('weekNumber', String(weekNumber));
  const response = await authenticatedFetch(`/api/admin/voting/diagnostics?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'WEEKLY_DIAGNOSTICS_FAILED');
  }
  return response.json();
}

export async function buildCurrentWeeklyBallot(input: {
  seasonId: string;
  weekNumber: number;
  cycleId: string;
  reason: string;
}): Promise<unknown> {
  const response = await authenticatedFetch('/api/admin/voting/build-weekly-ballot', {
    method: 'POST',
    body: JSON.stringify({
      seasonId: input.seasonId,
      weekNumber: input.weekNumber,
      cycleId: input.cycleId,
      scope: 'community_weekly',
      reason: input.reason,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'WEEKLY_BALLOT_BUILD_FAILED');
  }
  return response.json();
}
