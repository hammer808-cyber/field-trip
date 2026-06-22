# Progression Single Source Of Truth

Fieldtrip has one canonical read model for player/game progress:

- Code: `src/services/canonicalProgress.ts`
- Runtime snapshot: `canonicalProgress` from `useApp()`
- Diagnostics: Deck Diagnostics -> Single Truth Check

## Current Sources Found

Authoritative runtime inputs:

- `entries`: canonical challenge lifecycle records. Active, non-archived entries decide approved completions, pending reviews, needs-more-proof, rejected, and reset-visible state.
- `users/{uid}.xp`: canonical displayed XP/points total. `points` remains a compatibility mirror/fallback.
- `drawnMissionCards`: canonical draw history and active drawn-card timestamps.
- deck definitions from `data/deckPacks` plus mission cards from the challenge bank: canonical deck inventory.
- `appConfig/game`: canonical active starter deck/reset version and feature flags.

Compatibility inputs normalized during reads:

- `users/{uid}.completedChallengeIds`
- `users/{uid}.approvedCompletedChallengeIds`
- `users/{uid}.submittedChallengeIds`
- `users/{uid}.submittedPendingChallengeIds`
- `users/{uid}.needsMoreProofChallengeIds`
- `users/{uid}.rejectedChallengeIds`
- `users/{uid}.onboardingCompleted`
- `users/{uid}.starterApprovedCount`

These profile fields are useful for fallback while entry listeners are empty, but user-facing UI should not treat them as live truth once entries are loaded.

## Conflicts Found

- Basecamp fetched approved submissions directly and also read context counters. Removed the direct progress fetch from UI.
- Big Board fetched approved submissions directly for diagnostics while also using context state. Removed that duplicate read path.
- Collection/Dex used `profile.completedChallengeIds` for deck counts and context sets for other deck locks. Moved deck count/lock reads to `canonicalProgress`.
- Bottom navigation calculated Starter 3/3 locally from `completedChallengeIds`. Moved to `canAccessFeature()`.
- StarterGate calculated Starter 3/3 locally. Moved to `getStarterProgress()` and `canAccessFeature()`.
- Deck progress bars and start-safety checks were partially calculated in-page. Moved deck counts/status checks to `getDeckProgress()` and `getChallengeStatus()`.
- Legacy profile fields can still drift after reset or repair. Diagnostics now flags profile-vs-canonical mismatches.

## Canonical Model

Canonical progress is built by `buildCanonicalProgress()`:

- Approved completions: active `entries` with normalized status `approved`.
- Pending reviews: active `entries` with normalized status `pending_review`, plus local optimistic pending entries until Firestore sync lands.
- Needs more proof: active `entries` with normalized status `needs_more_proof`.
- Rejected: active `entries` with normalized status `rejected`.
- Archived/reset history: ignored for progress and draw availability.
- Starter completion: `starter-1`, `starter-2`, and `starter-3` approved count >= 3.
- Deck progress: deck pack mission IDs compared against canonical challenge status sets.
- Unlocks: `canAccessFeature()` uses approved Starter completion only.

## Required Helpers

Use these helpers for user-facing reads:

- `getUserXp(canonicalProgress)`
- `getStarterProgress(canonicalProgress)`
- `getDeckProgress(canonicalProgress, deckId)`
- `canAccessFeature(canonicalProgress, featureKey, options)`
- `getChallengeStatus(canonicalProgress, challengeId, activeMissionId)`
- `getResetDefaults()`
- `getProgressMismatches(canonicalProgress, profile)`

Do not hand-roll progress labels like `2/3`, deck bars, lock states, or challenge status in components.

## Transition Rules

- A challenge starts as `available`.
- Drawing a challenge may create or update a drawn mission card, but it does not award XP.
- Submitting proof creates an `entries` record with `pending_review`; it does not award XP.
- Admin approval moves the entry to `approved` and is the only transition that may award XP.
- Needs-more-proof and rejected states must come from review transitions, not local UI guesses.
- Unlocks for Crew, Memories, Voting, Tribunal, and post-starter decks must use approved Starter count only.
- Hard reset must clear active draw state, local/cached profile arrays, deck progress caches, and active non-archived gameplay records, or archive records so canonical reads ignore them.

## Reset Test Plan

After a hard reset:

1. Open Basecamp and Deck. Starter must show `0/3` everywhere.
2. Open Dex/Collection. Starter deck progress must be `0/3`; post-starter decks must show locked content, not dead buttons.
3. Open Crew and Big Board. Routes should load; locked state must say to complete 3 Starter Signals.
4. Draw Starter. The first available Starter card should draw.
5. Submit proof. Starter should show pending but not approved; XP should not increase.
6. Approve proof in admin. Starter should show `1/3` everywhere; XP may increase once.
7. Repeat until `3/3`. Crew, Memories, Voting/Tribunal, and post-starter deck gates should unlock together.
8. Open Deck Diagnostics -> Single Truth Check. It should show no profile/canonical drift. Any mismatch is a stale field to repair or migrate.
9. Confirm Heatwave/seasonal decks show available cards when their cards are published and the deck is unlocked.

## Migration Notes

The app still writes compatibility mirrors for older UI/admin flows. That is acceptable short-term, but future feature work should:

- add new user-facing progress reads only through `canonicalProgress`;
- keep `entries` as the challenge lifecycle authority;
- keep XP awards inside approved-review transitions only;
- migrate stale profile arrays with repair tools rather than adding more readers;
- remove profile-array fallbacks after production data is confirmed clean.
