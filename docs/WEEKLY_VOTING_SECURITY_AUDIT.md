# Weekly Voting Security + Logic Audit

Date: 2026-06-22
Scope: Weekly Voting, ballot assembly, vote writes, result finalization, Firestore rules, and existing Tribunal prototype boundaries.

## Executive Summary

Weekly Voting has a usable product shape, but it is not yet a hardened canonical governance system.

The current system has deterministic vote IDs and some Firestore rule checks, which helps against simple duplicate votes. However, the browser can still directly create and update vote records, assemble ballot candidate records, update ballot state, and influence mutable vote/count documents. The active cycle is computed in client code from the clock instead of stored as one authoritative server-controlled cycle document. Results are calculated in frontend service code and written to `weeklySummaries`, not finalized through a trusted server transaction with an immutable result snapshot.

Do not build Firelight Tribunal on top of this yet. Harden Weekly Voting first.

## Current Architecture Map

### Cycle

Current cycle boundaries are calculated in `src/services/votingCycleService.ts`.

- Source: clock-derived helper, not a Firestore `votingCycles/{cycleId}` document.
- Phase values: `submission`, `voting`, `awards`.
- Time model: Monday-Friday submission, Saturday voting, Sunday awards.
- Risk: each client can derive phase locally. There is no authoritative server-owned cycle lifecycle with `createdAt`, `updatedAt`, `finalizedAt`, `finalizedBy`, eligibility rules, nominee snapshot, or result snapshot.

### Ballot Candidates

Current candidate data is split across:

- `ballotCandidates/{candidateId}`
- `weeklyBallots/{seasonId_weekNumber}`
- `weeklyBallots/{seasonId_weekNumber}/candidates/{entryId}`
- canonical proof records in `entries/{entryId}`

`src/services/voteService.ts` says `promoteEntryToBallotCandidate` populates all three ballot structures. `src/services/weeklyBallotService.ts` also builds and refreshes `weeklyBallots`.

Risk: there are multiple candidate projections that can drift. The flat `ballotCandidates` collection is treated as the Voting Hub source, while `weeklyBallots/{id}/candidates` is described as canonical in other code.

### Vote

Current vote records live in:

```text
votes/{userId}_{seasonId}_w{weekNumber}_{category}
```

Fields include:

- `userId`
- `entryId`
- `weekNumber`
- `seasonId`
- `category`
- `createdAt`

This prevents duplicate vote documents for the same user, season, week, and category when the deterministic ID is used. But Firestore rules currently allow the owner to update `entryId` and `createdAt`, which makes a vote mutable after initial cast.

### Results

Results are calculated by reading `votes`, counting by `entryId`, then writing `weeklySummaries/{seasonId_weekNumber}.voteWinners`.

Risk: finalization is a frontend/admin service action. It is not a server-side trusted transaction. The result snapshot is mutable and not tied to a frozen canonical cycle.

### Existing Tribunal Prototype

The repo already contains `tribunalCases` and `tribunalVotes` services/rules. This should be treated as a prototype only until Weekly Voting is hardened.

Current Tribunal prototype permits client-created cases and client-updated vote counts. That conflicts with the requested future model where Sus reports have privacy, thresholds, admin review, rate limits, and no automatic public punishment.

## Audit Questions

### Where is the current voting cycle stored?

It is not stored as one authoritative document. It is derived from date/time in `src/services/votingCycleService.ts`. Ballot documents also store phase-like fields in `weeklyBallots/{seasonId_weekNumber}`, but those are not the single authoritative cycle state.

### What collection/document represents a vote?

`votes/{userId}_{seasonId}_w{weekNumber}_{category}`.

### How is the active voting window determined?

The frontend computes it from the current clock using `getCurrentVotingCycle()` and `getVotingPhase()`. The UI also checks `weeklySummaries.isLocked` and `isWeekLocked`, so there are multiple signals.

### How does the app determine who is eligible to vote?

The main gate is `isApproved()` in Firestore rules, which appears to mean the user has approved starter completion/admin eligibility. The UI also depends on route unlock state elsewhere. There is no server-side vote endpoint that checks banned/disabled users, abuse restrictions, starter completion, cycle state, or crew restrictions.

### Can a user vote more than once for the same category/cycle?

They cannot create multiple vote documents with the normal deterministic ID. However, they can update the existing vote's `entryId` while the rules permit owner updates. That is effectively a revote, not a frozen vote.

### Can a user vote for themselves?

The client checks `entry.userId === userId`, and Firestore rules also check that the entry owner is not the voter. This part is partially protected.

### Can users vote on pending/rejected/archived/hidden submissions?

Firestore rules check `entries/{entryId}.status == 'approved'`. They do not fully check hidden, archived, disqualified, private, wrong season, wrong week, or not-in-ballot candidate state on vote creation.

### Are votes calculated client-side anywhere?

Yes. `getVoteStandings()` reads votes and counts results in frontend service code. VotingHub can also compute fallback winners on the client for admin users if stored winners are missing.

### Can a client forge a vote by writing directly to Firestore?

Yes, within the limits of the current Firestore rules. An approved user can directly create a valid-shaped `votes/{deterministicId}` document for any approved entry, category string, season, and week that satisfy rule checks. The write does not have to go through trusted server logic.

### Can vote totals be manipulated from the browser?

Potentially yes. Candidate count fields in `weeklyBallots/{id}/candidates/{entryId}` allow non-admin approved users to update `voteCountByCategory` and `totalVotes`. If any UI uses those totals, they are not reliable. Weekly ballot documents can also be updated by approved users for some ballot-management fields.

### What happens on refresh, device changes, multi-tab, or quick duplicate taps?

The deterministic vote ID prevents duplicate create documents if all clients target the same ID. But because the write is not a transaction with server-side idempotency semantics, repeated writes can overwrite the same document. The current code awards participation XP based on a pre-write `getDoc`, so two fast clients could both observe no vote and attempt reward logic.

### What happens when voting closes?

The UI phase changes to `awards`, and admin finalization can write `weeklySummaries.voteWinners` and `isLocked`. There is no canonical server-owned transition from `voting_open` to `voting_closed` to `tallying` to `finalized`.

### Is the result snapshot frozen?

No. `weeklySummaries.voteWinners` is a mutable document field. Votes can still be updated by owners under current rules, and there is no immutable `votingCycles/{cycleId}/results/{category}` snapshot with locked vote IDs and tally metadata.

### Are admin overrides logged and attributable?

`finalizeVoteWinners()` calls `logAdminAction()` if `auth.currentUser` exists, but result writes themselves are not made through a server endpoint requiring a reason. There is no dedicated correction/audit model for post-finalization changes.

### Are there legacy or duplicate collections that could cause split-brain results?

Yes:

- `ballotCandidates`
- `weeklyBallots`
- `weeklyBallots/{id}/candidates`
- `weeklySummaries.voteWinners`
- `votes`
- `voteEvents` appears in server collection lists but is not a clear active canonical model.
- `src/data/votingBallotSchema.ts` defines a simpler `WeeklyBallot` shape with statuses `pending`, `active`, `closed`, while live services use `submission`, `voting`, `awards`.

## Highest-Risk Findings

### 1. Vote writes are client-side and Firestore-rule protected only

Users can create vote records directly if they satisfy the rule shape. The requested governance model requires trusted server-side logic or a protected callable/server endpoint.

Required fix: move vote casting to an Express endpoint such as `POST /api/voting/cycles/:cycleId/votes`, authenticated with Firebase ID token and protected by rate limiting.

### 2. Existing votes are mutable by the voter

Rules allow owner updates to `entryId` and `createdAt`. That means a vote can change after it is cast unless the app intentionally supports revotes. Even if revotes are allowed, they need server-side state, timestamps, and clear audit events.

Required fix: disallow direct client update/delete of votes. If revoting is desired, use server-side transition logic and write an audit event.

### 3. Active cycle is not canonical

The current phase comes from clock calculations and ballot/summary fields. A true governance system needs `votingCycles/{cycleId}` as the authority.

Required fix: create `votingCycles/{cycleId}` with lifecycle:

```text
upcoming -> nomination_open -> voting_open -> voting_closed -> tallying -> finalized -> archived
```

### 4. Ballot candidates have split-brain projections

The app currently has a flat candidate collection and a nested candidate subcollection. Both can be populated independently.

Required fix: choose `votingCycles/{cycleId}.nomineeSnapshot` or `votingCycles/{cycleId}/nominees/{nomineeId}` as the canonical nominee snapshot. Treat old candidate collections as migration inputs only.

### 5. Candidate vote totals are writable and should not be truth

Rules allow approved users to update `voteCountByCategory` and `totalVotes` on nested candidates. Any display using those fields can be manipulated.

Required fix: totals must be derived server-side from canonical votes, then written only to immutable result snapshots after finalization.

### 6. Finalization is not transactionally sealed

`finalizeVoteWinners()` is frontend service code. It reads votes, awards XP, and writes summary fields. It is not a trusted server transaction and does not freeze the vote set.

Required fix: finalization must be an admin-only server endpoint. It should read canonical votes, validate the cycle is closed, compute deterministic results, write immutable snapshots, award XP idempotently, and write an audit log with admin ID and reason.

### 7. Tribunal exists too early and is unsafe to expand as-is

The existing `tribunalService.ts` directly creates cases, updates entry `tribunalStatus`, increments public agree/disagree counts, and lets clients write Tribunal votes. It does not match the requested Sus -> Signal Check -> admin review -> possible Tribunal flow.

Required fix: pause Tribunal UI expansion. After Weekly Voting is hardened, replace the prototype with protected Sus reports and admin-reviewed escalation.

## Proposed Canonical Weekly Voting Model

```text
votingCycles/{cycleId}
```

Fields:

- `id`
- `seasonId`
- `weekNumber`
- `weekStartAt`
- `nominationOpensAt`
- `nominationClosesAt`
- `votingOpensAt`
- `votingClosesAt`
- `phase`
- `status`
- `eligibilityRules`
- `nomineeSnapshotVersion`
- `resultSnapshotVersion`
- `createdAt`
- `updatedAt`
- `finalizedAt`
- `finalizedBy`
- `finalizationReason`

```text
votingCycles/{cycleId}/nominees/{nomineeId}
```

Fields:

- `entryId`
- `entryOwnerId`
- `seasonId`
- `weekNumber`
- `categoryIds`
- `approvedAt`
- `photoUrl`
- `fieldNote`
- `displayName`
- `isEligible`
- `isDisqualified`
- `disqualifiedReason`
- `snapshot`
- `createdAt`
- `updatedAt`

```text
votingCycles/{cycleId}/votes/{voterId_categoryId}
```

Fields:

- `cycleId`
- `voterId`
- `categoryId`
- `nomineeId`
- `entryId`
- `createdAt`
- `updatedAt`
- `sourceVersion`
- `requestId`
- `status`

```text
votingCycles/{cycleId}/results/{categoryId}
```

Fields:

- `cycleId`
- `categoryId`
- `winnerNomineeIds`
- `validVoteCount`
- `invalidVoteCount`
- `tieBreakMethod`
- `tieBreakDetails`
- `finalizedAt`
- `finalizedBy`
- `snapshotHash`

```text
votingCycles/{cycleId}/auditEvents/{eventId}
```

Fields:

- `actorId`
- `action`
- `reason`
- `before`
- `after`
- `createdAt`
- `requestId`

## Required Hardening Plan

### Phase 1: Stop unsafe direct writes

- Add trusted server endpoint for vote casting.
- Client calls endpoint instead of writing `votes` directly.
- Firestore rules deny client create/update/delete for `votes`.
- Keep read access for users/admin as needed.

### Phase 2: Add canonical cycle documents

- Create `votingCycles/{cycleId}` for the active week.
- Move phase/status checks to server-side validation against the cycle document.
- Keep clock helpers as display-only helpers.

### Phase 3: Canonical nominee snapshot

- Build nominees from approved `entries`.
- Write nominees once per cycle.
- Treat `ballotCandidates` and `weeklyBallots/*/candidates` as legacy projections.
- Stop VotingHub from running ballot assembly on page load.

### Phase 4: Trusted tally/finalize endpoint

- Add admin-only server finalization endpoint.
- Validate cycle is closed.
- Count canonical votes.
- Write immutable results.
- Award XP idempotently.
- Log admin ID and reason.

### Phase 5: Diagnostics

Add an admin Voting Diagnostics panel showing:

- active cycle and phase
- cycle time window
- nominee count
- votes by category
- invalid/direct legacy votes
- duplicate/replay attempts
- nominees missing required fields
- stale open cycles
- cycles missing result snapshots
- legacy collections still populated
- dry-run tally preview
- finalize action with confirmation and audit trail

## Firestore Rule Direction

After server endpoints exist:

- `votingCycles`: read for approved users/admin, write admin/server only.
- `votingCycles/{cycleId}/nominees`: read for approved users/admin, write admin/server only.
- `votingCycles/{cycleId}/votes`: read owner/admin as needed, write server only.
- `votingCycles/{cycleId}/results`: read approved users/admin after release, write server only.
- legacy `votes`, `ballotCandidates`, `weeklyBallots`: read/migration only; deny client writes.

## Tribunal Boundary

Before building Firelight Tribunal:

1. Finish Weekly Voting hardening.
2. Freeze or remove the existing Tribunal prototype write paths.
3. Create separate `tribunalCases/{caseId}/reports/{reportId}` or protected report collection.
4. Do not reuse Weekly Voting votes for Tribunal votes.
5. Do not expose reporter IDs publicly.
6. Do not automatically punish or remove content from Sus reports alone.

## Recommended Next Implementation Pass

Start with Weekly Voting only:

1. Add `src/services/votingGovernanceService.ts` for canonical client API calls.
2. Add Express routes in `server.ts`:
   - `GET /api/voting/current-cycle`
   - `GET /api/voting/cycles/:cycleId/ballot`
   - `POST /api/voting/cycles/:cycleId/votes`
   - `POST /api/admin/voting/cycles/:cycleId/dry-run-tally`
   - `POST /api/admin/voting/cycles/:cycleId/finalize`
3. Update VotingHub to call server endpoints.
4. Update Firestore rules to deny direct client vote/candidate/result writes.
5. Add Voting Diagnostics admin panel.

Do not implement Sus reports or Tribunal UX until the above is working and deployed.

