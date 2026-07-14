import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import {
  getCrossedLevels,
  getExplorerTypeLevelTitle,
  getLevelFromXp,
  getLevelTitle,
  getProgressionRewardsForLevels,
  normalizeLifetimeXp,
} from '../logic/playerLevel';

export interface TrustedXpAwardInput {
  userId: string;
  userName?: string | null;
  sourceType: string;
  sourceId: string;
  amount: number;
  metadata?: Record<string, unknown>;
  ledgerEventId?: string;
  compatibilityType?: string;
  entryId?: string | null;
  challengeId?: string | null;
  crewId?: string | null;
  awardWeeklyXp?: boolean;
  awardSeasonXp?: boolean;
}

export interface ProgressionAwardPlan {
  previousXp: number;
  updatedXp: number;
  fromLevel: number;
  toLevel: number;
  levelTitle: string;
  explorerLevelTitle: string;
  unlockedLevels: number[];
  allProgressionRewardIds: string[];
  newlyUnlockedRewardIds: string[];
}

export interface TrustedXpAwardResult extends ProgressionAwardPlan {
  awarded: boolean;
  duplicate: boolean;
  ledgerEventId: string;
  levelUpEventId: string | null;
  amount: number;
}

export interface ProgressionRepairPlan {
  userId: string;
  xp: number;
  expectedLevel: number;
  expectedLevelTitle: string;
  expectedProgressionRewardIds: string[];
  changes: Record<string, unknown>;
  reasons: string[];
}

export function isTrustedProofXpEligible(action: unknown, status: unknown, amount: unknown): boolean {
  return String(action || '') === 'approve'
    && String(status || '') === 'approved'
    && Number.isFinite(Number(amount))
    && Number(amount) > 0;
}

export function getLevelUpAcknowledgementError(event: Record<string, any> | null, userId: string): string | null {
  if (!event) return 'LEVEL_UP_EVENT_NOT_FOUND';
  if (String(event.userId || '') !== String(userId || '')) return 'LEVEL_UP_EVENT_FORBIDDEN';
  return null;
}

function cleanIdPart(value: unknown): string {
  return String(value || '').trim();
}

export function getProgressionLedgerId(userId: string, sourceType: string, sourceId: string): string {
  const digest = createHash('sha256')
    .update(`${cleanIdPart(userId)}|${cleanIdPart(sourceType)}|${cleanIdPart(sourceId)}`)
    .digest('hex')
    .slice(0, 40);
  return `xp_${digest}`;
}

export function getProgressionLevelUpEventId(ledgerEventId: string): string {
  return `level_${ledgerEventId}`;
}

function compactMetadata(metadata: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

function numericValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function allRewardIdsThroughLevel(level: number): string[] {
  const levels = Array.from({ length: Math.max(0, level - 1) }, (_, index) => index + 2);
  return getProgressionRewardsForLevels(levels).map(reward => reward.id);
}

export function buildProgressionRepairPlan(userId: string, userData: Record<string, any>): ProgressionRepairPlan {
  const xp = normalizeLifetimeXp(userData.xp ?? userData.points ?? 0);
  const expectedLevel = getLevelFromXp(xp);
  const expectedLevelTitle = getLevelTitle(expectedLevel);
  const existingRewardIds = Array.isArray(userData.progressionRewardIds)
    ? userData.progressionRewardIds.map(String)
    : [];
  const expectedProgressionRewardIds = Array.from(new Set([
    ...existingRewardIds,
    ...allRewardIdsThroughLevel(expectedLevel),
  ]));
  const changes: Record<string, unknown> = {};
  const reasons: string[] = [];

  if (Number(userData.level) !== expectedLevel) {
    changes.level = expectedLevel;
    reasons.push(userData.level == null ? 'missing_level' : 'stale_level');
  }
  if (String(userData.levelTitle || '') !== expectedLevelTitle) {
    changes.levelTitle = expectedLevelTitle;
    reasons.push(userData.levelTitle ? 'stale_level_title' : 'missing_level_title');
  }
  if (JSON.stringify(existingRewardIds) !== JSON.stringify(expectedProgressionRewardIds)) {
    changes.progressionRewardIds = expectedProgressionRewardIds;
    reasons.push('missing_progression_rewards');
  }

  return {
    userId,
    xp,
    expectedLevel,
    expectedLevelTitle,
    expectedProgressionRewardIds,
    changes,
    reasons,
  };
}

export function buildProgressionAwardPlan(input: {
  previousXp: unknown;
  amount: unknown;
  existingRewardIds?: readonly string[];
  explorerTypeId?: string | null;
}): ProgressionAwardPlan {
  const previousXp = normalizeLifetimeXp(input.previousXp);
  const amount = Math.max(0, Math.floor(Number(input.amount) || 0));
  const updatedXp = previousXp + amount;
  const fromLevel = getLevelFromXp(previousXp);
  const toLevel = getLevelFromXp(updatedXp);
  const unlockedLevels = getCrossedLevels(previousXp, updatedXp);
  const existingRewards = new Set(input.existingRewardIds || []);
  const allProgressionRewardIds = Array.from(new Set([
    ...existingRewards,
    ...allRewardIdsThroughLevel(toLevel),
  ]));
  const crossedRewardIds = getProgressionRewardsForLevels(unlockedLevels).map(reward => reward.id);
  const newlyUnlockedRewardIds = crossedRewardIds.filter(rewardId => !existingRewards.has(rewardId));

  return {
    previousXp,
    updatedXp,
    fromLevel,
    toLevel,
    levelTitle: getLevelTitle(toLevel),
    explorerLevelTitle: getExplorerTypeLevelTitle(toLevel, input.explorerTypeId),
    unlockedLevels,
    allProgressionRewardIds,
    newlyUnlockedRewardIds,
  };
}

export async function awardTrustedXpInTransaction(params: {
  db: Firestore;
  transaction: Transaction;
  input: TrustedXpAwardInput;
}): Promise<TrustedXpAwardResult> {
  const { db, transaction, input } = params;
  const userId = cleanIdPart(input.userId);
  const sourceType = cleanIdPart(input.sourceType);
  const sourceId = cleanIdPart(input.sourceId);
  const amount = Math.floor(Number(input.amount) || 0);
  if (!userId) throw new Error('XP_AWARD_USER_REQUIRED');
  if (!sourceType || !sourceId) throw new Error('XP_AWARD_SOURCE_REQUIRED');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('XP_AWARD_AMOUNT_INVALID');

  const ledgerEventId = cleanIdPart(input.ledgerEventId) || getProgressionLedgerId(userId, sourceType, sourceId);
  const ledgerRef = db.collection('scoreEvents').doc(ledgerEventId);
  const userRef = db.collection('users').doc(userId);
  const ledgerSnap = await transaction.get(ledgerRef);
  if (ledgerSnap.exists) {
    const ledgerData = ledgerSnap.data() || {};
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const plan = buildProgressionAwardPlan({
      previousXp: userData.xp ?? userData.points ?? 0,
      amount: 0,
      existingRewardIds: Array.isArray(userData.progressionRewardIds) ? userData.progressionRewardIds : [],
      explorerTypeId: userData.fieldType,
    });
    return {
      ...plan,
      awarded: false,
      duplicate: true,
      ledgerEventId,
      levelUpEventId: null,
      amount: Math.max(0, numericValue(ledgerData.amount ?? ledgerData.points ?? ledgerData.xp)),
    };
  }

  const userSnap = await transaction.get(userRef);
  if (!userSnap.exists) throw new Error('XP_AWARD_USER_NOT_FOUND');
  const userData = userSnap.data() || {};
  const plan = buildProgressionAwardPlan({
    previousXp: userData.xp ?? userData.points ?? 0,
    amount,
    existingRewardIds: Array.isArray(userData.progressionRewardIds) ? userData.progressionRewardIds : [],
    explorerTypeId: userData.fieldType,
  });

  const levelUpEventId = plan.unlockedLevels.length > 0
    ? getProgressionLevelUpEventId(ledgerEventId)
    : null;
  const levelUpEventRef = levelUpEventId ? db.collection('levelUpEvents').doc(levelUpEventId) : null;
  const existingLevelUpEvent = levelUpEventRef ? await transaction.get(levelUpEventRef) : null;
  const createdAt = FieldValue.serverTimestamp();
  const metadata = compactMetadata(input.metadata);

  transaction.create(ledgerRef, {
    userId,
    userName: input.userName || userData.name || userData.displayName || 'Agent',
    sourceType,
    sourceId,
    amount,
    type: input.compatibilityType || sourceType,
    points: amount,
    xp: amount,
    entryId: input.entryId || metadata.entryId || null,
    challengeId: input.challengeId || metadata.challengeId || null,
    crewId: input.crewId || metadata.crewId || null,
    metadata,
    createdAt,
  });

  const userUpdate: Record<string, unknown> = {
    xp: plan.updatedXp,
    level: plan.toLevel,
    levelTitle: plan.levelTitle,
    progressionRewardIds: plan.allProgressionRewardIds,
    progressionUpdatedAt: createdAt,
    updatedAt: createdAt,
  };

  if (input.awardWeeklyXp !== false) {
    userUpdate.weeklyXp = numericValue(userData.weeklyXp ?? userData.weeklyXP) + amount;
    if (Object.prototype.hasOwnProperty.call(userData, 'weeklyXP')) {
      userUpdate.weeklyXP = numericValue(userData.weeklyXP) + amount;
    }
  }
  if (input.awardSeasonXp !== false) {
    userUpdate.seasonXp = numericValue(userData.seasonXp ?? userData.seasonXP) + amount;
    if (Object.prototype.hasOwnProperty.call(userData, 'seasonXP')) {
      userUpdate.seasonXP = numericValue(userData.seasonXP) + amount;
    }
  }

  for (const legacyField of ['points', 'totalPoints', 'totalXP', 'score', 'weeklyPoints', 'seasonPoints'] as const) {
    if (Object.prototype.hasOwnProperty.call(userData, legacyField)) {
      userUpdate[legacyField] = numericValue(userData[legacyField]) + amount;
    }
  }

  transaction.set(userRef, userUpdate, { merge: true });

  if (levelUpEventRef && !existingLevelUpEvent?.exists) {
    transaction.create(levelUpEventRef, {
      userId,
      sourceEventId: ledgerEventId,
      sourceType,
      sourceId,
      fromLevel: plan.fromLevel,
      toLevel: plan.toLevel,
      unlockedLevels: plan.unlockedLevels,
      newTitle: plan.explorerLevelTitle,
      defaultTitle: plan.levelTitle,
      unlockedRewards: plan.newlyUnlockedRewardIds,
      acknowledged: false,
      acknowledgedAt: null,
      createdAt,
    });
  }

  return {
    ...plan,
    awarded: true,
    duplicate: false,
    ledgerEventId,
    levelUpEventId,
    amount,
  };
}
