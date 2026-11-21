/**
 * Zine scenes (Nov 21, 2026 — Option A, Zach's pick): user-built pages
 * inside the zine book. A scene picks one of four visual styles; the
 * style fixes the slot layout, and the user picks which mission cards,
 * proofs, and field notes fill each slot. Stickers keep using the page's
 * existing `stickers` placements, free-placed inside the style's
 * sticker zones.
 *
 * Pure, no Firebase — the server imports this for validation and the
 * season-end gate, the client for the editor.
 */
import { getEventById, getEventWindow, getPtDateParts, getSeasonById, isLeapYear, type SeasonId } from '../data/seasons';
import type { ZinePage, ZineSceneItem, ZineSceneItemKind, ZineSceneStyleId } from '../types/zine';

export const MAX_SCENES_PER_ZINE = 4;
export const MAX_SCENE_NOTE_CHARS = 280;

export interface ZineSceneSlot {
  id: string;
  kind: ZineSceneItemKind;
  /** Percent of the page. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Fixed scrapbook tilt for the slot, degrees. */
  rotation: number;
}

export interface ZineSceneStyle {
  id: ZineSceneStyleId;
  name: string;
  tagline: string;
  slots: ZineSceneSlot[];
  /** Dashed rect where stickers belong (a visual guide in v1). */
  stickerZone: { x: number; y: number; w: number; h: number };
  /** CSS var names — the palette lives in index.css, never hex here. */
  palette: {
    bg: string;
    paper: string;
    ink: string;
    accent: string;
    accent2: string;
  };
}

/** The four looks, in Zach's image order A–D. */
export const ZINE_SCENE_STYLES: readonly ZineSceneStyle[] = [
  {
    id: 'vintage_nostalgia',
    name: 'Vintage Nostalgia',
    tagline: 'Kraft paper, sepia photos, pressed flowers.',
    slots: [
      { id: 'photo-1', kind: 'proof', x: 6, y: 6, w: 42, h: 38, rotation: -2 },
      { id: 'photo-2', kind: 'proof', x: 52, y: 10, w: 42, h: 38, rotation: 1.5 },
      { id: 'note-1', kind: 'note', x: 8, y: 52, w: 40, h: 30, rotation: -1 },
      { id: 'mission-1', kind: 'mission', x: 52, y: 54, w: 42, h: 30, rotation: 1 },
    ],
    stickerZone: { x: 0, y: 84, w: 100, h: 16 },
    palette: {
      bg: 'var(--scene-vintage-bg)',
      paper: 'var(--scene-vintage-paper)',
      ink: 'var(--scene-vintage-ink)',
      accent: 'var(--scene-vintage-accent)',
      accent2: 'var(--scene-vintage-accent2)',
    },
  },
  {
    id: 'punk_gritty',
    name: 'Punk / Gritty Zine',
    tagline: 'High-contrast black and white, torn edges, scrawl.',
    slots: [
      { id: 'photo-1', kind: 'proof', x: 5, y: 5, w: 55, h: 60, rotation: -1.5 },
      { id: 'note-1', kind: 'note', x: 64, y: 8, w: 31, h: 26, rotation: 2 },
      { id: 'note-2', kind: 'note', x: 64, y: 38, w: 31, h: 26, rotation: -2 },
      { id: 'mission-1', kind: 'mission', x: 5, y: 68, w: 55, h: 24, rotation: 0.5 },
    ],
    stickerZone: { x: 62, y: 68, w: 33, h: 24 },
    palette: {
      bg: 'var(--scene-punk-bg)',
      paper: 'var(--scene-punk-paper)',
      ink: 'var(--scene-punk-ink)',
      accent: 'var(--scene-punk-accent)',
      accent2: 'var(--scene-punk-accent2)',
    },
  },
  {
    id: 'playful_colorful',
    name: 'Playful & Colorful Collage',
    tagline: 'Bright blocks, stars, stickers everywhere.',
    slots: [
      { id: 'photo-1', kind: 'proof', x: 5, y: 5, w: 44, h: 36, rotation: -2 },
      { id: 'photo-2', kind: 'proof', x: 51, y: 8, w: 44, h: 36, rotation: 2 },
      { id: 'mission-1', kind: 'mission', x: 5, y: 46, w: 44, h: 28, rotation: 1 },
      { id: 'note-1', kind: 'note', x: 51, y: 48, w: 44, h: 28, rotation: -1 },
    ],
    stickerZone: { x: 0, y: 78, w: 100, h: 22 },
    palette: {
      bg: 'var(--scene-playful-bg)',
      paper: 'var(--scene-playful-paper)',
      ink: 'var(--scene-playful-ink)',
      accent: 'var(--scene-playful-accent)',
      accent2: 'var(--scene-playful-accent2)',
    },
  },
  {
    id: 'mixed_media',
    name: 'Mixed-Media Art Journal',
    tagline: 'Watercolor washes, ink splatter, layered paper.',
    slots: [
      { id: 'photo-1', kind: 'proof', x: 8, y: 6, w: 46, h: 44, rotation: -1 },
      { id: 'mission-1', kind: 'mission', x: 58, y: 8, w: 34, h: 30, rotation: 1.5 },
      { id: 'note-1', kind: 'note', x: 8, y: 54, w: 46, h: 28, rotation: 1 },
    ],
    stickerZone: { x: 58, y: 42, w: 34, h: 40 },
    palette: {
      bg: 'var(--scene-mixed-bg)',
      paper: 'var(--scene-mixed-paper)',
      ink: 'var(--scene-mixed-ink)',
      accent: 'var(--scene-mixed-accent)',
      accent2: 'var(--scene-mixed-accent2)',
    },
  },
] as const;

export function getZineSceneStyle(styleId: string | null | undefined): ZineSceneStyle | null {
  if (!styleId) return null;
  return ZINE_SCENE_STYLES.find(style => style.id === styleId) ?? null;
}

export function getSceneSlotFill(items: ZineSceneItem[] | undefined, slotId: string): ZineSceneItem | null {
  if (!items) return null;
  return items.find(item => item.slotId === slotId) ?? null;
}

/** A fresh scene page for the style. The server assigns the id. */
export function createScenePage(styleId: ZineSceneStyleId, pageId: string, order: number): ZinePage {
  const style = getZineSceneStyle(styleId);
  if (!style) throw new Error('INVALID_SCENE_STYLE');
  return {
    id: pageId,
    role: 'scene',
    order,
    layoutId: 'scene',
    title: style.name,
    caption: style.tagline,
    proofIds: [],
    proofSnapshots: [],
    stickers: [],
    sceneStyleId: styleId,
    sceneItems: [],
    isOptional: true,
    isFlexible: true,
  };
}

/**
 * Shape-only validation of scene items against the style's slots.
 * Eligibility (proof is a season candidate, mission resolves in the
 * banks) is the server's job on top of this.
 * Returns error strings; empty means valid.
 */
export function validateSceneItems(styleId: string, items: unknown): string[] {
  const errors: string[] = [];
  const style = getZineSceneStyle(styleId);
  if (!style) return ['INVALID_SCENE_STYLE'];
  if (!Array.isArray(items)) return ['INVALID_SCENE_ITEMS'];
  const slotsById = new Map(style.slots.map(slot => [slot.id, slot]));
  const seen = new Set<string>();
  for (const raw of items as any[]) {
    if (!raw || typeof raw !== 'object') { errors.push('INVALID_SCENE_ITEM'); continue; }
    const slot = slotsById.get(String(raw.slotId || ''));
    if (!slot) { errors.push(`UNKNOWN_SLOT:${String(raw.slotId || '')}`); continue; }
    if (seen.has(slot.id)) { errors.push(`DUPLICATE_SLOT:${slot.id}`); continue; }
    seen.add(slot.id);
    if (raw.kind !== slot.kind) { errors.push(`KIND_MISMATCH:${slot.id}`); continue; }
    if (slot.kind === 'mission' && (!String(raw.missionId || '').trim() || !String(raw.deckId || '').trim())) {
      errors.push(`MISSING_MISSION:${slot.id}`);
    }
    if (slot.kind === 'proof' && !String(raw.proofEntryId || '').trim()) {
      errors.push(`MISSING_PROOF:${slot.id}`);
    }
    if (slot.kind === 'note') {
      const text = String(raw.noteText || '');
      if (!text.trim()) errors.push(`MISSING_NOTE:${slot.id}`);
      else if (text.length > MAX_SCENE_NOTE_CHARS) errors.push(`NOTE_TOO_LONG:${slot.id}`);
    }
  }
  return errors;
}

/** Normalize a raw scene-items payload into clean ZineSceneItems. */
export function normalizeSceneItems(styleId: string, items: unknown): ZineSceneItem[] {
  if (validateSceneItems(styleId, items).length > 0) return [];
  return (items as ZineSceneItem[]).map(item => {
    const base: ZineSceneItem = { slotId: String(item.slotId), kind: item.kind };
    if (item.kind === 'mission') { base.deckId = String(item.deckId); base.missionId = String(item.missionId); }
    if (item.kind === 'proof') { base.proofEntryId = String(item.proofEntryId); }
    if (item.kind === 'note') {
      base.noteText = String(item.noteText).slice(0, MAX_SCENE_NOTE_CHARS);
      base.noteSourceEntryId = item.noteSourceEntryId ? String(item.noteSourceEntryId) : null;
    }
    return base;
  });
}

// ---------------------------------------------------------------------------
// Season-end gate: a season's zine opens when that season's window ends.
// ---------------------------------------------------------------------------

export interface ZineSeasonState {
  seasonId: string;
  ended: boolean;
  /** ISO date of the first morning the zine is open (day after the last day). */
  opensAt: string | null;
}

type PtParts = { year: number; month: number; day: number };

function cmpParts(a: PtParts, b: PtParts): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** Noon UTC on a PT calendar day (the seasons module's convention). */
function ptDateIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

/** Noon UTC on a PT calendar day, shifted by `days` whole days. */
function ptDateIsoShifted(year: number, month: number, day: number, days: number): string {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0) + days * 24 * 60 * 60 * 1000).toISOString();
}

function eventSeasonState(eventId: string, now: Date): ZineSeasonState {
  const event = getEventById(eventId);
  if (!event) return { seasonId: eventId, ended: true, opensAt: null };
  const window = getEventWindow(eventId, now);
  if (!window) return { seasonId: eventId, ended: true, opensAt: null };
  const today = getPtDateParts(now);
  const start: PtParts = { year: window.startYear, month: window.startMonth, day: window.startDay };
  const end: PtParts = { year: window.endYear, month: window.endMonth, day: window.endDay };
  if (cmpParts(today, start) >= 0 && cmpParts(today, end) <= 0) {
    // Inside the window: the season is still running. It opens the
    // morning after the last day.
    return { seasonId: eventId, ended: false, opensAt: ptDateIsoShifted(end.year, end.month, end.day, 1) };
  }
  // Outside it: getEventWindow returns the NEXT window, so the previous
  // run ended — the zine is open. It opened the morning after the
  // previous run's last day, one year before this window's end.
  return { seasonId: eventId, ended: true, opensAt: ptDateIsoShifted(end.year - 1, end.month, end.day, 1) };
}

function meteorologicalSeasonState(seasonId: SeasonId, now: Date): ZineSeasonState {
  const season = getSeasonById(seasonId);
  const today = getPtDateParts(now);
  // The most recent run of this season: the run starting this year or
  // last year, whichever contains today or ended most recently.
  for (const startYear of [today.year, today.year - 1]) {
    const endYear = startYear + (season.endMonth < season.startMonth ? 1 : 0);
    // Winter ends Feb 28, or Feb 29 in a leap year.
    const endDay = season.id === 'winter' && isLeapYear(endYear) ? 29 : season.endDay;
    const end: PtParts = { year: endYear, month: season.endMonth, day: endDay };
    const start: PtParts = { year: startYear, month: season.startMonth, day: season.startDay };
    if (cmpParts(today, start) < 0) continue;
    if (cmpParts(today, end) <= 0) {
      // Inside the run: still running; opens the morning after the last day.
      return { seasonId, ended: false, opensAt: ptDateIsoShifted(end.year, end.month, end.day, 1) };
    }
    return { seasonId, ended: true, opensAt: ptDateIsoShifted(end.year, end.month, end.day, 1) };
  }
  return { seasonId, ended: true, opensAt: null };
}

/**
 * Whether the zine for a season is open yet. Unknown ids fail open so
 * a misconfigured season id never bricks the feature.
 */
export function getZineSeasonState(seasonId: string, now: Date = new Date()): ZineSeasonState {
  if (!seasonId) return { seasonId, ended: true, opensAt: null };
  if (getEventById(seasonId)) return eventSeasonState(seasonId, now);
  if (['spring', 'summer', 'fall', 'winter'].includes(seasonId)) {
    return meteorologicalSeasonState(seasonId as SeasonId, now);
  }
  return { seasonId, ended: true, opensAt: null };
}
