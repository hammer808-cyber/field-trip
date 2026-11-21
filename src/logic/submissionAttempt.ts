/**
 * Submission attempt identity (P0-8 follow-up, Nov 20, 2026).
 *
 * The entry write is not idempotent: submitTripEntry mints a fresh
 * entry doc on every call unless existingEntryId is set. A retry after
 * a post-write failure (entry doc written, later step threw) used to
 * mint a second pending entry for the same mission whenever the
 * Firestore listener had not synced the first attempt yet — Capture
 * could only reuse an id it could see (the synced pending entry).
 *
 * The fix: mint the entry id ONCE per capture session, before the
 * first submit attempt, and pass it as existingEntryId on every
 * attempt. A retry then setDocs the same doc (merge) instead of
 * minting a duplicate. The id is also stored in the capture draft, so
 * a refresh mid-submit keeps the same attempt id.
 *
 * Precedence when resolving the id for a submit (resolveSubmissionEntryId):
 * the repair entry id wins (a repair updates the original entry), then
 * a pending entry the synced list already shows, then the attempt id.
 * The attempt id is the fallback for exactly the window the other two
 * cannot see: after the first write, before the listener syncs.
 */
export function mintSubmissionAttemptId(missionId: string, userId: string): string {
  return `entry_${missionId.toLowerCase()}_${userId}_${Date.now()}`;
}

export function resolveSubmissionEntryId(input: {
  entryIdParam?: string | null;
  pendingEntryId?: string | null;
  attemptId?: string | null;
}): string | null {
  return input.entryIdParam || input.pendingEntryId || input.attemptId || null;
}
