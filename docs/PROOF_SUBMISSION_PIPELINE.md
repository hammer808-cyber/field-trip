# Proof Submission And Review Pipeline

## Decision

`entries/{entryId}` is the canonical proof submission and review record.

The admin Proof Review queue reads canonical entries directly by status:

```ts
entries where status == "pending_review" order by submittedAt desc
```

`proofReviews/{reviewId}` is no longer a live source of truth. It may exist as an audit/projection record for older tools and diagnostics, but a pending proof must not depend on a matching `proofReviews` document to appear in Admin Proof Review.

## Current Write Path

1. User chooses a mission and provides a photo plus field note.
2. The image is uploaded or stabilized into Firebase Storage when needed.
3. The app writes one canonical `entries/{entryId}` document.
4. The app validates the entry has `userId`, `challengeId`, `deckId`, an image reference, `submittedAt`, and `status`.
5. Only after that confirmed write does the entry become `status: "pending_review"`.
6. AI analysis runs as enrichment only.
7. A `proofReviews` audit/projection record may be written, but failures there are logged and do not hide the entry from admin.
8. Admin review actions transition the canonical entry status.
9. XP and unlock progress derive only from approved canonical entries.

## Duplicate Or Legacy Paths Found

- `entries`: canonical user proof and admin review state.
- `proofReviews`: legacy/admin projection. Retained for audit compatibility only.
- Mirrored status fields: `status`, `reviewStatus`, `submissionStatus`, and `proofStatus`.
- Legacy status spellings: `pending`, `submitted`, `needsMoreProof`, `needs-more-proof`, `approved_by_admin`, and similar forms.
- Legacy image aliases: `photoUrl`, `imageUrl`, `proofImage`, `mediaUrl`, plus storage path aliases.

These are normalized at read/repair boundaries. New UI code should use canonical selectors/services rather than inventing another status field.

## Canonical Entry Schema

Required fields:

```ts
{
  id: string,
  entryId: string,
  userId: string,
  challengeId: string,
  deckId: string,
  seasonId?: string | null,
  status: "pending_review" | "approved" | "needs_more_proof" | "rejected",
  submittedAt: Timestamp,
  photoUrl?: string,
  storagePath?: string,
  fieldNote?: string,
  aiRecommendation?: string,
  aiAnalysisStatus?: "completed" | "failed",
  reviewDecision?: string,
  reviewNotes?: string,
  reviewedAt?: Timestamp | null,
  reviewedBy?: string | null,
  pointsAwarded?: number,
  xpAwarded?: boolean,
  approvalAppliedAt?: Timestamp,
  submissionVersion: "canonical-entry-v1",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## State Machine

All proof status changes go through `src/services/proofLifecycleService.ts`.

Allowed transitions:

- `draft -> uploading -> pending_review`
- `needs_more_proof -> uploading -> pending_review`
- `pending_review -> approved`
- `pending_review -> needs_more_proof`
- `pending_review -> rejected`

Rules:

- User success requires a confirmed canonical `entries` write.
- AI analysis cannot approve or reject a proof.
- `proofReviews` cannot make a proof reviewable or non-reviewable.
- Admin review actions are the only path to `approved`, `needs_more_proof`, or `rejected`.
- XP is awarded once during the approved transition through the idempotent point-award helper.
- Unlocks and progress must derive from approved canonical entries only.

## Admin Queue Integrity Monitor

Admin Proof Review includes diagnostics that show:

- Firebase project and environment.
- Query paths and active status filter.
- Total canonical entries scanned before filtering.
- Total legacy proof review records scanned before filtering.
- Records rendered after filtering.
- Counts by normalized status.
- Counts for failed/incomplete records, missing required fields, missing image references, missing linkage, and invalid status values.
- Records excluded and why.
- Reviewable canonical entries that did not render.
- Firestore query or permission errors.

The empty state is split into:

- Truly empty: no proof is waiting for review.
- Query/filter issue: reviewable records exist but are not rendering.
- Permission/query failure: the queue could not load.

## Repair Tool

The admin diagnostics panel exposes a dry run and live repair/reindex action.

The repair scans `entries` and `proofReviews`, then:

- Normalizes clear status aliases onto canonical entry fields.
- Mirrors missing canonical identifiers where the source is unambiguous.
- Repairs missing image aliases when a canonical image exists.
- Flags ambiguous records instead of guessing.
- Reports orphaned `proofReviews` without turning them into source-of-truth records.

The repair is idempotent and safe to run repeatedly.

## Retain, Deprecate, Delete

- Retain `entries` as the only live proof lifecycle source.
- Retain `proofReviews` temporarily as an audit/projection and legacy compatibility layer.
- Deprecate UI reads that require a `proofReviews` record.
- Deprecate direct component status writes.
- Delete old review-only assumptions after production data is normalized and diagnostics show no orphan/ambiguous records.

## Test Plan

1. Submit one fresh proof from a new account.
2. Confirm `entries/{entryId}` exists with `status: "pending_review"` and required image/user/challenge/deck fields.
3. Confirm Admin Proof Review shows it under Pending Review without depending on `proofReviews`.
4. Temporarily break or block `proofReviews` creation in dev and confirm the proof still appears in Admin Proof Review.
5. Temporarily force AI analysis failure in dev and confirm the proof still appears in Pending Review with `aiAnalysisStatus: "failed"`.
6. Approve the proof once and confirm XP/progress updates.
7. Click approve again and confirm XP is not awarded twice.
8. Request more proof and reject test records; confirm canonical status changes and user draw locks update from canonical fields.
9. Run the queue repair dry run; review ambiguous/orphan records.
10. Run live repair only after dry run output is understood.
11. Hard reset a user and confirm reset does not delete unrelated admin-reviewable canonical records unless explicitly requested.
12. Confirm Admin Proof Review never shows the generic empty state when diagnostics report query errors or hidden reviewable records.
