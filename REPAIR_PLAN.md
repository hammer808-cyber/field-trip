# Fieldtrip Canonical Proof Repair Plan

This branch is documentation-only. It records the audit findings before any app behavior or data logic is changed.

## Canonical source-of-truth decisions

- `entries` should be the canonical gameplay submission source.
  - User submissions, mission completion, deck progress, starter gating, logbook/profile display, community feed eligibility, and voting eligibility should ultimately resolve from `entries`.

- `proofReviews` should be review and audit metadata.
  - It should store AI/manual review details, review notes, risk signals, verification metadata, and reviewer history.
  - It should not be the gameplay completion source.

- `scoreEvents` should be the scoring ledger.
  - XP awards should be represented as append-only scoring events with idempotency protection.
  - User totals should be rebuildable from this ledger.

- `users` should be a materialized cache.
  - User profile fields such as XP totals, completed mission arrays, pending/rejected/needs-more-proof arrays, starter completion, and onboarding gates should be treated as cached summaries derived from `entries` and `scoreEvents`.

## Canonical status model

All submission/review statuses should normalize to exactly one of:

- `pending_review`
- `approved`
- `needs_more_proof`
- `rejected`

Legacy variants such as `pending`, `submitted`, `checking`, `needs_review`, `needs-more-proof`, `approved_by_admin`, `auto_approved`, `verified`, `denied`, and `retry-submitted` should be mapped into the canonical four before UI display, deck logic, admin review, feed logic, scoring, or starter gating uses them.

## Canonical scoring language

XP should be canonical, not points.

- Use `xp` / `awardedXP` / `estimatedXP` for gameplay scoring.
- Treat `points` fields as legacy compatibility mirrors only.
- Avoid fields that can mean two different things, especially `pointsAwarded` acting as both a boolean and a number.
- Prefer `xpAwarded: boolean` for idempotency and `awardedXP: number` for the awarded amount.

## Main audit finding

The current codebase has overlapping truth sources:

- `entries` is used by most user-facing UI and deck/progress systems.
- `proofReviews` is written by AI/admin review paths and diagnostics.
- `scoreEvents` is used by server-side scoring.
- `users` stores cached totals and mission arrays.

The repair should preserve current behavior first, then gradually route reads and writes through shared selectors and one canonical review/scoring pipeline.

## Safe repair sequence

1. Add shared constants/selectors for canonical statuses, mission IDs, user IDs, image URLs, and XP fields.
2. Keep `entries` as the gameplay source while treating `proofReviews` as linked metadata.
3. Make admin approval update `entries`, linked review metadata, feed visibility, score events, and user cache consistently.
4. Standardize XP naming and keep `points` only as temporary legacy mirrors.
5. Rebuild starter progress from approved `entries` and deck configuration.
6. After migration, tighten Firestore rules and remove legacy mirrors only when no active UI depends on them.
