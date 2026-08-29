# Fieldtrip Zero-Instruction UX — Phase 4 Report

**Date:** 2026-08-29  
**Branch:** `cursor/phase4-visual-hierarchy-aa53`  
**PR:** https://github.com/hammer808-cyber/field-trip/pull/47  
**Constraint:** No gameplay-state architecture redesign. Phase 3 `resolvePlayerGuidance` remains the hierarchy source.

Plan: `docs/ZERO_INSTRUCTION_PHASE4_HIERARCHY_PLAN.md`

---

## Before / After hierarchy

| Screen | Dominant before | Dominant now |
| --- | --- | --- |
| Welcome | Equal Get Started / Log In + collage | **Get Started** (filled primary); Log In secondary |
| Invite | Clearance sticker + field | Invite field + Continue; sticker remains flavor |
| Sign Up | `READY_FOR_LAUNCH` / `PROFILE_SETUP // AUTH_SECURE` | Create account + human form labels |
| Legal | Disabled Agree looked broken | Checkbox + **I agree — continue**; “Check the box…” |
| Persona quiz | “Explorer Type Signal” jargon | Question + answers; eyebrow **3 quick picks** |
| Persona result | PROT / IDENTITY_TAGS vs sticky CTA | **Your Explorer Type** + **Start my first mission** |
| Field Kit | Priority_Handshake / READY_FOR_DEPLOYMENT | **Turn on camera + location**; Allow / Not now |
| Basecamp | Loteria/Settings + Progress/Crew equal to Today | **Today at Basecamp** bulletin + guidance CTA; Progress glossy; Crew quiet when empty; Loteria/Settings in **More places** |
| Missions resume | Now strip + deck hero + **DRAW A MISSION** status badge compete | Dominant Now strip + Resume; ActiveDeck demoted; assignment status **In progress**; diagnostics in sidebar at low opacity |
| Missions draw | Strip as loud as draw stack | Quiet one-line strip; draw control dominant |
| Missions repair | Add More Proof vs draw stack | Dominant strip + Add More Proof / Retry |
| Capture | Submit Proof; note count nearby | **Submit Proof (n/10)** / **Sending…** |
| Post-submit | Print-looking chrome + TX refs | Waiting for approval; Print demoted |
| Logbook empty | Archive poetry | Why empty + Draw a mission |
| Dex / Voting / Big Board locked | Unlock rule manuals | Locked for now + 0/3 + **Go do a mission** |
| Bottom nav | Dex permanently raised when unlocked; 2px attention dot | CURRENT (**Here**) / ATTENTION (**Now**) / LOCKED / NORMAL; Dex special only when current or attention |
| Trevor | Same chip + long witty copy | Smaller normal; stronger warning; brief unlock celebration; first sentence emphasized |

### Screenshots (after)

Matched before shots were not available on this branch (Phase 4 started from Phase 3 merge). After shots from authenticated emulator live testing:

- `after_welcome.webp`
- `after_invite.webp`
- `after_signup.webp`
- `after_legal_disabled.webp` / `after_legal_enabled.webp`
- `after_quiz.webp`
- `after_explorer_result.webp`
- `after_field_kit.webp`
- `after_basecamp_today.webp` / `after_basecamp_progress.webp` / `after_basecamp_more_places.webp`
- `after_missions.webp`
- `after_do_this_mission.webp`
- `after_voting_locked.webp` / `after_dex_locked.webp` / `after_bigboard_locked.webp`
- `after_trevor_collapsed.webp` / `after_trevor_expanded.webp`

---

## Cognitive-load changes

### Promoted
- Guidance Next Action on Basecamp Today (bulletin + **Do this** stamp + large Resume CTA)
- Missions Now strip for resume / repair / retry / waiting / starter-complete
- Draw stack for idle / draw states
- Nav **Now** attention destination (single)
- Trevor warning / unlock presence
- Human primary CTAs across onboarding and locks
- Submit button field-note counter

### Demoted
- Basecamp Loteria / Settings → More places
- Empty Crew (`basecamp-crew--quiet`)
- Empty Attention copy
- Missions deck browsing when strip is dominant (`opacity-55`, cover-draw disabled)
- Season timing bar
- Deck diagnostics → sidebar, `opacity-50`
- False **DRAW A MISSION** badge on active assignment → **In progress**
- Print card / bureau TX chrome on result
- Dex permanent lift when merely unlocked

### Shortened
- Trevor dialogue first-sentence focus; trimmed long lines in `trevorDialogue.ts`
- Sign Up / Sign In default copy
- Field Kit / Legal / Quiz / Result jargon
- Locked-feature body copy to one reason + one CTA
- Crew empty supporting text (kept Starter Signals unlock mention for route tests)

### Grouped
- Today = bulletin board identity
- Progress + Crew = glossy promotional reminder cards
- More places = optional systems

### Hidden until relevant
- Diagnostics no longer above the fold
- Flavor mono lines hidden on quiet Missions strip
- Trevor stays collapsed for ordinary Draw / Resume unless auto-open policy fires (repair / retry / starter unlock)

---

## Personality preservation

Intentionally kept:

- Camp / field-trip bulletin board (tape, stamps, posted notice board)
- Acid lime / magenta / orange palette and chunky borders
- Stickers, stamps, **Do this** urgent mark
- Glossy TV-commercial Progress card
- Expressive display italics and mono tracking
- Scrapbook / paper texture surfaces
- Strange Fieldtrip terms when paired with human primary copy (`FIELD SIGNAL ACTIVE`, deck short names)
- Trevor companion chip + field-guide voice
- Skin-aware bottom nav (default / Baja / Diamond / Heat)
- Mission card tactile chrome and SIGNAL_LOCKED sticker

---

## Four user simulations

Authenticated emulator: invite `LOCAL-DEV-PLAYER`, player `phase4-player@emulator.test`.

### USER A — Impulsive tapper
- Welcome: taps **Get Started** (correct).
- Basecamp: loud Resume / Today CTA wins over Progress/Crew.
- Missions resume: Now strip Resume wins; residual risk was the old **DRAW A MISSION** status badge (fixed to **In progress**).
- Locked Voting: **Go do a mission** is the loudest control (correct redirect).
- **Still struggles:** may tap Progress “Open profile progress” if scrolling past Today; acceptable secondary.

### USER B — Doesn't read
- Relies on button labels: Get Started, Resume…, Do This Mission, Go do a mission, I agree — continue, Start my first mission.
- Nav **Now** pill on Missions and **Locked** on Dex/Voting/Big Board readable without body copy.
- **Still struggles:** Field Kit permission rationale still benefits from one short supporting line; skim-only users may hit Not now and lose camera later.

### USER C — Forgetful returner
- Mid-mission return: Basecamp Today + Missions Now both say Resume active mission; nav attention on Missions.
- Trevor collapsed chip shows Resume label without mandatory popup.
- **Still struggles:** if they land deep in Profile/Logbook, empty-state CTA is clear but nav attention is easier to miss than Basecamp Today.

### USER D — Wrong-path explorer
- Locked Dex / Voting / Big Board: one reason + progress + single CTA back to missions.
- Empty Crew visually quieter so it does not look like the main quest.
- **Still struggles:** Loteria still reachable via More places and can feel like a side quest rabbit hole — intentionally available, not urgent.

---

## Remaining usability debt

### FIX NEXT
- Capture / post-submit motion polish under real camera (emulator uses simulate capture)
- Stronger empty Logbook / no-rewards surfaces when player has history elsewhere
- Ensure Big Board locked path stays identical to Voting/Dex gated panel on all skins
- Resume state: consider collapsing ActiveDeckPanel further on small viewports so Do This Mission never competes with deck art

### OPTIONAL POLISH
- Nav Locked label size vs Here/Now (readable but still small on dense skins)
- Quiet Missions strip could hide entirely on pure IDLE if A/B proves strip is noise
- Progress card “working toward unlock” microcopy variants per guidance state
- Short celebratory Trevor animation for unlock (currently stronger presence, not a full fanfare)

### DO NOT CHANGE
- `resolvePlayerGuidance` priority / state machine
- Canonical progress / scoring / unlock truth
- Starter unlock acknowledgement persistence model
- Core Fieldtrip aesthetic (bulletin, stickers, acid palette, skins)
- Auto-open Trevor policy for ordinary Draw / Resume

---

## Validation

```text
npm run test:guidance          # 53 pass (includes phase4VisualHierarchy)
npm run test:starter
npm run test:trevor            # 25 pass
npm run test:beta-blockers     # 28 pass
npm run test:mission-scoring
npm run test:emulator-guard
npm run lint
npx tsc --noEmit
npm run build
npm run test:firestore-rules   # 10 pass
```

Live authenticated emulator testing covered Welcome → Invite → Sign Up → Legal → Quiz → Result → Field Kit → Basecamp (Today/Progress/More places) → Missions resume → Do This Mission → locked Voting/Dex/Big Board → Trevor collapsed/expanded.

Guidance architecture untouched: presentation consumes `usePlayerGuidance()` / strip roles only.
