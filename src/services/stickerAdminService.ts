/**
 * Stage 4 — admin sticker grant client service.
 *
 * Thin wrappers over the grant endpoint (`POST /api/admin/stickers/grant`),
 * the existing player lookup (`GET /api/admin/user-lookup`), and the
 * grant-history read on `adminLogs`. Follows the `moderationService.ts` /
 * `adminOperationsService.ts` pattern: no fetch calls inline in the page
 * component.
 *
 * Grant history reads `adminLogs` (admin-readable by rules), NOT the
 * `stickerAwards` ledger — the ledger has no rules entry, so clients get
 * default-deny on it. The query uses only an equality filter
 * (`where('action', '==', 'grant_sticker')`) with no `orderBy`, so it needs
 * no composite index; rows are sorted newest-first client-side.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import {
  getAllStickers,
  type StickerCollection,
  type StickerDefinition,
  type StickerRarity
} from '../data/stickers';

/**
 * Maximum grant reason length, in characters. Must match
 * `MAX_GRANT_REASON_LENGTH` in `src/server/stickerGrants.ts` — the server
 * is the authority and re-validates; a test asserts the two agree. The
 * constant lives here (not imported from the server module) so the client
 * bundle never pulls in `firebase-admin`.
 */
export const MAX_GRANT_REASON_LENGTH = 200;

/** One player row, mirroring the server's `serializeAdminUserLookup`. */
export interface AdminLookupPlayer {
  uid: string;
  email: string | null;
  username: string;
  displayName: string;
  photoURL: string | null;
  role?: string;
  isAdmin?: boolean;
  createdAt: unknown;
  lastLoginAt: unknown;
  starterApprovedCount: number;
  totalXP: number;
}

export interface StickerGrantSummary {
  id: string;
  name: string;
  collection: StickerCollection;
  rarity: StickerRarity;
}

export type GrantStickerResponse =
  | { awarded: true; sticker: StickerGrantSummary; alreadyUnlocked: false }
  | { awarded: false; sticker: StickerGrantSummary; alreadyUnlocked: true };

export interface GrantHistoryEntry {
  id: string;
  adminId: string;
  targetId: string;
  stickerId: string;
  reason: string;
  /** Null when the log row has no readable timestamp. */
  createdAt: Date | null;
}

/** Client-side reason check (server re-validates): 1–200 chars after trim. */
export function isValidGrantReason(reason: string): boolean {
  const trimmed = reason.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_GRANT_REASON_LENGTH;
}

/**
 * Picker filter (pure, unit-tested): matches by sticker name or id,
 * case-insensitive; an empty query returns the whole catalog.
 */
export function filterGrantPickerStickers(
  stickers: readonly StickerDefinition[],
  queryText: string
): StickerDefinition[] {
  const needle = queryText.trim().toLowerCase();
  if (!needle) return [...stickers];
  return stickers.filter(
    (sticker) =>
      sticker.name.toLowerCase().includes(needle) || sticker.id.toLowerCase().includes(needle)
  );
}

/** The full grantable catalog: the canonical registry (42 stickers). */
export function getGrantableStickers(): StickerDefinition[] {
  return getAllStickers();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readErrorCode(res: Response): Promise<string | null> {
  try {
    const body = await res.json();
    return typeof body?.error === 'string' ? body.error : null;
  } catch {
    return null;
  }
}

/**
 * Player lookup via the existing admin endpoint. Throws on a missing query
 * or a non-OK response (error message carries the server's error code).
 */
export async function lookupPlayers(searchQuery: string): Promise<AdminLookupPlayer[]> {
  const queryText = searchQuery.trim();
  if (!queryText) throw new Error('A search query is required.');
  const res = await authenticatedFetch(`/api/admin/user-lookup?q=${encodeURIComponent(queryText)}`);
  if (!res.ok) {
    const code = await readErrorCode(res);
    throw new Error(code ? `Player lookup failed: ${code}` : `Player lookup failed (HTTP ${res.status}).`);
  }
  const body = await res.json();
  return Array.isArray(body?.users) ? (body.users as AdminLookupPlayer[]) : [];
}

/**
 * Grants one sticker to one player. Returns the server's response shape
 * (success or already-owned). Throws on any error response, with the
 * server's error code in the message.
 */
export async function grantSticker(input: {
  targetUid: string;
  stickerId: string;
  reason: string;
}): Promise<GrantStickerResponse> {
  const res = await authenticatedFetch('/api/admin/stickers/grant', {
    method: 'POST',
    body: JSON.stringify({
      targetUid: input.targetUid,
      stickerId: input.stickerId,
      reason: input.reason
    })
  });
  if (!res.ok) {
    const code = await readErrorCode(res);
    throw new Error(code ? `Grant failed: ${code}` : `Grant failed (HTTP ${res.status}).`);
  }
  return (await res.json()) as GrantStickerResponse;
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Normalizes one `adminLogs` doc into a grant-history row (pure, tested). */
export function normalizeGrantHistoryEntry(
  id: string,
  data: Record<string, unknown>
): GrantHistoryEntry {
  return {
    id,
    adminId: typeof data.adminId === 'string' ? data.adminId : '',
    targetId: typeof data.targetId === 'string' ? data.targetId : '',
    stickerId: typeof data.stickerId === 'string' ? data.stickerId : '',
    reason: typeof data.reason === 'string' ? data.reason : '',
    createdAt: toDate(data.createdAt)
  };
}

/** Newest first; rows without a timestamp sort last (pure, tested). */
export function sortGrantHistoryDesc(entries: GrantHistoryEntry[]): GrantHistoryEntry[] {
  return [...entries].sort((a, b) => {
    const aTime = a.createdAt?.getTime();
    const bTime = b.createdAt?.getTime();
    if (aTime == null && bTime == null) return 0;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return bTime - aTime;
  });
}

/**
 * Grant history: the most recent `grant_sticker` rows from `adminLogs`.
 * One-shot read (no live listener — history is a lookup, not a feed).
 */
export async function getGrantHistory(limitCount = 50): Promise<GrantHistoryEntry[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'adminLogs'), where('action', '==', 'grant_sticker'))
    );
    const entries = snap.docs.map((docSnap) =>
      normalizeGrantHistoryEntry(docSnap.id, docSnap.data() as Record<string, unknown>)
    );
    return sortGrantHistoryDesc(entries).slice(0, limitCount);
  } catch (error) {
    console.error('[StickerAdminService] getGrantHistory failed', { error: getErrorMessage(error) });
    throw new Error(`Grant history failed: ${getErrorMessage(error)}`);
  }
}
