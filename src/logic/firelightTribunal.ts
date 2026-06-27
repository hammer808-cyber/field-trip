export const SUS_DAILY_REPORT_LIMIT = 10;

export const SUS_ACTIVE_STATUSES = ['pending', 'escalated_to_tribunal', 'request_clarification'] as const;
export const SUS_REVIEW_STATUSES = ['pending', 'dismissed', 'resolved', 'request_clarification', 'escalated_to_tribunal'] as const;
export const TRIBUNAL_CASE_STATUSES = ['admin_review', 'open', 'closed', 'dismissed'] as const;
export const TRIBUNAL_VERDICTS = ['valid', 'sus'] as const;
export const PUBLIC_TRIBUNAL_CASE_FIELDS = [
  'caseId',
  'id',
  'entryId',
  'targetUserId',
  'targetId',
  'status',
  'seasonId',
  'weekNumber',
  'title',
  'description',
  'proofImage',
  'playerName',
  'fieldNote',
  'missionTitle',
  'deckName',
  'validVotes',
  'susVotes',
  'totalVotes',
  'openedBy',
  'openedAt',
  'adminReviewedBy',
  'adminReviewedAt',
  'createdAt',
  'updatedAt',
  'closedBy',
  'closedAt',
  'outcome',
  'resultSnapshotId'
] as const;

export const PRIVATE_TRIBUNAL_CASE_FIELDS = [
  'reporterId',
  'reporterIds',
  'sourceReportIds',
  'adminPrivateNotes',
  'escalationReason',
  'adminNotes'
] as const;

export type SusActiveStatus = typeof SUS_ACTIVE_STATUSES[number];
export type SusReviewStatus = typeof SUS_REVIEW_STATUSES[number];
export type TribunalCaseStatus = typeof TRIBUNAL_CASE_STATUSES[number];
export type TribunalVerdict = typeof TRIBUNAL_VERDICTS[number];
export type LegacyTribunalVerdict = TribunalVerdict | 'agree' | 'disagree';

export const FIRELIGHT_TRIBUNAL_COMPATIBILITY_NOTE =
  'Firelight Tribunal is separate from Weekly Voting. Sus signals are private admin-review inputs; Tribunal votes are public-case recommendations only and never mutate proof status or points.';

export const TRIBUNAL_REPAIR_CONFIRMATION = 'REPAIR TRIBUNAL DATA';

export type TribunalDiagnosticDoc = {
  id: string;
  data: Record<string, any>;
};

export type TribunalDiagnosticIssue = {
  id: string;
  proposedAction: string;
  fields?: string[];
  vote?: string;
  repairable: boolean;
  reason?: string;
};

export type TribunalDiagnosticsReport = {
  counts: {
    publicCasesWithForbiddenFields: number;
    legacyVotes: number;
    closedCasesMissingResults: number;
    cannotSafelyRepair: number;
  };
  samples: {
    publicCasesWithForbiddenFields: TribunalDiagnosticIssue[];
    legacyVotes: TribunalDiagnosticIssue[];
    closedCasesMissingResults: TribunalDiagnosticIssue[];
    cannotSafelyRepair: TribunalDiagnosticIssue[];
  };
  criticalFailures: number;
  canApplyRepairs: boolean;
};

export function getSusReportId(reporterId: string, entryId: string): string {
  return `${reporterId}_${entryId}`;
}

export function getSusDailyCounterId(reporterId: string, dayKey: string): string {
  return `${reporterId}_${dayKey}`;
}

export function getTribunalVoteId(userId: string, caseId: string): string {
  return `${userId}_${caseId}`;
}

export function isActiveSusReportStatus(status: unknown): status is SusActiveStatus {
  return SUS_ACTIVE_STATUSES.includes(status as SusActiveStatus);
}

export function isSusReviewStatus(status: unknown): status is SusReviewStatus {
  return SUS_REVIEW_STATUSES.includes(status as SusReviewStatus);
}

export function isTribunalVerdict(vote: unknown): vote is TribunalVerdict {
  return TRIBUNAL_VERDICTS.includes(vote as TribunalVerdict);
}

export function canonicalTribunalVerdict(input: LegacyTribunalVerdict): TribunalVerdict {
  if (input === 'agree') return 'valid';
  if (input === 'disagree') return 'sus';
  return input;
}

export function isPublicTribunalStatus(status: unknown): boolean {
  return status === 'open' || status === 'closed';
}

export function canSubmitSusReport(reporterId: string, targetUserId: string): boolean {
  return !!reporterId && !!targetUserId && reporterId !== targetUserId;
}

export function getUtcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getTribunalOutcome(validVotes: number, susVotes: number) {
  return susVotes > validVotes ? 'community_sus_recommendation' : 'community_valid_recommendation';
}

export function getPublicTribunalCaseData(caseData: Record<string, any>) {
  const publicData: Record<string, any> = {};
  for (const field of PUBLIC_TRIBUNAL_CASE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(caseData, field)) {
      publicData[field] = caseData[field];
    }
  }
  return publicData;
}

export function getPublicTribunalCasePrivateFieldViolations(caseData: Record<string, any>): string[] {
  return PRIVATE_TRIBUNAL_CASE_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(caseData, field));
}

export function canonicalizeLegacyTribunalVote(vote: unknown): TribunalVerdict | null {
  if (vote === 'agree') return 'valid';
  if (vote === 'disagree') return 'sus';
  if (isTribunalVerdict(vote)) return vote;
  return null;
}

export function canBackfillTribunalResult(caseData: Record<string, any>): boolean {
  return caseData.status === 'closed' &&
    !!caseData.entryId &&
    !!caseData.seasonId &&
    Number.isFinite(Number(caseData.weekNumber)) &&
    Number.isFinite(Number(caseData.validVotes)) &&
    Number.isFinite(Number(caseData.susVotes));
}

export function buildTribunalResultSnapshot(caseId: string, caseData: Record<string, any>, actorId: string, timestamp: any) {
  const validVotes = Number(caseData.validVotes || 0);
  const susVotes = Number(caseData.susVotes || 0);
  const totalVotes = Number(caseData.totalVotes ?? validVotes + susVotes);
  return {
    caseId,
    entryId: caseData.entryId,
    seasonId: caseData.seasonId,
    weekNumber: Number(caseData.weekNumber),
    validVotes,
    susVotes,
    totalVotes,
    outcome: caseData.outcome || getTribunalOutcome(validVotes, susVotes),
    recommendationOnly: true,
    backfilledBy: actorId,
    backfilledAt: timestamp,
    finalizedBy: caseData.closedBy || actorId,
    finalizedAt: caseData.closedAt || timestamp,
    caseSnapshot: getPublicTribunalCaseData(caseData),
    compatibility: FIRELIGHT_TRIBUNAL_COMPATIBILITY_NOTE
  };
}

export function buildTribunalDiagnosticsReport(
  cases: TribunalDiagnosticDoc[],
  votes: TribunalDiagnosticDoc[],
  resultIds: Set<string>,
  sampleLimit = 8
): TribunalDiagnosticsReport {
  const publicCasesWithForbiddenFields = cases
    .map(doc => ({
      id: doc.id,
      fields: getPublicTribunalCasePrivateFieldViolations(doc.data),
      proposedAction: 'Move private reporter/source linkage to tribunalCasePrivate and delete forbidden fields from public tribunalCases.',
      repairable: true
    }))
    .filter(issue => issue.fields.length > 0);

  const legacyVotes = votes
    .map(doc => ({
      id: doc.id,
      vote: String(doc.data.vote || ''),
      proposedAction: doc.data.vote === 'agree'
        ? 'Convert vote from agree to valid.'
        : doc.data.vote === 'disagree'
          ? 'Convert vote from disagree to sus.'
          : 'No action.',
      repairable: doc.data.vote === 'agree' || doc.data.vote === 'disagree'
    }))
    .filter(issue => issue.repairable);

  const closedCasesMissingResults = cases
    .filter(doc => doc.data.status === 'closed' && !resultIds.has(doc.id))
    .map(doc => {
      const repairable = canBackfillTribunalResult(doc.data);
      return {
        id: doc.id,
        proposedAction: repairable
          ? 'Create tribunalResults snapshot from canonical closed case counts.'
          : 'Manual admin review required before result snapshot can be backfilled.',
        repairable,
        reason: repairable ? undefined : 'Missing required closed case fields or canonical valid/sus counts.'
      };
    });

  const cannotSafelyRepair = closedCasesMissingResults.filter(issue => !issue.repairable);

  return {
    counts: {
      publicCasesWithForbiddenFields: publicCasesWithForbiddenFields.length,
      legacyVotes: legacyVotes.length,
      closedCasesMissingResults: closedCasesMissingResults.length,
      cannotSafelyRepair: cannotSafelyRepair.length
    },
    samples: {
      publicCasesWithForbiddenFields: publicCasesWithForbiddenFields.slice(0, sampleLimit),
      legacyVotes: legacyVotes.slice(0, sampleLimit),
      closedCasesMissingResults: closedCasesMissingResults.slice(0, sampleLimit),
      cannotSafelyRepair: cannotSafelyRepair.slice(0, sampleLimit)
    },
    criticalFailures: publicCasesWithForbiddenFields.length + legacyVotes.length + cannotSafelyRepair.length,
    canApplyRepairs: publicCasesWithForbiddenFields.length + legacyVotes.length + closedCasesMissingResults.filter(issue => issue.repairable).length > 0
  };
}
