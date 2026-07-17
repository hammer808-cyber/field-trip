# Fieldtrip Game Logic

**Status:** Canonical
**Applies to:** Client logic, Firestore schema, Cloud/backend functions, admin review, scoring, unlocks, voting, rewards, and QA

This file defines authoritative gameplay state and transitions. UI components render this logic; they do not invent parallel versions of it.

---

## 1. Core Invariants

1. Final Field XP is awarded only after admin approval.
2. Approval and reward operations are idempotent.
3. A mission has one canonical lifecycle state.
4. Starter progress is based on approved Starter Signals, not submitted count.
5. A Needs More Proof action links directly to the affected mission.
6. A rejected submission awards zero final Field XP.
7. Provisional estimates never affect canonical rank.
8. Client-side checks improve UX but never replace Firestore rules or trusted server checks.
9. Every unlock derives from canonical progress, configuration, or date state.
10. A player cannot receive the same one-time sticker, payout, approval award, or vote twice.

---

## 2. Canonical Entities

Recommended logical entities:

- `users/{userId}`
- `entries/{entryId}`
- `decks/{deckId}`
- `missions/{missionId}` or missions embedded under decks
- `proofReviews/{reviewId}`
- `scoreEvents/{scoreEventId}`
- `stickerAwards/{awardId}` or a canonical award subcollection
- `weeklyVotes/{weekId}`
- `weeklyVotes/{weekId}/ballots/{voteId}`
- `weeklySummaries/{weekId}`
- `tribunalCases/{caseId}`
- private reporter records in a nonpublic collection
- `crews/{crewId}`
- `seasons/{seasonId}`
- `appConfig/global`
- `appConfig/game`

Exact collection names may follow the existing schema. The invariants and transitions in this file remain authoritative.

---

## 3. Entry Lifecycle

Canonical `status` values:

```ts
type EntryStatus =
  | 'pending_review'
  | 'approved'
  | 'needs_more_proof'
  | 'rejected';
```

Client-only workflow may additionally track local or pre-submission phases such as:

- available;
- drawn;
- started;
- capturing;
- draft;
- submitting.

These phases must not be persisted into the canonical review `status` field unless the schema intentionally expands.

### Allowed review transitions

| From | To | Allowed |
|---|---|---|
| none/draft | `pending_review` | on valid submission |
| `pending_review` | `approved` | admin/trusted review |
| `pending_review` | `needs_more_proof` | admin/trusted review |
| `pending_review` | `rejected` | admin/trusted review |
| `needs_more_proof` | `pending_review` | valid resubmission |
| `approved` | any other state | not through normal UI; audited correction only |
| `rejected` | `pending_review` | only if product rules explicitly allow retry |

Every transition records:

- actor ID or trusted service identity;
- timestamp;
- previous status;
- next status;
- reason/admin note when relevant;
- idempotency key or deterministic event ID.

---

## 4. Proof Requirements

Default proof requires:

```ts
interface MissionProof {
  photos: ProofPhoto[];       // minimum 1
  fieldNote: string;          // non-empty after trimming
  locationProof?: LocationProof;
  capturedAt?: Timestamp;
  submittedAt: Timestamp;
}
```

Mission configuration may require additional evidence.

Validation occurs at two levels:

1. Client validation for immediate guidance.
2. Trusted backend/security validation for accepted writes.

AI evidence indicators may assess:

- object;
- surface;
- person or crew;
- scene;
- action;
- location clue.

AI output is advisory. It may influence prompts or admin context but does not award final Field XP.

---

## 5. Scoring

### 5.1 Maximums

- Starter Signal maximum: **100 Field XP**.
- Standard/seasonal deck mission maximum: **250 Field XP**.

A mission may configure a lower maximum.

### 5.2 Score inputs

A score may include:

- base mission value;
- valid photo proof;
- field note quality/completeness;
- configured bonus;
- hint penalty;
- retry modifier;
- Explorer perk, only when explicitly configured and competitively fair.

### 5.3 Modifiers

Canonical defaults:

- Hint: reduce eligible maximum by **15%** and block Certified status for that attempt.
- Eligible perk: **+25%**, capped at the mission maximum unless a rule explicitly states otherwise.
- Retry: **50%** of otherwise eligible points.

Apply modifiers in a documented, deterministic order. Recommended order:

```text
raw rubric score
→ hint penalty
→ retry modifier
→ eligible perk/bonus
→ cap at mission maximum
→ round to integer
```

Do not let a bonus exceed the configured mission maximum unless the bonus explicitly awards a separate score event.

### 5.4 Provisional score

The client may display an estimate labeled **Estimated Field XP**.

Provisional score:

- is not written as final player XP;
- does not update rank;
- disappears or is reconciled after review;
- is removed when a submission is rejected;
- cannot be mistaken for an awarded score in accessible text.

### 5.5 Award event

Use one deterministic score event per approved entry, for example:

```text
approval:{entryId}
```

Trusted award transaction:

1. Read entry.
2. Confirm status is `approved` or transition it atomically.
3. Check deterministic score event does not exist.
4. Calculate final score from stored rubric and modifiers.
5. Create score event.
6. Increment canonical player/crew aggregates.
7. Mark award metadata on entry.
8. Commit atomically or fail without partial award.

---

## 6. Starter Progress

Canonical starter completion:

```ts
approvedStarterCount = count(
  entries where userId == currentUser
  && deckId == STARTER_DECK_ID
  && status == 'approved'
  && missionId is one of required starter mission IDs
)
```

Use unique approved mission IDs, not raw entry count, to prevent duplicate submissions from inflating progress.

Default requirement:

```ts
onboardingEntriesRequired = 3;
```

Unlock condition:

```ts
starterComplete = approvedStarterCount >= onboardingEntriesRequired;
```

Unlocked systems may include:

- seasonal decks;
- Crew creation/joining;
- broader Voting features;
- post-Starter Trevor guidance;
- season progression systems.

The resolver must be shared by Basecamp, Missions, route guards, Trevor, and admin/debug views.

---

## 7. Deck and Draw Logic

Each deck defines:

```ts
interface DeckConfig {
  id: string;
  code: string;                 // e.g. FT-05
  name: string;
  type: 'starter' | 'seasonal' | 'evergreen' | 'event';
  active: boolean;
  startsAt?: Timestamp;
  endsAt?: Timestamp;
  requiredUnlocks?: string[];
  drawMode: 'random' | 'ordered' | 'choice';
  redrawPolicy: 'none' | 'after_rejection' | 'configured';
}
```

Eligibility requires all of:

- deck is active;
- current time is within its configured window;
- player satisfies unlocks;
- mission is not already approved by the player unless repeats are allowed;
- mission is not currently active/pending for that player unless duplicates are allowed;
- deck has an eligible card.

When no eligible card exists, distinguish:

- deck completed;
- deck exhausted temporarily;
- all remaining cards pending;
- deck not started;
- deck ended;
- data/configuration error.

Do not display one generic “no missions” state for these different conditions.

---

## 8. Hints and Bonuses

### Hints

- Mission configuration owns the hint text.
- The player confirms before consuming a hint when the penalty matters.
- Hint use is persisted on the attempt.
- Hint use reduces the eligible maximum by 15%.
- Hint use blocks Certified for that attempt.

### Scheduled bonuses

- Daily bonus window default: **12:00 p.m.–3:00 p.m.** in the configured season timezone.
- Weekly random bonuses: **3 per week** when enabled.
- Bonuses must be generated or selected deterministically for a week, not reshuffled per client.
- Bonus rules must appear before submission when they affect behavior or score.
- Admin scoring must receive the bonus context used by the player.

---

## 9. Stickers and Discoveries

Sticker trigger evaluation occurs after the relevant trusted event.

Examples:

- first approved mission;
- first complete photo + field note proof;
- first Tribunal participation;
- first weekly vote;
- deck completion;
- Crew milestone.

Use deterministic award IDs:

```text
{userId}:{stickerId}
```

Rules:

- Evaluate only triggers relevant to the event.
- Do not evaluate and award every discovery when the Dex opens.
- Award writes are atomic/idempotent.
- The client may animate an award after observing the persisted result.

---

## 10. Weekly Voting

Recommended deterministic vote ID:

```text
{weekId}:{userId}:{ballotType}
```

Rules:

- One valid vote per user per ballot under configured rules.
- Ballots remain private before lock.
- Results derive from locked ballots.
- Weekly summary finalization has one deterministic finalization event.
- Winner payouts have deterministic score/reward event IDs.
- Re-running finalization cannot double-pay.

---

## 11. Tribunal

Reports include:

- reporter private reference;
- target entry;
- reason category;
- optional note;
- created timestamp;
- canonical status.

Canonical case statuses may include:

- pending;
- dismissed;
- resolved;
- needs_more_proof;
- escalated.

Rules:

- Enforce report-rate limits in trusted code/rules.
- Public case data excludes reporter identity.
- A player gets one permitted report per target entry unless configuration states otherwise.
- Tribunal votes use deterministic IDs and immutable submitted ballots.

---

## 12. Crew Logic

Core rule: **one player, one Crew** unless the product rules intentionally change.

Crew capabilities:

- invite;
- accept/decline;
- join request;
- captain approval;
- captain promotion;
- member removal;
- leave Crew;
- Crew score and zine participation.

Every membership mutation must:

- verify actor permissions;
- verify target player is not already in another Crew;
- update both Crew and player membership consistently;
- use a transaction or trusted function;
- create an audit record for captain/member changes.

Crew scoring must use score events, not client-side summed UI values.

---

## 13. Season Control

`appConfig/global` and `appConfig/game` define global state such as:

- `activeSeasonId`;
- `onboardingEntriesRequired`;
- feature flags;
- global availability.

A season record should define:

- ID and display name;
- timezone;
- start and end timestamps;
- phases;
- enabled decks;
- enabled bonuses;
- skin/theme association;
- voting windows;
- zine rules;
- archival state.

Admin season controls must validate:

- start precedes end;
- voting windows fit the season or explicitly overlap;
- only one active season is selected when required;
- deck windows are coherent;
- changing a live season cannot silently erase progress.

---

## 14. Security and Trust Boundaries

Client must not be trusted to:

- approve proof;
- award final Field XP;
- set admin status;
- finalize votes;
- pay winners;
- add itself to arbitrary Crews;
- unlock paid/restricted systems;
- create one-time awards repeatedly.

Use:

- Firestore Security Rules;
- App Check in production;
- authenticated user IDs;
- trusted Cloud Functions/Run services where cross-document atomicity or secret logic is required;
- admin allowlists/roles;
- audit logs;
- deterministic event identifiers.

Development App Check bypasses must never be enabled silently in production.

---

## 15. Error and Recovery Rules

- Submission failure preserves local/draft proof where technically possible.
- Retry operations must be safe to repeat.
- Partial uploads must be cleaned up or marked for cleanup.
- Failed score transactions must not leave score and entry status inconsistent.
- UI must distinguish permission denied, offline, validation failure, and server failure.
- Unhandled promises in gameplay flows are release-blocking defects.

---

## 16. Required Tests

At minimum, maintain tests for:

- onboarding and `/classification` routing;
- Starter count from unique approved missions;
- rejected/Needs More Proof card return behavior;
- duplicate approval idempotency;
- hint, retry, perk, and cap calculation;
- provisional score exclusion from rank;
- deck eligibility and exhaustion states;
- direct Fix Proof routing;
- sticker award idempotency;
- private ballots before lock;
- weekly finalization idempotency;
- Crew one-membership invariant;
- season boundary dates and timezone;
- Firestore rule access for players, admins, and public/community reads.
