# Fieldtrip Zero-Instruction Usability Audit — Phase 2 (Authenticated Live)

**Date:** 2026-08-29  
**Branch:** `cursor/phase2-authenticated-ux-audit-8aec`  
**Scope:** Experience Fieldtrip as a normal first-time player with authenticated local access, then audit remaining confusion after Phase 1.  
**Constraint:** No shared Now state machine, Basecamp restructure, navigation rewrite, or Trevor rewrite was implemented. Product UX recommendations stay recommendations.

**Method:** Live UI interaction on `localhost:3000` against Firebase Auth / Firestore / Storage emulators. Review actions used `npm run review:emulator`. Walkthrough treated the tester as a confused first-time user who taps dominant controls and does not read long instructions.

---

## 1. Authenticated Test Environment

### What already existed (Step 1 inspection)

Before adding anything, the repo already had:

| Capability | Present? | Notes |
|---|---|---|
| Firebase Auth emulator wiring in app | **No** | No client/server Auth emulator path for normal player login |
| Firestore emulator | **Partial** | Used for rules unit tests, not a playable local player loop |
| Development seed for a normal first player | **No** | No first-player onboarding fixture |
| Invite-code fixtures for local play | **No** usable local path | Server could auto-create `FIELD-TRIP-001` against live Admin SDK — **not used** (production risk) |
| DevTools / admin starter bypass / hard reset | **Yes** | Requires an already-authenticated session, often admin |
| E2E test accounts against production | **No** safe option | Not used |
| Phase 1 audit | **Yes** | `docs/ZERO_INSTRUCTION_USABILITY_AUDIT.md` — blocked at invite wall |

Conclusion: no existing safe mechanism let a Cloud Agent experience a normal authenticated player journey end to end. The smallest missing piece was local Auth+Firestore(+Storage) emulator wiring plus a seed that creates invite/config/starter content without creating the player account.

### How authenticated testing was achieved

Repository changes **were required**. They are development/test-only and production-impossible.

| Piece | Path | Role |
|---|---|---|
| Server guard | `src/server/firebaseEmulatorGuard.ts` | Refuses production / Cloud Run; requires loopback Auth+Firestore hosts |
| Client gate | `src/lib/firebaseEmulators.ts` | Requires Vite `DEV` + `VITE_USE_FIREBASE_EMULATORS=true` |
| Admin init | `src/server/firebaseAdmin.ts` | Emulator path skips ADC; uses `(default)` DB |
| Client connect | `src/lib/firebaseInit.ts` | `connectAuth/Firestore/StorageEmulator`; skips App Check on emulator |
| Emulator config | `firebase.json` | Auth `9099`, Firestore `8080`, Storage `9199`, UI `4000` |
| Seed | `scripts/seed-local-emulator.ts` | Invite, appConfig, season **with weeks**, starter challenges, decks, separate emulator admin |
| Review helper | `scripts/emulator-review.ts` | list / approve / needs-more / reject via existing admin API |
| Banner | `src/components/LocalEmulatorBanner.tsx` | Visible only in emulator mode |
| Docs | `docs/LOCAL_AUTHENTICATED_TESTING.md` | Runbook |
| Isolation tests | `src/__tests__/firebaseEmulatorGuard.test.ts` | `npm run test:emulator-guard` — **9/9 pass** |

**Run (three terminals):**

```bash
npm run emulators
# then seed with FIREBASE_*_EMULATOR_HOST vars
npm run seed:emulator
npm run dev:emulator
```

**Local fixture identities (emulator only, not production secrets):**

- Invite: `LOCAL-DEV-PLAYER`
- Player signup through UI: `local-player@emulator.test` / `localplayer` / password meeting on-screen rules
- Emulator admin for review scripts only: `emulator-admin@localhost` (never used in the player browser)

This is **not** a skip-login path. Invite → signup → legal → quiz → Field Kit → Missions still run through the real UI.

### Production exclusion guarantee

All of the following must be true, or the emulator path fails closed:

1. Server: `NODE_ENV` is not `production`, and Cloud Run/Functions signals are unset.
2. Server: Auth + Firestore emulator hosts are loopback.
3. Client: Vite `DEV`, not `PROD`, `MODE !== production`, and `VITE_USE_FIREBASE_EMULATORS=true`.
4. Seed/review scripts: same server guard + reachable emulator hub.

A production Cloud Run service sets `K_SERVICE` + `NODE_ENV=production`. A production Vite build sets `import.meta.env.DEV=false`. Either alone is enough to refuse activation.

### Test-only bugs found while enabling the journey (not product UX)

These blocked the walkthrough and were fixed so authenticated play could continue:

1. Seed season missing `weeks` → `FATAL_RUNTIME_FAILURE` in AppProvider.
2. Proof submit aborted: `addDoc` then `updateDoc({ id })` violated entry update allowlist → predetermined id + `setDoc` in `gameService`.
3. Player entry updates tried to write AI fields not allowlisted → status-key-only updates; AI detail stays on `proofReviews`.
4. Missing `proofReviews` `get` returned null `resource.data` and crashed rules → null-safe get rules for entries/proofReviews.

These are correctness fixes needed for local (and real) submit paths; they are not the Phase 2 UX redesign.

---

## 2. Live Journey Record

Evidence directory: `/opt/cursor/artifacts/`  
Key videos: `onboarding_invite_signup_to_missions.mp4`, `mission_loop_submit_attempts.mp4`  
Key stills: `01_welcome.webp` … `17_logbook_pending.webp`, `phase2_20_*` … `phase2_29_*`

| # | Journey step | Result | What a confused user saw |
|---|---|---|---|
| 1 | Invite / account entry | **Tested** | Welcome → Access Code. Empty submit showed an error (improved). Invite `LOCAL-DEV-PLAYER` worked. Signup still jargon-heavy (`READY_FOR_LAUNCH`, `PROFILE_SETUP // AUTH_SECURE`). |
| 2 | Legal / beta gate | **Tested** | Checkbox + continue. Dense legal wall, but recoverable. |
| 3 | Explorer Type quiz | **Tested** | Three questions; progress clear. Fun answers; purpose still fuzzy. |
| 4 | Explorer result | **Tested** | Big persona card + sticky CTA toward first mission / Field Kit. |
| 5 | Camera / location setup | **Tested** | Field Kit permissions. Allow / maybe later both available. |
| 6 | Land after onboarding | **Tested** | Lands on **Missions**, not Basecamp. `DRAW A MISSION` visible. Dex demoted/locked. Missions highlighted. Trevor chip already present (`RESUME THE INITIAL SIGNAL` even before draw in one capture). |
| 7 | Starter Mission 1 draw | **Tested** | Draw verb is clear. Card reveal works. |
| 8 | Mission briefing | **Tested** | **Do This Mission** dominant; **Save for later** secondary text. |
| 9 | Starting / doing mission | **Tested** | Capture clipboard / brief. |
| 10 | Capture | **Tested** | **Open Camera** label present. Gallery used in emulator when live camera was impractical. |
| 11 | Field note | **Tested** | Min 10 chars enforced. Orange banner + counter near note. Button still says only **Submit Proof** (not `Submit Proof (n/10)`). |
| 12 | Submit Proof | **Tested** | First Mission 1 attempt failed on rules bugs (fixed mid-session). Later submits succeeded. |
| 13 | Pending result | **Tested** | Pending celebration / return path. Starter X of Y guidance present after Phase 1. |
| 14 | Return to Missions | **Tested** | Could continue Starter loop. |
| 15 | Starter Mission 2 | **Tested** | Draw → do → capture → submit succeeded. |
| 16 | Starter Mission 3 | **Tested** | Same loop; reached 3/3 submitted. |
| 17 | All Starter proofs pending | **Tested** | Missions: **PENDING REVIEW** + “All three Starter Signals are in review…” + **VIEW PROOF STATUS**. |
| 18 | Needs More Proof | **Tested** | Via `review:emulator needs-more`. **Add More Proof** route worked after submit fixes. |
| 19 | Rejected / retry | **Tested** | Via `review:emulator reject`. **Retry Mission** / **Keep Going** / checklist → **Open Camera**. |
| 20 | Starter approved / complete | **Tested** | All three approved via emulator admin. `onboardingCompleted: true`, `starterApprovedCount: 3`. Unlock modals appeared. |
| 21 | First unlocked post-Starter experience | **Tested** | Heatwave deck available; unlock messaging. |
| 22 | Basecamp after Starter | **Tested** | Shows progress 3/3 Starter. **Critical conflict:** Next Action said **MISSION CLEARED** for a drawn Heatwave card that had **no approved proof**, while Quick Links said **Continue Emotional Support Beverage**. |
| 23 | Dex | **Tested** | Locked copy excellent during Starter. Unlocked Dex opens Collection / Sticker Book after Starter. |
| 24 | Voting | **Tested** | During Starter: tapping Voting **silently redirected to Missions** (not in allowed onboarding routes). After Starter: Voting hub loads (submission window / ballot building). |
| 25 | Big Board | **Tested** | During Starter: reachable + lock screen (allowed route). After Starter: live board. |
| 26 | Logbook / proof history | **Tested** | Pending and approved states visible. Some label noise (`SF APPROVED` / status phrasing). Profile not in bottom nav. |
| 27 | Trevor guidance | **Tested** | Collapsed chip often present. Auto-popup observed post-Starter. Expanded copy can conflict with Basecamp (“Starter clearance confirmed… **OPEN SOCAL SUMMER**” while Basecamp says mission cleared / draw next). |
| 28 | Loteria entry and return | **Tested** | From Basecamp **LOTERIA BOARD**. Back returned to **Basecamp** (Phase 1 fix). During Starter, Loteria was also subject to silent Missions redirect if reached via other paths. |
| 29 | Leave with active mission / reopen | **Partial** | Left mid-flow during Starter and post-Starter. Resume chip / Trevor helps sometimes. Basecamp “MISSION CLEARED” false positive destroyed resume trust after Heatwave draw. |
| 30 | Simulated long time away | **Not practical** | Emulator session stayed continuous. Returning-user after days was not simulated. |

### Could not fully test / caveats

- True live in-app camera on the Cloud Agent desktop (gallery/camera-roll path used).
- Long multi-day return.
- Mid-journey had duplicate `starter-1` entries and AI kill-switch / rate-limit noise; evidence remains strong enough for UX conclusions.
- Save-for-later confirmation was not re-deeply exercised on the final post-Starter account without drawing a new mission.

---

## 3. Phase 1 Verification (live)

| Phase 1 fix | Verdict | Why |
|---|---|---|
| **Draw a Mission** | **PASS** | Missions ready state shows **DRAW A MISSION** / **DRAW YOUR NEXT MISSION**. No longer mislabeled as Start Mission at draw. |
| **Do This Mission** | **PASS** | Post-draw / briefing primary uses **Do This Mission**. |
| **Open Camera** | **PASS** | Capture brief primary uses **Open Camera**. |
| **Submit Proof** | **PARTIAL** | Label is correct and eventually worked, but first live submits aborted on rules/`gameService` bugs. After fixes, submit succeeded. Feeling: “did my tap fail?” until repaired. |
| **Save for later confirmation** | **PARTIAL** | Briefing demotes Save for later to secondary text (good). Explicit confirmation of where the card went was not strongly observed in this pass. |
| **Field-note requirement** | **PASS** (with polish gap) | Requirement is visible: orange banner, `n / 10 characters`, disabled Submit. Not yet on-button `Submit Proof (n/10)`, but users can tell why Submit is blocked. |
| **Locked Dex treatment** | **PASS** | During Starter, Dex is demoted/locked (no raised orange special). Missions highlighted. Locked Dex copy is clear. |
| **Missions emphasis during Starter** | **PARTIAL** | Landing on Missions + highlight is good. Bottom nav still shows five destinations; Voting silently redirects; Trevor/Loteria/Settings still compete. |
| **Post-submit Starter X of Y sent** | **PASS** | Result / Missions guidance shows Starter sent progress and next action. |
| **3/3 pending → proof status** | **PASS** | **VIEW PROOF STATUS** after all three in review. |
| **Needs-more-proof → repair route** | **PASS** | **Add More Proof** reached capture repair path after review action. |
| **Rejected → retry route** | **PASS** | **Retry Mission** / Keep Going / Open Camera path worked. |
| **Starter complete** | **PASS** | Approvals unlocked post-Starter surfaces; unlock UI appeared. |
| **Unlocked Dex** | **PASS** | Dex opens after Starter; Collection usable. |
| **Loteria Back → Basecamp** | **PASS** | Live: Loteria Back returned to Basecamp. |

---

## 4. Remaining Confusion Map (after Phase 1 only)

Only confusion that still appeared in live authenticated play:

### C1 — Voting / Loteria silent lock during Starter
**What user thinks:** Tapping Voting/Loteria should open that feature or a lock explanation.  
**What happens:** `App.tsx` allows Deck/Capture/Profile/Big Board/Basecamp/Crew/Collection during incomplete onboarding, but **not** Voting or Loteria → hard `Navigate` to `/missions` with no explanation.  
**Severity:** Critical

### C2 — Basecamp “MISSION CLEARED” false positive
**What user thinks:** Emotional Support Beverage is finished and counts toward deck progress.  
**What is true:** Card was drawn; no proof submitted; Heatwave still 0/15. Challenge bank definitions ship with `status: "approved"` (published), and Basecamp treats trip `status` as player lifecycle status.  
**Also on the same screen:** Quick Links say **Continue Emotional Support Beverage**; Trevor says open SoCal Summer.  
**Severity:** Critical

### C3 — Competing next actions on Basecamp
Next Action, Progress cards, Loteria/Settings, Quick Links, Trevor chip, and Needs Attention can all speak at once. After Starter, they disagreed live.  
**Severity:** High

### C4 — Signup / bureau jargon still walls trust
Invite entry improved, but signup headers still feel like broken government software.  
**Severity:** Medium

### C5 — Welcome still overpromises “mission”
Welcome CTA still oriented around starting a mission before invite/account. Phase 1 verb work fixed Missions more than Welcome.  
**Severity:** Medium

### C6 — Pending Basecamp CTA vs copy conflict
When proof is pending, Basecamp says pending does not stop drawing another mission, but the primary button is **View Logbook**.  
**Severity:** Medium

### C7 — Logbook / Missions status language drift
Pending vs approved vs “not verified” / stamp phrasing can disagree across Missions sidebar, Basecamp progress, and Logbook.  
**Severity:** Medium

### C8 — Trevor is discoverable but not authoritative
Chip helps if noticed. Auto-expand happens sometimes. Copy can be multi-clause and point at a different destination than Basecamp.  
**Severity:** High

### C9 — Resume after interruption still fragile
Depends on noticing Trevor chip, Missions reveal state, or Basecamp. False “cleared” state actively mis-teaches resume.  
**Severity:** High

### C10 — Progress counter flicker / dual denominators
Live captures showed Starter 3/3 beside Active Deck 0/25 and temporary 0/3 vs pending mismatches while syncing.  
**Severity:** Medium

---

## 5. Top Remaining Usability Problems (ranked by observed impact)

1. **No single authoritative “what now” across Missions / Basecamp / Trevor / nav** — Phase 1 fixed verbs; the user still gets multiple next actions.
2. **Basecamp MISSION CLEARED false positive** after drawing published Heatwave cards — destroys trust in the guidance home.
3. **Silent Voting/Loteria redirects during Starter** — locked destinations should explain, not vanish.
4. **Trevor conflicts with Basecamp / Quick Links** on the same screen.
5. **Pending guidance split-brain** — “you can draw another” vs **View Logbook** as the only loud CTA.
6. **Signup / residual bureau jargon** after Phase 1 invite improvements.
7. **Profile/Logbook discovery** — still not a primary nav destination when proofs matter.
8. **Submit Proof button does not carry the note counter** — requirement is nearby, not on the control itself.
9. **Post-Starter unlock overload** — Dex special returns, Voting/Big Board/Loteria/SoCal all become available at once with weak prioritization.
10. **Status label drift** across Logbook / Missions / Basecamp.

---

## 6. Basecamp Diagnosis

**Does Basecamp currently succeed as “what should I do now?”**  
**Not reliably.**

What works:

- It already has a real Next Action model (`src/logic/basecampViewModel.ts`) with attention → mission → starter → deck priority.
- Pending / repair / starter incomplete copy is often good when the status inputs are correct.
- Progress, Crew, Recent Activity, and Quick Links are useful once the user trusts the primary panel.

What fails in live play:

- First users often never land here until mid/late Starter (onboarding destination is Missions).
- Loteria + Settings sit above the fold with strong visual weight.
- Quick Links can contradict Next Action (live: Continue vs Cleared).
- Next Action can be wrong when trip definition `status: "approved"` leaks into player status.
- During pending Starter, primary CTA often sends to Logbook even when the better outdoor action is draw next.

**Helpful vs competing:**

| Element | Helpful? | Competes with now? |
|---|---|---|
| Next Action panel | Yes, when correct | — |
| Needs Attention | Yes for repair | Low when empty |
| Progress | Situational | Medium (XP/level before loop mastery) |
| Crew | Later | Medium early |
| Quick Links | Sometimes | High when they disagree |
| Loteria / Settings | Secondary | High above the fold |
| Trevor chip | Situational | High when conflicting |
| Recent Activity | Review aid | Low |

**Recommendation (do not implement yet):** Basecamp should become the guidance home **only after** Next Action is fed by one canonical player-guidance state and competing chrome is demoted.

---

## 7. Trevor Diagnosis

**When Trevor helps:**

- Repair / reject / active Starter states (high priority rules in `trevorRecommendationEngine.ts`).
- Post-Starter celebration / unlock prompting (observed auto attention).
- As a resume hint when the chip text is specific (`RESUME …`).

**When users miss him:**

- Collapsed by default on many screens.
- Hidden or less useful on capture/briefing routes.
- Multi-clause witty copy is skippable.
- Even when opened, CTA can be the wrong destination relative to Basecamp (live: **OPEN SOCAL SUMMER** while user still has a Heatwave card and Basecamp says cleared/draw).

**Verdict:** Trevor is a counselor layer, not a source of truth. He should derive from the same guidance state as Basecamp/Missions, auto-open only on stuck/warning transitions, and never contradict the primary Now action.

---

## 8. Navigation Diagnosis

| Destination | During Starter | After Starter | Understandable? |
|---|---|---|---|
| Missions | Highlighted; correct home | Still core | Mostly yes |
| Dex | Locked / demoted; clear lock page | Special raised button returns | Yes after Phase 1 |
| Voting | **Silent redirect to Missions** | Opens hub | **No** while locked |
| Big Board | Opens lock screen (allowed) | Opens board | Partial (inconsistent with Voting) |
| Basecamp | Available; underused early | Guidance home candidate | Partial |
| Profile / Logbook | Not in bottom nav | Same | Weak discovery |
| Loteria | Easy to hit from Basecamp; other entries may redirect | Back→Basecamp works | Mixed |

**Locked / unlocked / current / urgent are not visually one system.** Dex lock treatment improved. Voting urgency/lock is worse than Big Board. No consistent badge language for “do this now” vs “locked” vs “new unlock.”

---

## 9. Player Guidance State Map

States below are supported by current canonical / starter / Basecamp / Trevor logic (`canonicalProgress`, `StarterCompletionState.status`, `basecampViewModel`, `deckProgressService.nextAction`, Trevor rules). No invented states.

| CANONICAL PLAYER STATE | MOST IMPORTANT ACTION | CURRENT UI SIGNAL | CURRENT TREVOR SIGNAL | CURRENT BASECAMP SIGNAL | CURRENT NAV SIGNAL | CONFLICT / GAP |
|---|---|---|---|---|---|---|
| Need invite / account | Enter invite, create account | Welcome / Access Code / Signup | Usually none | N/A | Auth only | Welcome still sounds like mission start |
| Legal incomplete | Accept legal gate | BetaAccessGate | `legal_required` if shown | N/A | Blocked | Dense copy |
| Explorer Type incomplete | Finish quiz / see result | Classification / Field Type | `classification_required` | N/A | Forced routes | Jargon headers |
| Field Kit incomplete | Allow or skip permissions | FieldKitOnboarding | Weak / none | N/A | Forced overlay | Location reason vague |
| Starter not started / draw available | **Draw Starter mission** | Missions **Draw a Mission** | `starter_incomplete` → draw | Finish Starter Signals / Open Starter Deck | Missions highlight; Dex locked | Landing is Missions, not Basecamp |
| Starter mission drawn / active | **Do / continue mission** | Do This Mission / Open Camera | `starter_active` / resume chip | Open Briefing / Continue Mission | Missions | Briefing Save-for-later still easy to miss for meaning |
| Capture in progress / note incomplete | Finish photo + note + submit | Open Camera; Submit disabled + note helper | Often hidden on capture | May still show older mission state | Capture (no nav urgency) | Submit label lacks on-button counter |
| Starter proof pending (1–2 of 3) | **Draw next Starter** (or wait) | Post-submit X of Y; Missions draw | `starter_incomplete` + optional logbook | Often **View Logbook** while copy says you can draw | Missions | Basecamp CTA vs copy conflict |
| Starter 3/3 pending review | Wait / view proof status | **VIEW PROOF STATUS** | `starter_pending` → logbook | Proof status / Logbook | Missions pending UI | Good Missions signal; Basecamp less central |
| Needs more proof | **Add more proof** | Add More Proof | `proof_needs_more` | Retry Mission / attention | Missions repair panel | Mostly aligned |
| Rejected retry available | **Retry mission** | Retry Mission | `starter_retry` | Retry Mission | Missions | Mostly aligned |
| Starter complete / unlock | Open newly unlocked play (one thing) | Unlock modals; Heatwave available | `starter_complete_unlock` / discovery | Find next receipt / Open Heatwave | Dex becomes special again | Unlock overload; Trevor may pick SoCal while Heatwave is active |
| Post-Starter active / drawn mission | **Continue that mission** | Missions card / Do This Mission | `active_mission` (if resumable) | **Should** be Continue; live showed **MISSION CLEARED** | Missions | **Critical conflict** from definition `status: approved` |
| Vote available | Vote | Voting hub | `voting_open` | Quick link / weak Now | Voting tab | Only meaningful after unlock + window |
| Reward / Dex unseen | Open Dex / claim attention | Dex special | discovery / zine rules | Quick links | Dex lift | Competes with mission continue |
| Nothing urgent / explore | Browse decks / Basecamp idle | Draw / explore | fallback draw / standings | Next assignment / explore | All unlocked | Lowest risk |

---

## 10. Recommendation on the Shared Guidance System

### Should Fieldtrip create one shared canonical player-guidance layer?

**YES.**

Live play proved Phase 1 verb fixes were necessary but insufficient. The remaining failures are **state conflicts**, not missing synonyms.

### What it should own

- One canonical **Now** state derived from existing truth sources.
- One primary action: label, href/intent, urgency, tone.
- Optional secondary action.
- Which surfaces must echo it: Basecamp Next Action, Missions hero/status panel, Trevor recommendation, nav badges/highlights, post-submit result CTAs, resume card on return.

### What it should NOT own

- Scoring, XP awards, review decisions.
- Deck inventory definitions.
- Copy personality dictionaries (Trevor can still voice the same action).
- Admin tooling.
- Full page layout / visual redesign of Basecamp.

### What it should derive from (not replace)

| Source | Use |
|---|---|
| `canonicalProgress` / `getStarterProgress` / `getChallengeStatus` | Approval, pending, needs-more, rejected, unlocks |
| `entries` + `normalizeEntryStatus` | Lifecycle authority |
| `drawnMissionCards` + `activeTrip` | Resume targets — but **ignore challenge-definition `status`** |
| `basecampViewModel` priority order | Attention → mission → starter → deck |
| `deckProgressService.nextAction` | Starter deck action enums |
| Trevor rule priorities | Warning/stuck auto-open policy only |

### Why not “existing systems are enough”

They already compute overlapping next actions and currently disagree on screen. Adding more per-page tips would widen the gap. One derived guidance snapshot is the smallest structural fix that matches observed failures.

---

## 11. Phase 2 Implementation Plan (do not implement in this pass)

### FIX FIRST

1. **Stop treating challenge-definition `status: "approved"` as player mission cleared** in Basecamp / resume logic. Use entry + drawn-card lifecycle only.
2. **Add Voting + Loteria to Starter-allowed routes or show an explicit lock panel** instead of silent `/missions` redirect.
3. **Introduce shared Now guidance snapshot** (derive-only) and wire Basecamp Next Action + Missions status + Trevor primary action + nav highlight to it.
4. **Pending Starter Basecamp CTA** should prefer **Draw next mission** when another Starter slot is available; Logbook as secondary.

### FIX NEXT

5. Demote Basecamp Loteria/Settings/Quick Links so Next Action is visually dominant.
6. Trevor auto-expand only on warning/stuck/new unlock; shorten to one sentence that restates the Now action.
7. Nav badge system: Missions for active/repair; Voting when ballot ready; Dex for unseen unlocks — stop using Dex lift as the only attention cue after Starter.
8. Put field-note progress on the Submit button (`Submit Proof (4/10)`).
9. Welcome CTA → Get Started / invite expectation line; soften remaining signup jargon.
10. Resume card on app open when active/repair/pending-action exists.

### POLISH LATER

11. Harmonize Logbook / Missions / Basecamp status labels.
12. Post-Starter unlock sequencing (“do this one new thing”).
13. Profile/Logbook findability without overcrowding bottom nav.
14. Save-for-later explicit “saved on Missions / Deck Shelf” toast.
15. How-it-works / Field Kit microcopy cleanup.

### DO NOT CHANGE

- Production authentication strength / invite requirement.
- Canonical progress authority (`entries` + `canonicalProgress`).
- Starter gate rule (3 approved unlocks).
- Personality / camp voice (keep; stop making it carry teaching alone).
- This audit’s emulator path as a production feature (keep production-impossible).
- Full Basecamp visual redesign before Now state is correct.
- Building parallel tip systems per page.

---

## Evidence Index

| Artifact | State |
|---|---|
| `01_welcome.webp` … `09_field_kit.webp` | Onboarding |
| `10_missions_landing.webp` | First Missions landing / Draw a Mission |
| `11_draw_a_mission.webp` | Draw CTA |
| `12_basecamp_pending.webp` | Basecamp pending Starter |
| `13_post_submit_3_of_3.webp` | 3/3 pending + View Proof Status |
| `14_basecamp_3_pending.webp` | Basecamp with 3 pending |
| `15_dex_locked.webp` / `16_bigboard_locked.webp` | Locked features |
| `17_logbook_pending.webp` | Logbook pending |
| `onboarding_invite_signup_to_missions.mp4` | Invite → signup → Missions |
| `mission_loop_submit_attempts.mp4` | Submit loop attempts |
| `phase2_20_basecamp_mission_cleared.webp` | False MISSION CLEARED |
| `phase2_21_missions_heatwave_draw.webp` | Post-Starter Missions |
| `phase2_22_dex_unlocked.webp` | Unlocked Dex |
| `phase2_23_voting_unlocked.webp` | Voting hub |
| `phase2_24_bigboard_unlocked.webp` | Big Board |
| `phase2_25_loteria.webp` / `phase2_26_loteria_back_basecamp.webp` | Loteria + Back |
| `phase2_27_trevor_expanded.webp` | Trevor conflict / unlock copy |
| `phase2_28_logbook_approved.webp` | Approved proofs |
| `phase2_29_missions_no_resume.webp` | No resume after false clear |

Runbook: `docs/LOCAL_AUTHENTICATED_TESTING.md`
