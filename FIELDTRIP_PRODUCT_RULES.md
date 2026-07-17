# Fieldtrip Product Rules

**Status:** Canonical
**Applies to:** Product decisions, UX copy, routes, feature design, QA, and implementation
**Product:** Fieldtrip
**Tagline:** **Get outside. Cause a scene. Get Receipts.**

This file defines what Fieldtrip is, what it is not, and which product rules must remain consistent across the app. When a feature request conflicts with this file, update the rule intentionally before changing the product.

---

## 1. Product Definition

Fieldtrip is a seasonal, mobile-first social exploration game for adults. Players complete real-world photo missions, submit proof, earn Field XP after review, collect discoveries, participate in weekly community systems, and turn their season into a personal or crew zine.

Fieldtrip should feel like:

- a chaotic summer field guide;
- a collectible social game;
- a fashion-forward scavenger hunt;
- a camera-first mobile experience;
- a playful system with trustworthy rules.

Fieldtrip should **not** feel like:

- a school learning-management system;
- a corporate productivity dashboard;
- a generic rewards app;
- a casino or pay-to-win system;
- a maze of duplicate menus, question-mark buttons, or unexplained currencies.

---

## 2. Canonical Product Language

Use these labels exactly unless this file is intentionally revised.

| Concept | Canonical label | Do not substitute |
|---|---|---|
| Home | **Basecamp** | Dashboard, Home Hub |
| Mission library and draw flow | **Missions** | Challenges, Tasks |
| Collection | **Dex** | Inventory, Collection Center |
| Community voting | **Voting** | Polls |
| Rankings and progress | **Big Board** | Leaderboard, Scoreboard |
| Player score | **Field XP** | Coins, Credits, Generic Points |
| Submitted mission evidence | **Proof** | Upload, Assignment |
| Personal archive | **Zine** | Scrapbook |
| Multiplayer group | **Crew** | Team, Guild |
| Player archetype | **Explorer Type** | Persona, Class in user-facing copy |
| AI/helper character | **Trevor** | Assistant, Bot |
| Required opening set | **Starter Signals** | Tutorial Deck |
| Mission approval state | **Approved** | Passed |
| Mission correction state | **Needs More Proof** | Failed, Rejected |

Internal code may use stable technical names, but user-facing text must use the canonical labels.

---

## 3. Canonical Navigation

The primary navigation is:

1. **Basecamp** — `/basecamp`
2. **Missions** — `/deck`
3. **Dex** — `/collection`
4. **Voting** — `/voting`
5. **Big Board** — `/big-board`

Rules:

- These five destinations are the only primary navigation items.
- Navigation labels, icons, route names, and order must remain consistent across desktop and mobile.
- Crew and Zine are features reached contextually from Basecamp, Dex, or their dedicated secondary routes. They do not silently replace primary navigation.
- Never render two bottom navigation bars.
- Never create a button that visually appears interactive but has no route, action, disabled explanation, or feedback.
- Locked destinations remain visible when useful, but must explain the unlock requirement.
- Every completion, error, empty, locked, and review state must provide a valid next action.

---

## 4. Audience and Access

- Fieldtrip is for adults aged 18 and older.
- Legal confirmation is required once per account.
- Onboarding may occur before a season begins.
- Time-locked seasonal gameplay must clearly show the season start date and what remains available before launch.
- A player must never be trapped between onboarding, classification, and Basecamp because of conflicting guards.

### Verified onboarding state

The canonical onboarding implementation includes these persisted fields:

- `hasConfirmedLegal`
- `fieldClassificationComplete`
- `hasSeenFieldTypeResults`
- `onboardingStarted`
- `onboardingCurrentStep`
- `onboardingCompleted`

Verified implementation touchpoints include:

- `PersonaQuiz.tsx`
- `AppContext.tsx`
- `userService.ts`
- `fieldTypeLogic.ts`
- `App.tsx`

The `/classification` route must remain a deliberate exception in the relevant routing guard so the player can complete classification instead of being redirected in a loop.

---

## 5. Explorer Types

The six canonical Explorer Types are:

1. **Mall Rat**
2. **Mascota**
3. **Bigfoot**
4. **Captain Clipboard**
5. **Elondra**
6. **The Gobbler**

Rules:

- Do not reintroduce retired archetypes without a product decision.
- Each Explorer Type needs a consistent name, icon, full-body art, result art, card treatment, and five core reaction poses:
  - Default / idle
  - Excited / approved
  - Thinking / mission briefing
  - Waiting / pending
  - Concerned / needs more proof
- Explorer Type copy should describe behavior and play style, not assign value or rank.
- The quiz result changes presentation, Trevor guidance, and optional flavor. It must not create unfair scoring advantages.

---

## 6. Core Player Journey

The canonical gameplay journey is:

**Deck → Draw → Mission Briefing → Start → Viewfinder → Submit Proof → Pending Review → Result → Next Action**

The result branches are:

- **Approved** → award final Field XP, unlock eligible discoveries, update progress, show next mission action.
- **Needs More Proof** → preserve the mission, explain what is missing, link directly to that mission’s proof repair flow.
- **Rejected** → award no Field XP, explain why, and return the card according to deck rules.

The player must never be sent to a generic logbook when the intended action is to repair a specific mission.

---

## 7. Starter Signals and Unlocking

Starter Signals are the required opening sequence.

Canonical Starter Signals:

1. `starter-1` — Fishbowl / Tiki launch-day mission
2. `starter-2` — Mood Object
3. `starter-3` — Aisle Oracle

Rules:

- The required count is **3 approved Starter Signals**.
- Submitted or pending missions do not count as completed.
- Rejected or Needs More Proof missions do not permanently disappear from the available pool.
- Seasonal decks, Crew, and related social systems unlock only after the configured Starter requirement is satisfied.
- The interface must distinguish clearly among drawn, started, submitted, pending, approved, and repair-needed states.
- A player must not be blocked from drawing because the UI says `2/3` while the backend believes a different count. One canonical resolver must determine progress.

---

## 8. Proof and Review

A standard mission submission requires:

- at least one photo;
- a field note;
- optional location proof when requested or available;
- mission and player identifiers;
- capture and submission timestamps;
- review status.

Canonical review statuses:

- `pending_review`
- `approved`
- `needs_more_proof`
- `rejected`

Rules:

- Review status is authoritative.
- UI aliases must not create additional status values.
- Admin notes use one canonical field.
- Resubmission clears stale submitted-proof arrays only when required by the repair workflow.
- Approval and scoring must be idempotent. Repeating an approval action cannot award Field XP twice.
- Community feed visibility must use explicit privacy and approval rules, not accidental query behavior.

---

## 9. Trevor

Trevor is a contextual guide, not a decorative help button farm.

Trevor must:

- provide a small number of relevant actions;
- use player state, Starter progress, active mission, review status, season state, and ranking context;
- point directly to the action it recommends;
- become more useful after Starter Signals;
- avoid repeating generic prompts such as “Draw a deck” or “Check standings” when a more urgent action exists.

Trevor priority order:

1. Repair a mission marked Needs More Proof.
2. Complete an active mission.
3. Review a newly approved result or unlocked reward.
4. Draw an eligible mission.
5. Participate in an available weekly vote or Crew action.
6. Review Big Board progress.

There must be one canonical Trevor entry point per screen. Duplicate nonfunctional question-mark buttons are defects.

---

## 10. Zine, Dex, Stickers, and Tokens

### Dex

The Dex is the player’s collection and discovery record. It must explain:

- what has been collected;
- how it was earned;
- whether it is usable, decorative, or archival;
- what remains undiscovered without spoiling every trigger.

### Stickers

- Stickers are earned by explicit gameplay triggers.
- Opening the Dex cannot mass-award stickers.
- Sticker awards must be idempotent.
- Composite achievements may group related actions when the rule is understandable.
- Every sticker asset must be individually crop-safe and available as a transparent image.

### Tokens and currencies

Do not introduce a visible currency without defining:

- how it is earned;
- where it is spent;
- whether it expires;
- whether it affects competitive fairness.

Unused or unexplained currencies should be removed from the interface, not preserved because someone once drew a shiny icon.

### Zine

- Every player has a personal season archive.
- Approved proof can populate the personal zine according to privacy settings.
- Crew zine rules depend on the season mode:
  - competitive mode: the winning Crew or designated winner curates;
  - friendly mode: the Crew curates collaboratively.
- Zine cover options should reflect the active app skin while preserving the same content structure.

---

## 11. Voting, Tribunal, and Community Trust

Voting includes:

- Weekly Votes
- Tribunal
- Results

Rules:

- Ballots remain private until the voting period locks.
- Vote identifiers are deterministic where required to prevent duplicate voting.
- Payouts and result finalization are idempotent.
- A player may submit only the allowed number of reports under the configured limits.
- Reporter identity is private from the public case record.
- “Sus” and “Valid” decisions must have plain-language explanations.
- Locked voting screens must state the unlock condition and date or progress requirement.

---

## 12. Big Board

The Big Board communicates progress, not merely rank.

Canonical modules:

- Total Field XP + Credential
- Phase Progress
- Weekly Rank
- Season Progress
- Active Session

Canonical mobile order:

1. Phase Progress
2. Season Progress
3. Weekly Rank
4. Active Session
5. Total Field XP
6. Credential

Rules:

- Rank and progress values must identify their time window.
- Empty rankings must explain whether no one has scored, the player is unranked, or data failed to load.
- Never present provisional Field XP as final rank.

---

## 13. Feature States

Every feature must define these states before implementation:

- loading;
- empty;
- ready;
- active/in progress;
- submitted;
- pending;
- approved/success;
- needs action;
- locked;
- unavailable;
- error;
- offline or retry, when relevant.

Each state must include:

- a clear title;
- a plain-language explanation;
- one primary action or an explicit reason no action is available;
- no contradictory controls.

---

## 14. Product Decision Hierarchy

When sources disagree, use this priority:

1. Current canonical files in the repository.
2. Explicit current product decision recorded in a PR or issue.
3. Current backend schema and production behavior.
4. Current UI implementation.
5. Old mockups, screenshots, branch notes, and chat transcripts.

Do not infer missing design details from absent reference folders. Record the blocker and use the canonical design system instead.

---

## 15. Definition of Done

A product change is not done until:

- labels match canonical language;
- routes work from all rendered controls;
- loading, empty, error, locked, and success states exist;
- mobile layout is usable;
- accessibility checks pass;
- analytics or logs exist for critical transitions;
- Firestore/security implications are reviewed;
- scoring and awards are idempotent;
- tests cover the changed state transitions;
- canonical files are updated when the product rule changed.
