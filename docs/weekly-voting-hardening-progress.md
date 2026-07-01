# Weekly Voting Hardening Progress

Updated: 2026-06-26

## Canonical Model

- Cycle model: `src/services/votingCycleService.ts`
- Weekly voting helpers: `src/logic/weeklyVoting.ts`
- Canonical vote collection: `votes`
- Canonical vote ID: `userId_seasonId_w{weekNumber}_{category}`
- Canonical ballot document: `weeklyBallots/{seasonId_weekNumber}`
- Canonical result snapshot: `weeklySummaries/{seasonId_weekNumber}`

## Completed

- Vote writes now go through `POST /api/voting/weekly/vote`.
- Vote writes use Admin SDK transactions and immutable `transaction.create`.
- Duplicate clicks for the same proof return success without creating a new vote.
- A different second vote in the same category/cycle is rejected with `VOTE_ALREADY_CAST`.
- Voting outside the canonical UTC Saturday voting window is rejected.
- Candidate, entry status, archived, and disqualified checks are enforced server-side.
- Self-voting is enforced server-side.
- Crew voting can be enforced server-side by setting `appConfig/main.weeklyVoting.enforceCrewRestriction` or `appConfig/main.voting.enforceCrewRestriction` to `true`.
- Admin finalization goes through `POST /api/admin/voting/finalize-week`, requires a reason, creates audit logs, and short-circuits already locked snapshots.
- Firestore rules block direct client writes to `votes`, `weeklyBallots`, weekly ballot candidates, and weekly summaries.
- Weekly diagnostics are available at `GET /api/admin/voting/diagnostics?seasonId=...&weekNumber=...`.

## Legacy Compatibility

- Existing `weeklyVotes` and `voteEvents` data is preserved.
- New tallies read only canonical `votes`.
- Diagnostics report whether legacy samples exist.
- No legacy records are deleted or migrated automatically in this hardening pass.

## Evidence

Run:

```bash
npm run lint
npm run test:voting-security
npm run test:starter
npm run test:rubric
npm run build
PORT=3100 NODE_ENV=production ENFORCE_APP_CHECK=false npm start
curl -sS http://127.0.0.1:3100/api/health
```

Expected:

- TypeScript passes.
- Weekly voting security tests pass.
- Starter/rubric regression tests pass.
- Production build passes.
- Built server health endpoint returns `{"status":"ok",...}`.

## Completion Check Mapping

1. One canonical voting cycle model: `votingCycleService.ts` plus `weeklyVoting.ts`.
2. Server-side vote writes: `/api/voting/weekly/vote`.
3. One vote per category/cycle: deterministic vote ID and immutable create.
4. Duplicate protection: same vote ignored, conflicting vote rejected.
5. Window protection: server UTC cycle check.
6. Eligibility protection: server entry/candidate validators.
7. Self/crew restrictions: server restriction helper.
8. Server-side totals: admin finalization reads canonical `votes`.
9. Immutable result snapshots: locked `weeklySummaries` short-circuit.
10. Admin override reason/audit: build/finalize require reason and write `adminLogs`.
11. Rules protection: direct client vote/cycle/result writes denied.
12. Diagnostics: duplicates, stale cycles, invalid votes, legacy samples, and missing snapshots reported.
13. Legacy data: preserved and documented.
14. Tests/manual suite: `test:voting-security` plus verification commands above.

## 2026-06-30 Proof Distribution And Weekly Cycle Pass

Added a shared proof distribution layer so Community Feed, Crew Feed, and Weekly Voting eligibility can use the same approved-proof rules instead of separate page-specific filters.

Canonical proof distribution fields now normalize from `entries`:

- identity: `entryId`, `userId`, `challengeId`, `deckId`, `seasonId`, `crewId`
- lifecycle: canonical `status`, effective approval/submission timestamps
- media: `photoUrl` or legacy storage/reference fields
- content: `fieldNote`, `earnedXp`
- visibility: `showInCommunityFeed`, `showInCrewFeed`, `allowWeeklyVoting`
- moderation: `isHidden`, `hiddenReason`, `isSuspected`, `isTribunalEligible`

Eligibility rules added:

- Community Feed requires approved status, explicit or legacy public visibility, effective approval timestamp, renderable proof media, owner ID, and no hidden/deleted/disqualified flags.
- Crew Feed additionally requires matching active crew and crew-feed visibility.
- Weekly proof eligibility builds on Community Feed eligibility, requires weekly voting visibility, and can be checked against the active weekly cycle window.

Canonical weekly cycle target added:

- `weeklyCycles/{weekId}`
- `weeklyCycles/{weekId}/proofs/{entryId}`
- `weeklyCycles/{weekId}/votes/{voteId}`
- `weeklyCycles/{weekId}/results/{resultId}`

This pass preserves the current production `weeklyBallots`, `votes`, and `weeklySummaries` server endpoints as the live compatibility path. The new `weeklyCycles` tree is protected in Firestore rules and ready for server job migration, but live vote storage was not silently switched.

Evidence from this pass:

```bash
PATH=/usr/local/bin:$PATH npx tsx --test src/__tests__/proofDistribution.test.ts src/__tests__/weeklyCycleEligibility.test.ts
PATH=/usr/local/bin:$PATH npm run test:community-feed
PATH=/usr/local/bin:$PATH npm run test:beta-blockers
PATH=/usr/local/bin:$PATH npm run test:voting-security
PATH=/usr/local/bin:$PATH npm run lint
PATH=/usr/local/bin:$PATH npm run build
PATH=/usr/local/bin:$PATH PORT=3100 NODE_ENV=production FIREBASE_PROJECT_ID=field-trip-495823 FIRESTORE_DATABASE_ID=ai-studio-6bdf91b5-28e9-46f3-ae49-89cf99e2d88a node dist/server.cjs
PATH=/usr/local/bin:$PATH curl -sS -i http://127.0.0.1:3100/api/health
```

Result:

- Focused proof distribution and weekly cycle tests passed.
- Community Feed tests passed.
- Beta blocker route/feed tests passed.
- Voting security tests passed.
- TypeScript lint passed.
- Production build passed.
- Local production server health check returned HTTP 200.
