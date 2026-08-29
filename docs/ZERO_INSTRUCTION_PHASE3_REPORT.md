# Fieldtrip Zero-Instruction UX — Phase 3 Report

**Date:** 2026-08-29  
**Branch:** `cursor/player-guidance-layer-3845`  
**PR:** https://github.com/hammer808-cyber/field-trip/pull/46  

## Guidance architecture

| Piece | Location |
| --- | --- |
| Pure resolver | `src/logic/playerGuidance.ts` (`resolvePlayerGuidance`, `resolvePlayerMissionLifecycle`) |
| App wiring | `src/hooks/usePlayerGuidance.ts` |
| Trevor adapter | `src/services/trevorGuidanceAdapter.ts` |
| Starter unlock ack | `src/services/starterUnlockAck.ts` |
| Docs | `docs/PLAYER_GUIDANCE.md` |

**Inputs (read-only):** `canonicalProgress`, live `entries`, `drawnMissionCards` + `activeTrip`, onboarding flags, voting availability / vote cast state.

**Output (`PlayerGuidanceSnapshot`):** `state`, `priority`, `title`, `shortMessage`, `flavorMessage`, `primaryActionLabel`, `primaryActionDestination`, `relevantMissionId`, `navigationTarget`, `urgency`, `autoOpenTrevor`, optional `secondaryAction`, `mission`.

**Why it does not duplicate gameplay truth:** it never mutates approval, scoring, XP, rewards, unlocks, or challenge definitions. Lifecycle status is derived from entries / canonical progress / drawn-card status only. Challenge-definition publication fields such as `status: "approved"` are ignored.

### Priority (highest first)

| Priority | State |
| ---: | --- |
| 1000 | `COMPLETE_ONBOARDING` |
| 950 | `REPAIR_PROOF` |
| 940 | `RETRY_REJECTED_PROOF` |
| 900 | `RESUME_ACTIVE_MISSION` |
| 850 | `DRAW_STARTER_MISSION` |
| 840 | `DRAW_NEXT_STARTER` |
| 800 | `WAITING_FOR_STARTER_REVIEW` |
| 750 | `STARTER_COMPLETE` |
| 700 | `DRAW_MISSION` |
| 600 | `VOTE_AVAILABLE` |
| 100 | `NO_URGENT_ACTION` |

## Codex review findings (final corrections)

### Review finding 1 — Retry / rejection ordering

**Root cause:** `latestActionableProof()` treated a mission as superseded whenever any pending/approved-looking entry existed. `retryMissionSubmission` marks prior attempts `retried`, and `normalizeEntryStatus` maps unknown statuses (including `retried`) to `pending_review`, so an older retried marker could suppress a newer rejection.

**Fix:** Newest meaningful attempt per mission wins via attempt timestamps. Raw `retried` markers are excluded (`isRetriedAttemptMarker`). Applied in guidance and Basecamp attention building. No second proof lifecycle model.

**Tests:** `npm run test:guidance` — rejected→pending supersedes; rejected→rejected keeps newest; needs-more→pending supersedes; needs-more→needs-more keeps newest; older retried + newer rejected keeps Retry.

### Review finding 2 — Starter complete acknowledgement

**Root cause:** `hasUnseenStarterUnlock` depended on `profile.trevorSettings.lastSeenApprovedCount`, but nothing wrote that field after presenting the unlock, so `STARTER_COMPLETE` / Trevor auto-open could repeat forever.

**Acknowledgement persistence mechanism:**  
Field written: `users/{uid}.trevorSettings.lastSeenApprovedCount = starterApprovedCount`  
Writer: `acknowledgeStarterUnlockSeen()` in `src/services/starterUnlockAck.ts`  
Call sites: Trevor auto-open + Trevor action, Basecamp primary action, Deck primary action when state is `STARTER_COMPLETE`.  
Unseen when: `starterComplete && lastSeenApprovedCount < starterRequiredCount`.  
Does not change canonical Starter completion.

**Fix:** Persist one-shot ack via dotted-path profile update; shared `isUnseenStarterUnlock()` helper.

**Tests:** unseen → `STARTER_COMPLETE`; acknowledged → not `STARTER_COMPLETE`; after ack, resume / vote follow priority. Live: ack write observed (`lastSeenApprovedCount: 3`); reload stays off `STARTER_COMPLETE` with no Trevor celebration.

### Review finding 3 — Starter Complete CTA must switch pack

**Root cause:** Deck treated `STARTER_COMPLETE` like a direct draw and called `handleDraw()` while `activePackId` was still `starter-signals`. After unlock ack, `DRAW_MISSION` could hit the same leftover pack.

**Fix:** `resolveMissionsGuidancePrimaryAction()` returns `{ kind: 'draw-pack', packId }` for `STARTER_COMPLETE` and for `DRAW_MISSION` when the destination pack is a playable post-Starter deck. Deck navigates to `/missions?pack=…` then `handleDraw(false, packIdOverride)`.

**Live result:** R1 **PASS** — with Starter selected, primary CTA switched to `heatwave-receipts` and drew **Bag of Consequences** (not Starter).

### Review finding 4 — Unlocked ≠ drawable

**Root cause:** `missionsStillAvailable()` returned true whenever Heatwave was unlocked, ignoring `eligibleCount`. Separately, paginated entry pages omitted profile completion caches whenever any entry was loaded, so exhaustion could be invisible to the client.

**Fix:** Use canonical `eligibleCount` on post-Starter decks. Always merge profile `completedChallengeIds` / `approvedCompletedChallengeIds` into canonical progress even when some live entries are present.

**Tests:** eligible > 0 → Draw; all 0 → not Draw / No Urgent Action; one deck eligible → Draw; exhausted + vote → Vote; pagination-gap profile completions → No Urgent Action.

## Live authenticated regression (R1–R5)

Fixture: invite `LOCAL-DEV-PLAYER`, player `r1-player@emulator.test` / `r1player`.

| ID | Expected | Result |
| --- | --- | --- |
| R1 | Starter complete + Starter selected → CTA switches to playable pack and draws | **PASS** |
| R2 | Unlock ack + reload → no repeat celebration / no Trevor auto-open for Starter | **PASS** |
| R3 | Reject → retry → reject again → Retry primary for newest rejection | **PASS** |
| R4 | All drawable exhausted → no dead Draw CTA | **PASS** |
| R5 | Exhausted + vote available → Vote Now primary | **PASS** |

Notes: Deck chooser intro overlay can briefly coexist with Trevor ack writes; by the time the Now strip is visible after dismiss, guidance may already be post-ack (`DRAW_MISSION`). Ack field is still written and persists across remount.

## Full regression

```text
npm run test:guidance          # 43 pass
npm run test:starter           # pass
npm run test:trevor            # 25 pass
npm run test:beta-blockers     # 28 pass (includes routesUnlocks)
npm run test:mission-scoring   # 37 pass
npm run test:emulator-guard    # 9 pass
npm run test:guidance (Basecamp view-model suite included)
npm run lint                   # pass
npm run build                  # pass
npm run test:firestore-rules   # 10 pass (play emulators stopped first)
```

## Remaining risks

- Trevor auto-open may race with the Deck “Starter Deck Complete” chooser overlay, so the Now strip may already be past `STARTER_COMPLETE` when first inspected — ack still persists.
- Live voting UI can still show “ballot building” while guidance correctly prioritizes Vote Now.
- Entry pagination means profile completion caches must stay accurate after approvals; Fix 4 now depends on that merge.
- Human verification recommended for production review-queue paths and real camera capture (emulator used Simulate Beta Capture / admin seed proofs).

## Deferred (Phase 4)

- Major Basecamp visual redesign / quieter secondary chrome polish
- Stronger nav attention affordance
- Submit button character counter polish
- Signup jargon / Welcome overpromise (Phase 2 leftovers)
- Notification infrastructure, Crew rewrite, scoring/reward rewrites
