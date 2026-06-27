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
  if (input === 'agree') return 'sus';
  if (input === 'disagree') return 'valid';
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
