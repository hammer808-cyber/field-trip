/**
 * Stale-chunk recovery (Nov 21, 2026 — Option A).
 *
 * Every page is a lazy chunk. Each deploy renames the chunks, so a tab
 * opened before the deploy holds stale chunk filenames; navigating to a
 * not-yet-loaded page then throws a chunk-load error and the error
 * boundary shows "THIS PAGE DIDN'T LOAD". The fix: recognise that
 * failure and reload once automatically instead of showing the screen.
 *
 * Pure module: no window/document access except through the storage
 * object the caller passes in, so it is unit-testable in node.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STALE_CHUNK_RELOAD_KEY_PREFIX = 'fieldtrip:stale-chunk-reload:';

/** Signatures of a chunk that failed to load (see the design doc). */
const CHUNK_LOAD_MESSAGE_PATTERNS: RegExp[] = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk \d+ failed/i,
  /Unexpected token '<'/,
];

export function isChunkLoadError(error: Error | null | undefined): boolean {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  const message = String((error as Error).message || '');
  return CHUNK_LOAD_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

/** Small djb2 hash, hex-encoded. The message carries the chunk URL, so
 *  different stale chunks get different keys. */
export function hashStaleChunkMessage(message: string): string {
  let hash = 5381;
  for (let i = 0; i < message.length; i++) {
    hash = ((hash << 5) + hash + message.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function staleChunkReloadKey(message: string): string {
  return `${STALE_CHUNK_RELOAD_KEY_PREFIX}${hashStaleChunkMessage(message)}`;
}

/**
 * Loop guard. Returns true the first time a distinct error message is
 * seen (the caller may reload), false when the same message has already
 * spent its reload, or when no storage is available (never auto-reload
 * without a guard).
 */
export function consumeStaleChunkReload(
  message: string,
  storage?: StorageLike | null,
): boolean {
  if (!storage) return false;
  const key = staleChunkReloadKey(message);
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

/** sessionStorage when it exists, otherwise null (guard then blocks). */
export function getSessionStorageLike(): StorageLike | null {
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch {
    return null;
  }
  return null;
}
