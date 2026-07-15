import { getStickerById } from '../data/stickers';
import type { ZinePage, ZineStickerPlacement } from '../types/zine';

export const MAX_ZINE_PAGE_STICKERS = 12;

const PLACEMENT_SLOTS: readonly Readonly<{ x: number; y: number; rotation: number }>[] = [
  { x: 20, y: 22, rotation: -8 },
  { x: 78, y: 20, rotation: 7 },
  { x: 22, y: 76, rotation: 6 },
  { x: 76, y: 78, rotation: -7 },
  { x: 50, y: 22, rotation: 4 },
  { x: 50, y: 76, rotation: -5 },
  { x: 22, y: 49, rotation: -3 },
  { x: 78, y: 50, rotation: 5 },
  { x: 38, y: 38, rotation: -6 },
  { x: 64, y: 38, rotation: 6 },
  { x: 38, y: 62, rotation: 4 },
  { x: 64, y: 62, rotation: -4 }
];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createZineStickerPlacement(stickerId: string, index: number): ZineStickerPlacement {
  const slot = PLACEMENT_SLOTS[index % PLACEMENT_SLOTS.length];
  return {
    stickerId: stickerId.trim(),
    x: slot.x,
    y: slot.y,
    rotation: slot.rotation,
    scale: 1
  };
}

export function normalizeZineStickerPlacements(value: unknown): ZineStickerPlacement[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const placements: ZineStickerPlacement[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const stickerId = typeof raw.stickerId === 'string' ? raw.stickerId.trim() : '';
    if (!stickerId || stickerId.length > 160 || seen.has(stickerId)) continue;
    const fallback = createZineStickerPlacement(stickerId, placements.length);
    placements.push({
      stickerId,
      x: clamp(finiteNumber(raw.x, fallback.x), 8, 92),
      y: clamp(finiteNumber(raw.y, fallback.y), 8, 92),
      rotation: clamp(finiteNumber(raw.rotation, fallback.rotation), -45, 45),
      scale: clamp(finiteNumber(raw.scale, 1), 0.5, 1.75)
    });
    seen.add(stickerId);
    if (placements.length >= MAX_ZINE_PAGE_STICKERS) break;
  }

  return placements;
}

export function getZinePageStickerPlacements(
  page: Pick<ZinePage, 'stickers' | 'stickerIds'> | Record<string, unknown>
): ZineStickerPlacement[] {
  if (Array.isArray(page.stickers)) {
    return normalizeZineStickerPlacements(page.stickers);
  }
  const legacyIds = Array.isArray(page.stickerIds) ? page.stickerIds : [];
  return legacyIds
    .map(id => String(id || '').trim())
    .filter(Boolean)
    .slice(0, MAX_ZINE_PAGE_STICKERS)
    .map((stickerId, index) => createZineStickerPlacement(stickerId, index));
}

export function addZineStickerPlacement(
  current: readonly ZineStickerPlacement[],
  stickerId: string
): ZineStickerPlacement[] {
  const normalized = normalizeZineStickerPlacements(current);
  const cleanId = stickerId.trim();
  if (!cleanId || normalized.some(item => item.stickerId === cleanId) || normalized.length >= MAX_ZINE_PAGE_STICKERS) {
    return normalized;
  }
  return [...normalized, createZineStickerPlacement(cleanId, normalized.length)];
}

export function removeZineStickerPlacement(
  current: readonly ZineStickerPlacement[],
  stickerId: string
): ZineStickerPlacement[] {
  return normalizeZineStickerPlacements(current).filter(item => item.stickerId !== stickerId);
}

export function rotateZineStickerPlacement(
  current: readonly ZineStickerPlacement[],
  stickerId: string
): ZineStickerPlacement[] {
  return normalizeZineStickerPlacements(current).map(item => {
    if (item.stickerId !== stickerId) return item;
    const nextRotation = item.rotation + 15;
    return { ...item, rotation: nextRotation > 45 ? -45 : nextRotation };
  });
}

export function moveZineStickerPlacement(
  current: readonly ZineStickerPlacement[],
  stickerId: string
): ZineStickerPlacement[] {
  return normalizeZineStickerPlacements(current).map(item => {
    if (item.stickerId !== stickerId) return item;
    const slotIndex = PLACEMENT_SLOTS.findIndex(slot => slot.x === item.x && slot.y === item.y);
    const nextSlot = PLACEMENT_SLOTS[(slotIndex + 1 + PLACEMENT_SLOTS.length) % PLACEMENT_SLOTS.length];
    return { ...item, x: nextSlot.x, y: nextSlot.y };
  });
}

export function getInvalidZineStickerIds(
  placements: readonly ZineStickerPlacement[],
  unlockedStickerIds: ReadonlySet<string>
): string[] {
  return normalizeZineStickerPlacements(placements)
    .map(item => item.stickerId)
    .filter(stickerId => !getStickerById(stickerId) || !unlockedStickerIds.has(stickerId));
}

