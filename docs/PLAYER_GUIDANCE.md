# Player Guidance Snapshot

Derived “what should this player do right now?” layer used by Basecamp, Missions, Trevor, and bottom navigation.

This is **not** gameplay truth. It does not own or mutate mission approval, proof status, Starter completion, scoring, XP, rewards, deck completion, unlock eligibility, voting eligibility, admin review, or challenge definitions.

## Resolver

- **Location:** `src/logic/playerGuidance.ts`
- **Hook:** `src/hooks/usePlayerGuidance.ts`
- **Trevor adapter:** `src/services/trevorGuidanceAdapter.ts`

### Inputs (read-only)

- `canonicalProgress` (Starter, challenge status, feature access, deck remaining)
- live `entries` (proof lifecycle)
- `drawnMissionCards` + `activeTrip` identity (resume targets)
- onboarding flags already stored on the profile
- voting window + whether the player has voted this cycle

Player lifecycle **never** reads challenge-definition publication fields such as `status: "approved"`.

### Output

`PlayerGuidanceSnapshot`

- `state` — semantic, stable
- `priority`
- `title` / `shortMessage` — human meaning
- `flavorMessage` — Fieldtrip personality
- `primaryActionLabel` / `primaryActionDestination`
- `relevantMissionId`
- `navigationTarget`
- `urgency`
- optional `secondaryAction`

## Priority

Highest first. Safety and recovery outrank optional discovery.

| Priority | State | Why |
| ---: | --- | --- |
| 1000 | `COMPLETE_ONBOARDING` | Legal / Explorer Type / Field Kit incomplete |
| 950 | `REPAIR_PROOF` | Needs more proof |
| 940 | `RETRY_REJECTED_PROOF` | Rejected proof |
| 900 | `RESUME_ACTIVE_MISSION` | Drawn or in-progress mission, including Starter |
| 850 | `DRAW_STARTER_MISSION` | Starter not started |
| 840 | `DRAW_NEXT_STARTER` | Starter in progress, another draw available |
| 800 | `WAITING_FOR_STARTER_REVIEW` | All required Starter proofs submitted |
| 750 | `STARTER_COMPLETE` | Unseen Starter unlock, no active mission |
| 700 | `DRAW_MISSION` | Continue playing (including pending + still drawable) |
| 600 | `VOTE_AVAILABLE` | Unlocked voting window, not yet voted |
| 100 | `NO_URGENT_ACTION` | Idle |

Collision examples:

- Active mission + vote available → `RESUME_ACTIVE_MISSION`
- Needs more proof + vote available → `REPAIR_PROOF`
- Starter 1/3 pending + another available → `DRAW_NEXT_STARTER`
- Normal pending + missions available → `DRAW_MISSION` (proof status is secondary)

## State table

| Canonical inputs | Guidance state | Primary action | Target | Urgency |
| --- | --- | --- | --- | --- |
| Legal / type / field kit incomplete | `COMPLETE_ONBOARDING` | Continue Setup | current onboarding route | critical |
| Needs-more-proof entry (no newer pending/approved for that mission) | `REPAIR_PROOF` | Add More Proof | Missions / Capture | critical |
| Rejected entry (no newer pending/approved for that mission) | `RETRY_REJECTED_PROOF` | Retry Mission | Missions / Capture | critical |
| Drawn or active mission, no approved/pending player entry | `RESUME_ACTIVE_MISSION` | Resume [Mission] | Missions | high |
| Starter 0 submitted | `DRAW_STARTER_MISSION` | Draw a Mission | Missions | high |
| Starter 1–2 submitted, more available | `DRAW_NEXT_STARTER` | Draw Next Mission | Missions | high |
| Starter 3/3 submitted, not complete | `WAITING_FOR_STARTER_REVIEW` | View Proof Status | Logbook | high |
| Starter complete, unseen unlock, no active mission | `STARTER_COMPLETE` | Draw a Mission | Missions | normal |
| Pending normal proof + draws still available | `DRAW_MISSION` | Draw Another Mission | Missions | normal |
| Voting open, starter unlocked, nothing higher | `VOTE_AVAILABLE` | Vote Now | Voting | low |
| Nothing urgent | `NO_URGENT_ACTION` | Open Missions | Missions | low |

## Surfaces

- **Basecamp** Next Action, Quick Links missions copy, and visual urgency come from the snapshot.
- **Missions** shows a Now strip with the same primary/secondary actions. Deck still owns draw/reveal.
- **Trevor** uses `buildTrevorRecommendationFromGuidance`. Personality copy may differ; destination may not. Auto-open only for repair, rejected retry, and first Starter unlock.
- **Bottom nav** marks exactly one unlocked destination as attention. Locked always outranks attention.
- **Feature gates** (`StarterGate` + `GatedFeaturePanel`) explain a visible lock instead of silently redirecting Voting, Loteria, Dex, or Big Board.

## Trevor auto-open

Do **not** auto-open Trevor merely because guidance exists. Auto-open only for:

- needs more proof
- rejected proof
- meaningful first-time Starter unlock

Normal next actions stay on the page.
