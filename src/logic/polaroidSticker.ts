// Polaroid stickers (Zach's call, Nov 18, 2026): the developing Polaroid's
// "Add a sticker" tray shows the stickers the player actually won, the
// sticker can be dragged into place on the photo, and at submit it is baked
// into the uploaded photo (the clean original is kept).
import { getStickerById as getCanonicalStickerById } from '../data/stickers';
import { getStickerById as getLegacyStickerById } from '../data/stickerRegistry';

/** Position of a sticker on the Polaroid, as percentages of the displayed square. */
export interface PolaroidStickerPlacement {
  x: number;
  y: number;
}

/** Default spot: top-right, matching the old fixed position. */
export const DEFAULT_POLAROID_STICKER_PLACEMENT: PolaroidStickerPlacement = { x: 80, y: 20 };

/** Sticker width on the photo, as a fraction of the displayed square's side. */
export const POLAROID_STICKER_WIDTH_FRACTION = 0.3;

/** Fixed tilt, matching the old rotate-6 chip. */
export const POLAROID_STICKER_ROTATION_DEGREES = 6;

export type ResolvedPolaroidSticker =
  | { kind: 'image'; id: string; name: string; imageUrl: string }
  | { kind: 'emoji'; id: string; name: string; emoji: string };

/**
 * Resolve a sticker id to something renderable. The canonical 52-registry
 * wins; legacy emoji stickers fall back; ids with no entry anywhere resolve
 * to undefined, so the tray skips them instead of showing a generic star.
 */
export function resolvePolaroidSticker(id: string): ResolvedPolaroidSticker | undefined {
  const canonical = getCanonicalStickerById(id);
  if (canonical) {
    return { kind: 'image', id, name: canonical.name, imageUrl: canonical.imageUrl };
  }
  const legacy = getLegacyStickerById(id);
  if (legacy) {
    return { kind: 'emoji', id, name: legacy.label, emoji: legacy.emoji };
  }
  return undefined;
}

export function clampPolaroidPlacement(placement: PolaroidStickerPlacement): PolaroidStickerPlacement {
  const clamp = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return { x: clamp(placement.x), y: clamp(placement.y) };
}

export interface SquarePlacementMapping {
  /** Sticker centre, in source-image pixels. */
  centerX: number;
  centerY: number;
  /** Sticker width, in source-image pixels. */
  width: number;
}

/**
 * Map a placement measured on the displayed square onto the full source
 * image. The Polaroid shows the photo with object-cover in a square, so the
 * displayed square is a CENTER CROP of the (usually non-square) source:
 * landscape sources lose their left/right edges, portrait sources lose
 * top/bottom. Without this mapping a sticker placed on the square lands in
 * the wrong spot on the uploaded photo.
 */
export function mapSquarePlacementToSource(params: {
  sourceWidth: number;
  sourceHeight: number;
  placement: PolaroidStickerPlacement;
  widthFraction?: number;
}): SquarePlacementMapping {
  const { sourceWidth, sourceHeight, placement } = params;
  const side = Math.min(sourceWidth, sourceHeight);
  const cropX = (sourceWidth - side) / 2;
  const cropY = (sourceHeight - side) / 2;
  const widthFraction = params.widthFraction ?? POLAROID_STICKER_WIDTH_FRACTION;
  return {
    centerX: cropX + (placement.x / 100) * side,
    centerY: cropY + (placement.y / 100) * side,
    width: side * widthFraction,
  };
}

/** Height for a sticker drawn at `width`, keeping its natural aspect ratio. */
export function stickerDrawHeight(width: number, naturalWidth: number, naturalHeight: number): number {
  if (!naturalWidth || !naturalHeight) return width;
  return (width * naturalHeight) / naturalWidth;
}
