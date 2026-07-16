import { FIELDTRIP_VOTING_TIMEZONE, getCurrentVotingCycle } from '../services/votingCycleService';
import type { BonusEligibility, MissionScoringConfig } from './missionScoring';

export const MISSION_BONUS_SEED_VERSION = 'v1' as const;
export const AFTERNOON_POWER_HOUR_ID = 'afternoon_power_hour';
export const RANDOM_MISSION_BONUS_ID = 'lucky_receipt';

export interface BonusMissionLike {
  id?: string | null;
  missionId?: string | null;
  challengeId?: string | null;
  deckId?: string | null;
  active?: boolean | null;
  isActive?: boolean | null;
  status?: string | null;
  archived?: boolean | null;
  hidden?: boolean | null;
  isHidden?: boolean | null;
  disabled?: boolean | null;
  expired?: boolean | null;
  visibility?: string | null;
  isStarter?: boolean | null;
  countsTowardStarter?: boolean | null;
}

export interface BonusRotationWindow {
  rotationId: string;
  startsAt: Date;
  expiresAt: Date;
  timezone: typeof FIELDTRIP_VOTING_TIMEZONE;
}

export interface LocalTimeSnapshot {
  timezone: string;
  localDate: string;
  hour: number;
  minute: number;
  second: number;
}

export function isValidIanaTimezone(timezone: unknown): timezone is string {
  if (typeof timezone !== 'string' || !timezone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function getLocalTimeSnapshot(date: Date, timezone: string): LocalTimeSnapshot {
  const resolvedTimezone = isValidIanaTimezone(timezone) ? timezone : FIELDTRIP_VOTING_TIMEZONE;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value || '';
  const rawHour = Number(part('hour'));
  const year = part('year');
  const month = part('month');
  const day = part('day');
  return {
    timezone: resolvedTimezone,
    localDate: `${year}-${month}-${day}`,
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(part('minute')),
    second: Number(part('second')),
  };
}

export function isWithinAfternoonPowerHour(
  date: Date,
  timezone: string,
  startHour = 12,
  endHourExclusive = 15,
): boolean {
  const local = getLocalTimeSnapshot(date, timezone);
  return local.hour >= startHour && local.hour < endHourExclusive;
}

export function buildAfternoonPowerHourEligibility(
  startedAt: Date,
  timezone: string,
  config: MissionScoringConfig,
): BonusEligibility {
  const local = getLocalTimeSnapshot(startedAt, timezone);
  const { startHour, endHourExclusive, multiplier, enabled } = config.afternoonPowerHour;
  const eligible = enabled && local.hour >= startHour && local.hour < endHourExclusive;
  return {
    id: AFTERNOON_POWER_HOUR_ID,
    type: 'time_window',
    label: 'Afternoon Power Hour',
    multiplier,
    description: `Start this mission between ${formatHour(startHour)} and ${formatHour(endHourExclusive)} local time and complete the required photo and field note. Applied after approval.`,
    eligible,
    assignmentId: `${AFTERNOON_POWER_HOUR_ID}_${local.localDate}_${local.timezone}`,
    timezone: local.timezone,
    localEligibilityDate: local.localDate,
    startLocalTime: `${String(startHour).padStart(2, '0')}:00`,
    endLocalTimeExclusive: `${String(endHourExclusive).padStart(2, '0')}:00`,
    reason: eligible ? 'mission_started_inside_window' : 'mission_started_outside_window',
  };
}

export function validateAfternoonPowerHourEligibility(
  bonus: BonusEligibility,
  startedAt: Date,
  timezone: string,
): boolean {
  if (bonus.type !== 'time_window' || bonus.id !== AFTERNOON_POWER_HOUR_ID) return false;
  if (!isValidIanaTimezone(timezone) || bonus.timezone !== timezone) return false;
  const local = getLocalTimeSnapshot(startedAt, timezone);
  const startHour = Number(String(bonus.startLocalTime || '').split(':')[0]);
  const endHour = Number(String(bonus.endLocalTimeExclusive || '').split(':')[0]);
  return bonus.localEligibilityDate === local.localDate &&
    local.hour >= startHour &&
    local.hour < endHour;
}

export function getBonusRotationWindow(now: Date): BonusRotationWindow {
  const cycle = getCurrentVotingCycle(now, FIELDTRIP_VOTING_TIMEZONE);
  return {
    rotationId: `mission-bonus_${cycle.id}`,
    startsAt: cycle.weekStart,
    expiresAt: new Date(cycle.weekEnd.getTime() + 1),
    timezone: FIELDTRIP_VOTING_TIMEZONE,
  };
}

export function getBonusMissionId(mission: BonusMissionLike): string {
  return String(mission.id || mission.missionId || mission.challengeId || '').trim();
}

export function isMissionAvailableForRandomBonus(mission: BonusMissionLike): boolean {
  const missionId = getBonusMissionId(mission).toLowerCase();
  const status = String(mission.status || '').toLowerCase().trim();
  const visibility = String(mission.visibility || 'public').toLowerCase().trim();
  const inactiveStatus = ['draft', 'archived', 'disabled', 'expired', 'locked', 'planned'].includes(status);
  return !!missionId &&
    !missionId.startsWith('starter-') &&
    String(mission.deckId || '').toLowerCase().trim() !== 'starter-signals' &&
    mission.isStarter !== true &&
    mission.countsTowardStarter !== true &&
    mission.active !== false &&
    mission.isActive !== false &&
    mission.archived !== true &&
    mission.disabled !== true &&
    mission.expired !== true &&
    mission.hidden !== true &&
    mission.isHidden !== true &&
    !inactiveStatus &&
    !['hidden', 'internal', 'planned', 'admin_only'].includes(visibility);
}

function seededHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectRandomBonusMissionIds(
  missions: readonly BonusMissionLike[],
  rotationId: string,
  count = 3,
): string[] {
  const eligibleIds = Array.from(new Set(
    missions.filter(isMissionAvailableForRandomBonus).map(getBonusMissionId).filter(Boolean),
  ));
  if (eligibleIds.length < count) {
    throw new Error(`BONUS_ROTATION_REQUIRES_${count}_AVAILABLE_MISSIONS`);
  }
  return eligibleIds
    .sort((left, right) => {
      const scoreDifference = seededHash(`${rotationId}|${left}|${MISSION_BONUS_SEED_VERSION}`) -
        seededHash(`${rotationId}|${right}|${MISSION_BONUS_SEED_VERSION}`);
      return scoreDifference !== 0 ? scoreDifference : left.localeCompare(right);
    })
    .slice(0, count);
}

export function buildRandomMissionBonusEligibility(input: {
  missionId: string;
  rotationId: string;
  selectedMissionIds: readonly string[];
  config: MissionScoringConfig;
}): BonusEligibility {
  const eligible = input.config.randomMissionBonus.enabled && input.selectedMissionIds.includes(input.missionId);
  return {
    id: RANDOM_MISSION_BONUS_ID,
    type: 'random_mission',
    label: input.config.randomMissionBonus.label,
    multiplier: input.config.randomMissionBonus.multiplier,
    description: 'This mission was selected for the current weekly rotation. Complete the required photo and field note. Applied after approval.',
    eligible,
    assignmentId: `${input.rotationId}_${input.missionId}`,
    rotationId: input.rotationId,
    reason: eligible ? 'mission_selected_for_rotation' : 'mission_not_selected_for_rotation',
  };
}

function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const clockHour = normalized % 12 || 12;
  return `${clockHour}:00 ${suffix}`;
}
