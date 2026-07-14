import { getRewardMetadata } from '../data/rewardRegistry';
import { getStickerById } from '../data/stickerRegistry';
import type { StickerPlacement, StickerSheetId } from '../types/stickers';

export const STICKER_SHEETS: Array<{ id: StickerSheetId; label: string; description: string }> = [
  { id: 'recent_finds', label: 'Recent Finds', description: 'The latest discoveries still stuck to the front page.' },
  { id: 'mission_stickers', label: 'Mission Stickers', description: 'Receipts, missions, and completed field signals.' },
  { id: 'explorer_type', label: 'Explorer Type', description: 'Classification marks earned by the way you explore.' },
  { id: 'crew_lore', label: 'Crew Lore', description: 'Shared history, crew access, and clubhouse evidence.' },
  { id: 'seasonal', label: 'Seasonal', description: 'Limited drops, weekly signals, and seasonal finds.' },
  { id: 'rare_secret', label: 'Rare and Secret', description: 'Hard-to-find marks. Unearned secrets stay hidden.' },
  { id: 'used_in_zine', label: 'Used in Zine', description: 'Stickers currently printed in a zine draft or archive.' },
];

const DEFAULT_NOW = '1970-01-01T00:00:00.000Z';

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: string, offset: number): number {
  return (hashString(`${seed}:${offset}`) % 10000) / 10000;
}

export function clampStickerPlacement(placement: StickerPlacement): StickerPlacement {
  return {
    ...placement,
    x: Math.min(68, Math.max(2, Number(placement.x) || 0)),
    y: Math.min(74, Math.max(3, Number(placement.y) || 0)),
    rotation: Math.min(25, Math.max(-25, Number(placement.rotation) || 0)),
    scale: Math.min(1.4, Math.max(0.7, Number(placement.scale) || 1)),
    zIndex: Math.max(1, Math.round(Number(placement.zIndex) || 1)),
  };
}

export function getInitialStickerSheet(params: {
  stickerId: string;
  recentStickerIds?: Set<string>;
  usedInZineIds?: Set<string>;
}): StickerSheetId {
  const { stickerId, recentStickerIds = new Set(), usedInZineIds = new Set() } = params;
  if (usedInZineIds.has(stickerId)) return 'used_in_zine';

  const reward = getRewardMetadata(stickerId);
  const metadata = getStickerById(stickerId);
  if (reward.rarity === 'rare' || reward.rarity === 'legendary') return 'rare_secret';
  if (recentStickerIds.has(stickerId)) return 'recent_finds';
  if (metadata?.category === 'persona') return 'explorer_type';
  if (metadata?.category === 'seasonal' || metadata?.category === 'weekly') return 'seasonal';
  if (/crew|memories|clubhouse/i.test(`${stickerId} ${reward.label}`)) return 'crew_lore';
  return 'mission_stickers';
}

export function createDeterministicStickerPlacement(
  stickerId: string,
  sheetId: StickerSheetId,
  zIndex = 1,
  now = DEFAULT_NOW,
): StickerPlacement {
  const seed = `${sheetId}:${stickerId}`;
  return clampStickerPlacement({
    stickerId,
    sheetId,
    x: 5 + seededUnit(seed, 1) * 64,
    y: 6 + seededUnit(seed, 2) * 66,
    rotation: -14 + seededUnit(seed, 3) * 28,
    scale: 0.82 + seededUnit(seed, 4) * 0.28,
    zIndex,
    placedAt: now,
    updatedAt: now,
  });
}

export function mergeStickerPlacements(params: {
  stickerIds: string[];
  existingPlacements?: StickerPlacement[];
  recentStickerIds?: string[];
  usedInZineIds?: string[];
  now?: string;
}): StickerPlacement[] {
  const {
    stickerIds,
    existingPlacements = [],
    recentStickerIds = [],
    usedInZineIds = [],
    now = new Date().toISOString(),
  } = params;
  const recent = new Set(recentStickerIds);
  const used = new Set(usedInZineIds);
  const existing = new Map(existingPlacements.map(placement => [placement.stickerId, placement]));

  return Array.from(new Set(stickerIds)).map((stickerId, index) => {
    const saved = existing.get(stickerId);
    if (saved && STICKER_SHEETS.some(sheet => sheet.id === saved.sheetId)) {
      return clampStickerPlacement(saved);
    }
    return createDeterministicStickerPlacement(
      stickerId,
      getInitialStickerSheet({ stickerId, recentStickerIds: recent, usedInZineIds: used }),
      index + 1,
      now,
    );
  });
}

export function autoArrangeStickerSheet(
  placements: StickerPlacement[],
  sheetId: StickerSheetId,
  now = new Date().toISOString(),
): StickerPlacement[] {
  const sheetPlacements = placements.filter(placement => placement.sheetId === sheetId);
  const columns = sheetPlacements.length <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(sheetPlacements.length / columns));
  const arranged = new Map<string, StickerPlacement>();

  sheetPlacements.forEach((placement, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    arranged.set(placement.stickerId, clampStickerPlacement({
      ...placement,
      x: 8 + column * (64 / Math.max(1, columns - 1)),
      y: 8 + row * (66 / Math.max(1, rows - 1)),
      rotation: (index % 3 - 1) * 3,
      scale: 0.92,
      zIndex: index + 1,
      updatedAt: now,
    }));
  });

  return placements.map(placement => arranged.get(placement.stickerId) || placement);
}

export function resetStickerSheet(
  placements: StickerPlacement[],
  sheetId: StickerSheetId,
  now = new Date().toISOString(),
): StickerPlacement[] {
  let zIndex = 1;
  return placements.map(placement => {
    if (placement.sheetId !== sheetId) return placement;
    return createDeterministicStickerPlacement(placement.stickerId, sheetId, zIndex++, now);
  });
}

export function moveStickerToFront(
  placements: StickerPlacement[],
  stickerId: string,
  now = new Date().toISOString(),
): StickerPlacement[] {
  const maxZ = placements.reduce((max, placement) => Math.max(max, placement.zIndex), 0);
  return placements.map(placement => placement.stickerId === stickerId
    ? { ...placement, zIndex: maxZ + 1, updatedAt: now }
    : placement);
}

export function updateStickerPlacement(
  placements: StickerPlacement[],
  stickerId: string,
  update: Partial<Pick<StickerPlacement, 'sheetId' | 'x' | 'y' | 'rotation' | 'scale' | 'zIndex'>>,
  now = new Date().toISOString(),
): StickerPlacement[] {
  return placements.map(placement => placement.stickerId === stickerId
    ? clampStickerPlacement({ ...placement, ...update, updatedAt: now })
    : placement);
}
