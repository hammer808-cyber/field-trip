# Fieldtrip Scoring Rubric

This is the current scoring contract for production.

## Canonical Rule

XP is awarded only when an admin approves a canonical proof entry.

Submitting proof does not award XP. AI analysis does not award XP. Pending review does not award XP. UI counters should never invent XP from pending proof.

## Source Of Truth

- `scoreEvents` is the durable scoring ledger.
- `users/{uid}` score fields are mirrors for fast UI display.
- Approved proof entries keep compatibility mirrors such as `awardedXP`, `xpAwarded`, and `pointsAwarded`.

If these disagree, repair from `scoreEvents` and approved canonical entries.

## Approval Award Flow

1. Admin approves a canonical `entries/{entryId}` record.
2. The entry moves to `status: "approved"`.
3. The app writes one idempotent `scoreEvents/score_{entryId}` record.
4. The server increments all user score mirrors.
5. Only after that write succeeds does the entry become `xpAwarded: true`.

If the score write fails, the entry is flagged with `scoreAwardStatus: "award_failed"` and can be retried. It must not be treated as successfully awarded.

## Base Mission XP

The base award comes from the challenge:

- `baseXP`
- fallback `basePoints`
- fallback `100`

Starter and seasonal mission banks still define the mission-level base XP.

## Rubric Bonuses

The scoring engine in `src/logic/scoringLogic.ts` supports:

- proof/photo bonus
- field note bonus
- weekly catalyst bonus
- hint penalty
- first valid submission bonus
- chaos modifier bonus
- sabotage survival bonus
- vote winner bonus
- field check bonus
- final crown bonus
- late penalty

These bonuses should be used for admin-reviewed XP decisions. They should not be awarded from temporary UI state.

## Reset Contract

Soft and hard resets must clear every visible score mirror:

- `xp`
- `points`
- `totalXP`
- `totalPoints`
- `seasonXP`
- `seasonPoints`
- `weeklyXP`
- `weeklyXp`
- `weeklyPoints`
- `score`
- `pendingPoints`
- approval counters
- trip counters

Hard reset also clears or archives `scoreEvents` so old XP cannot reappear from stale ledger data.
