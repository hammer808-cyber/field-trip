# Firelight Tribunal Hardening Progress

## Canonical Model

Firelight Tribunal is separate from Weekly Voting.

- Private Sus signals live in `susReports`.
- Abuse/rate tracking lives in `susReportCounters` and `susAbuseSignals`.
- Admin-approved public cases live in `tribunalCases`.
- Private reporter/source linkage lives in `tribunalCasePrivate`, never on public `tribunalCases`.
- Protected community verdicts live in `tribunalVotes`.
- Immutable close snapshots live in `tribunalResults`.

Sus means private Signal Check. Reporter identities are never copied onto public `tribunalCases`.

## Completion Evidence

1. Users can privately submit one Sus signal per eligible community-feed proof.
   - `POST /api/reports/sus` uses deterministic `getSusReportId(userId, entryId)`.
   - Active duplicate statuses are blocked before write.

2. Users cannot Sus their own proof.
   - Server checks `canSubmitSusReport(uid, targetUserId)`.

3. Reporter identities remain private.
   - Public case writes use the allowlisted `getPublicTribunalCaseData`.
   - Reporter IDs and source report IDs are stored in `tribunalCasePrivate`.

4. Sus reports are rate-limited and abuse patterns are tracked.
   - Daily counter: `susReportCounters/{userId_day}`.
   - Abuse rollup: `susAbuseSignals/{userId}`.

5. Sus reports do not automatically punish, remove, or publicly shame anyone.
   - Sus endpoint never writes proof status, points, visibility, or user access.

6. Tribunal cases require private admin review before public escalation.
   - `/api/admin/tribunal/cases` requires an existing Sus report and admin reason.

7. Tribunal cases use a separate canonical schema from Weekly Voting.
   - Shared helpers live in `src/logic/firelightTribunal.ts`.

8. Eligible users can cast only one protected Tribunal verdict vote per case.
   - `POST /api/tribunal/vote` uses deterministic vote IDs and `transaction.create`.
   - A changed second vote returns `TRIBUNAL_VOTE_ALREADY_CAST`.

9. Tribunal votes are server-authoritative, deduplicated, auditable, and finalized into immutable result snapshots.
   - Direct client writes are denied by rules.
   - Vote audit records are written to `tribunalVoteAudit`.
   - Close writes `tribunalResults/{caseId}` with `transaction.create`.

10. Admins can dismiss, clear, request better proof, resolve privately, or escalate cases with logged reasons.
    - Admin moderation exposes `DISMISS`, `CLEAR_PRIVATE`, `REQUEST_PROOF` (`request_clarification`), and `ESCALATE_TRIBUNAL`.
    - Server requires `ADMIN_REASON_REQUIRED`.

11. The Firelight Tribunal page works across all defined states.
    - Existing `/voting/council` route renders locked, lobby, case briefing, vote booth, finalized reveal, and resolution archive states.

12. The page uses Fieldtrip firelight/camp aesthetics without copying Survivor branding.
    - Public labels use Firelight Tribunal, Signal Check, receipt, case file, and recommendation language.

13. Tests/manual scripts cover privacy, abuse protection, duplicate votes, eligibility, finalization, and admin audit logs.
    - `npm run test:voting-security` includes `tribunalSecurity.test.ts` and `susReports.test.ts`.

## Non-Goals Preserved

- Proof statuses remain `pending_review | approved | needs_more_proof | rejected`.
- Tribunal result does not award points or XP.
- Tribunal result does not auto-change proof status.
- Public pages do not expose reporter identity or comments.

## Status Vocabulary

Sus report statuses:

- `pending`
- `dismissed`
- `resolved`
- `request_clarification`
- `escalated_to_tribunal`

Tribunal case statuses:

- `admin_review`
- `open`
- `closed`
- `dismissed`

Tribunal vote values:

- `valid`
- `sus`
