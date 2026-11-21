/**
 * Check-in honesty (Nov 20, 2026).
 *
 * The location pill used to light the moment Capture opened: the screen set
 * its local state to checked whenever the mission required location, and
 * persisted `{ location: true }` into tripProgress on arrival — no GPS
 * behind either write. A bare `location: true` in a tripProgress record is
 * therefore untrustworthy: every flag written before this fix was
 * auto-written. A check-in counts as honest only when the record ALSO
 * carries `locationCheckedAt`, which Capture writes (alongside the flag)
 * only after a real `getCurrentPosition` read succeeds. Every surface that
 * renders the location pill reads through this one predicate so the rule
 * cannot drift apart again.
 */

export interface LocationCheckProgress {
  location?: unknown;
  locationCheckedAt?: unknown;
}

export function hasHonestLocationCheck(
  progress: LocationCheckProgress | null | undefined
): boolean {
  if (!progress) return false;
  return (
    progress.location === true &&
    typeof progress.locationCheckedAt === 'string' &&
    progress.locationCheckedAt.length > 0
  );
}
