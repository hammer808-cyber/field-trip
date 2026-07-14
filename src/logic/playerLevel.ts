import type { FieldTypeId } from '../constants/fieldTypes';

export interface PlayerLevelDefinition {
  level: number;
  minXp: number;
  title: string;
}

export interface PlayerLevelProgress {
  xp: number;
  level: number;
  title: string;
  currentLevelMinXp: number;
  nextLevel: PlayerLevelDefinition;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
}

export type ProgressionRewardKind =
  | 'profile_stamp'
  | 'sticker'
  | 'big_board_border'
  | 'explorer_pose'
  | 'zine_texture'
  | 'profile_title_accent'
  | 'reaction_sticker'
  | 'crew_stamp'
  | 'profile_seal'
  | 'archive_sticker'
  | 'prestige_frame';

export interface ProgressionRewardDefinition {
  id: string;
  level: number;
  kind: ProgressionRewardKind;
  label: string;
  description: string;
  assetStatus: 'available' | 'coming_soon';
}

export const UNCLASSIFIED_LEVEL_TITLE = 'Unclassified Civilian';

export const PLAYER_LEVELS: readonly PlayerLevelDefinition[] = [
  { level: 1, minXp: 0, title: 'Person of Mild Interest' },
  { level: 2, minXp: 250, title: 'Amateur Loiterer' },
  { level: 3, minXp: 600, title: 'Junior Field Nuisance' },
  { level: 4, minXp: 1100, title: 'Scene Investigator' },
  { level: 5, minXp: 1800, title: 'Licensed Side-Quester' },
  { level: 6, minXp: 2700, title: 'Neighborhood Cryptid' },
  { level: 7, minXp: 3800, title: 'Senior Receipt Collector' },
  { level: 8, minXp: 5100, title: 'Certified Public Spectacle' },
  { level: 9, minXp: 6700, title: 'Regional Curiosity' },
  { level: 10, minXp: 8600, title: 'Deputy Director of Shenanigans' },
  { level: 11, minXp: 10800, title: 'Highly Decorated Loiterer' },
  { level: 12, minXp: 13300, title: 'Field Legend, Pending Review' },
  { level: 13, minXp: 16100, title: 'Unlicensed Cultural Landmark' },
  { level: 14, minXp: 19200, title: 'Deputy Commissioner of Weird' },
  { level: 15, minXp: 22600, title: 'Local Folklore' },
] as const;

/**
 * Levels above 15 keep the Local Folklore title. The first post-15 level costs
 * 3,700 XP and each later level costs 300 XP more than the previous one.
 */
export function getLevelMinimumXp(level: number): number {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const fixed = PLAYER_LEVELS[safeLevel - 1];
  if (fixed) return fixed.minXp;

  const levelsPastFifteen = safeLevel - 15;
  return 22600
    + (3400 * levelsPastFifteen)
    + (300 * levelsPastFifteen * (levelsPastFifteen + 1)) / 2;
}

export function normalizeLifetimeXp(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function getLevelTitle(level: number): string {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return PLAYER_LEVELS[safeLevel - 1]?.title || PLAYER_LEVELS[PLAYER_LEVELS.length - 1].title;
}

export function getLevelDefinition(level: number): PlayerLevelDefinition {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return {
    level: safeLevel,
    minXp: getLevelMinimumXp(safeLevel),
    title: getLevelTitle(safeLevel),
  };
}

export function getLevelFromXp(value: unknown): number {
  const xp = normalizeLifetimeXp(value);
  if (xp < getLevelMinimumXp(16)) {
    for (let index = PLAYER_LEVELS.length - 1; index >= 0; index -= 1) {
      if (xp >= PLAYER_LEVELS[index].minXp) return PLAYER_LEVELS[index].level;
    }
    return 1;
  }

  let low = 16;
  let high = 32;
  while (getLevelMinimumXp(high) <= xp) {
    low = high;
    high *= 2;
  }
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (getLevelMinimumXp(middle) <= xp) low = middle;
    else high = middle;
  }
  return low;
}

export function getNextLevel(value: unknown): PlayerLevelDefinition {
  return getLevelDefinition(getLevelFromXp(value) + 1);
}

export function getLevelProgress(value: unknown): PlayerLevelProgress {
  const xp = normalizeLifetimeXp(value);
  const level = getLevelFromXp(xp);
  const currentLevelMinXp = getLevelMinimumXp(level);
  const nextLevel = getLevelDefinition(level + 1);
  const xpForNextLevel = Math.max(1, nextLevel.minXp - currentLevelMinXp);
  const xpIntoLevel = Math.max(0, xp - currentLevelMinXp);
  const xpToNextLevel = Math.max(0, nextLevel.minXp - xp);

  return {
    xp,
    level,
    title: getLevelTitle(level),
    currentLevelMinXp,
    nextLevel,
    xpIntoLevel,
    xpForNextLevel,
    xpToNextLevel,
    progressPercent: Math.min(100, Math.max(0, (xpIntoLevel / xpForNextLevel) * 100)),
  };
}

export function getUnlockedLevels(value: unknown): PlayerLevelDefinition[] {
  const level = getLevelFromXp(value);
  return Array.from({ length: level }, (_, index) => getLevelDefinition(index + 1));
}

const EXPLORER_TYPE_LEVEL_TITLES: Partial<Record<FieldTypeId, Partial<Record<number, string>>>> = {
  mallRat: { 5: 'Licensed Loitering Specialist' },
  captainClipboard: { 5: 'Deputy Form Inspector' },
  bigfoot: { 5: 'Certified Trail Rumor' },
  elondra: { 5: 'Licensed Scene Curator' },
  theGobbler: { 5: 'Senior Snack Operative' },
  mascota: { 5: 'Official Morale Officer' },
};

export function getExplorerTypeLevelTitle(level: number, explorerTypeId?: string | null): string {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const variants = explorerTypeId
    ? EXPLORER_TYPE_LEVEL_TITLES[explorerTypeId as FieldTypeId]
    : undefined;
  return variants?.[safeLevel] || getLevelTitle(safeLevel);
}

export const LEVEL_MILESTONE_REWARDS: Readonly<Record<number, readonly ProgressionRewardDefinition[]>> = {
  2: [{ id: 'level-2-profile-stamp', level: 2, kind: 'profile_stamp', label: 'Level 2 Profile Stamp', description: 'A new stamp for your field dossier.', assetStatus: 'coming_soon' }],
  3: [{ id: 'level-3-field-sticker', level: 3, kind: 'sticker', label: 'Junior Field Nuisance Sticker', description: 'A sticker marking your growing public record.', assetStatus: 'coming_soon' }],
  4: [{ id: 'level-4-big-board-border', level: 4, kind: 'big_board_border', label: 'Scene Investigator Border', description: 'A restrained border for Big Board appearances.', assetStatus: 'coming_soon' }],
  5: [{ id: 'level-5-explorer-pose', level: 5, kind: 'explorer_pose', label: 'Alternate Explorer Pose', description: 'An alternate pose for your Explorer Type.', assetStatus: 'coming_soon' }],
  6: [{ id: 'level-6-zine-texture', level: 6, kind: 'zine_texture', label: 'Neighborhood Cryptid Zine Texture', description: 'A tape or paper treatment for zine layouts.', assetStatus: 'coming_soon' }],
  7: [{ id: 'level-7-title-accent', level: 7, kind: 'profile_title_accent', label: 'Senior Title Accent', description: 'A profile accent for your Bureau rank.', assetStatus: 'coming_soon' }],
  8: [{ id: 'level-8-reaction-sticker', level: 8, kind: 'reaction_sticker', label: 'Public Spectacle Reaction', description: 'A cosmetic reaction sticker.', assetStatus: 'coming_soon' }],
  9: [{ id: 'level-9-crew-stamp', level: 9, kind: 'crew_stamp', label: 'Regional Crew Stamp', description: 'A cosmetic stamp for crew surfaces.', assetStatus: 'coming_soon' }],
  10: [{ id: 'level-10-profile-seal', level: 10, kind: 'profile_seal', label: 'Deputy Director Seal', description: 'An animated profile seal when motion is enabled.', assetStatus: 'coming_soon' }],
  12: [{ id: 'level-12-archive-sticker', level: 12, kind: 'archive_sticker', label: 'Pending Review Archive Sticker', description: 'A rare archive sticker.', assetStatus: 'coming_soon' }],
  15: [{ id: 'level-15-prestige-frame', level: 15, kind: 'prestige_frame', label: 'Local Folklore Prestige Frame', description: 'A prestige frame and seasonal title treatment.', assetStatus: 'coming_soon' }],
} as const;

export function getProgressionRewardsForLevels(levels: readonly number[]): ProgressionRewardDefinition[] {
  return levels.flatMap(level => [...(LEVEL_MILESTONE_REWARDS[level] || [])]);
}

export function getCrossedLevels(previousXp: unknown, updatedXp: unknown): number[] {
  const fromLevel = getLevelFromXp(previousXp);
  const toLevel = getLevelFromXp(updatedXp);
  if (toLevel <= fromLevel) return [];
  return Array.from({ length: toLevel - fromLevel }, (_, index) => fromLevel + index + 1);
}
