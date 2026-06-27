/**
 * Normalize variations of entry statuses into a canonical set:
 * "pending_review" | "approved" | "needs_more_proof" | "rejected"
 */
export function normalizeEntryStatus(status: string | undefined): "pending_review" | "approved" | "needs_more_proof" | "rejected" {
  if (!status) return "pending_review";

  const s = status.toLowerCase().trim();

  // Approved patterns
  if (
    s === "approved" || 
    s === "verified" || 
    s === "approved_by_admin" || 
    s === "auto_approved" || 
    s === "completed" ||
    s === "retry-approved" ||
    s === "archived"
  ) {
    return "approved";
  }

  // Needs more proof patterns
  if (
    s === "needs-more-proof" || 
    s === "needsmoreproof" || 
    s === "needs_more_proof" || 
    s === "resubmit_requested" ||
    s === "needs-fix" ||
    s === "needs_fix"
  ) {
    return "needs_more_proof";
  }

  // Rejected patterns
  if (
    s === "denied" || 
    s === "rejected" || 
    s === "auto_rejected" ||
    s === "awaiting_purge" ||
    s === "purged"
  ) {
    return "rejected";
  }

  // Pending Review patterns
  if (
    s === "pending_review" ||
    s === "pending-review" ||
    s === "submitted_pending_review" ||
    s === "resubmitted_pending_review" ||
    s === "awaiting_review" ||
    s === "needs_review" ||
    s === "checking" ||
    s === "under_field_check" ||
    s === "submitted" ||
    s === "pending" ||
    s === "resubmitted" ||
    s === "retry-submitted" ||
    s === "pending_upload"
  ) {
    return "pending_review";
  }

  // Everything else is pending_review
  return "pending_review";
}

/**
 * Soft resets preserve old submissions as history, but archived/excluded entries
 * must not drive live deck progress, unlocks, or starter completion.
 */
export function isArchivedEntry(entry: any): boolean {
  const rawStatus = entry?.status?.toString().toLowerCase().trim();
  return (
    entry?.archived === true ||
    entry?.excludedFromProgress === true ||
    entry?.countsTowardLiveStats === false ||
    rawStatus === "archived"
  );
}

export function countsTowardStarterProgress(entry: any): boolean {
  return !isArchivedEntry(entry) && entry?.countsTowardStarter !== false;
}

export function countsTowardMissionRepeatGuard(entry: any): boolean {
  return (
    !isArchivedEntry(entry) &&
    entry?.countsTowardStarter !== false &&
    entry?.countsTowardProgress !== false
  );
}
