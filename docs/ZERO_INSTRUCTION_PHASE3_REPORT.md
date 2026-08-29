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

Collision examples: active mission + vote → resume; repair outranks vote/draw; Starter 1/3 pending + next available → draw next; normal pending + draws available → draw (proof status secondary).

## Surfaces changed

| Surface | How it consumes the snapshot |
| --- | --- |
| **Basecamp** | Next Action panel + missions Quick Link copy + urgency styling from snapshot |
| **Missions** | `MissionsGuidanceStrip` Now strip; Deck still owns draw/reveal |
| **Trevor** | `buildTrevorRecommendationFromGuidance` — personality may differ; primary destination may not. Auto-open only for repair / reject / first Starter unlock |
| **Bottom nav** | One unlocked attention destination (`data-nav-attention`); locked outranks attention |
| **Feature gates** | `StarterGate` + `GatedFeaturePanel` for Voting / Loteria / Dex / Big Board — no silent redirect during Starter |

## Bugs fixed

1. **False MISSION CLEARED / MISSION APPROVED on drawn Heatwave cards** — definition `status: "approved"` no longer treated as player completion. Also removed AppContext / starterHelper fallback that copied `activeTrip.status` into `activeSubmissionStatus`.
2. **Silent Voting / Loteria redirects during Starter** — explicit lock panel with “Finish Starter Missions to unlock {Feature}” + Back to Missions.
3. **Pending split-brain** — drawable + pending → Draw primary, View Proof Status secondary.
4. **Superseded rejected after retry** — older rejected entry no longer outranks a newer pending retry / waiting-for-review state.

## Live scenario results (emulator)

Fixture: invite `LOCAL-DEV-PLAYER`, player `local-player@emulator.test` / `localplayer`.

| Scenario | Result | Notes |
| --- | --- | --- |
| A Fresh → Starter active / resume agreement | **PASS** | Basecamp / Missions / Trevor / nav agree on Resume The Initial Signal |
| B 1 Starter pending + next available | **PASS** | Draw Next Mission primary; View Proof Status secondary |
| C 3/3 Starter pending | **PASS** | View Proof Status / proofs being reviewed primary |
| D Needs more proof | **PASS** | Add More Proof primary everywhere; nav attention on Missions |
| E Rejected | **PASS** | Retry Mission primary; Trevor auto-opens |
| F Post-Starter active Heatwave | **PASS** | Resume Main Character Checkpoint — not cleared (after definition-status leak fix) |
| G Normal pending + missions available | **PASS** | Draw Another Mission primary; View Proof Status secondary |
| H Vote available while mission active | **PARTIAL** | Live ballot was building (no Vote Now). Unit test asserts resume > vote. While mission active, no Vote Now primary observed |
| I Locked Voting / Loteria / Dex / Big Board | **PASS** | Explicit lock panels; no silent redirects |

## Tests

```text
npm run test:guidance          # 28 pass
npm run test:starter           # pass
npm run test:trevor            # 25 pass
npm run test:emulator-guard    # 9 pass
npm run test:beta-blockers     # 28 pass
npm run test:mission-scoring   # 37 pass
npm run lint                   # pass
npm run build                  # pass
```

`npm run test:firestore-rules` not re-run while play emulators occupied the same ports (`emulators:exec` conflicts).

## Deferred (Phase 4)

- Major Basecamp visual redesign / quieter secondary chrome polish
- Stronger nav attention affordance (lime dot is intentionally restrained)
- Voting-window seed for live Scenario H ballot-open path
- Submit button character counter polish
- Signup jargon / Welcome overpromise (Phase 2 leftovers)
- Notification infrastructure, Crew rewrite, scoring/reward rewrites
