# Phase 4 Visual Hierarchy Plan

Constraint: do not change `resolvePlayerGuidance` or gameplay truth. This pass is visual dominance, copy density, and low-confidence affordances.

3-second test on every important screen: Where am I? What matters? What should I press?

## Screen plans

### Welcome
- CURRENT DOMINANT: collage + giant FIELDTRIP wordmark; two equal CTAs.
- SHOULD BE DOMINANT: **Get Started** (invite path).
- DEMOTE: Log In to secondary; How it works stays skippable; flavor footer.
- WHY: impulsive tappers should enter, not hunt.

### Invite / Access Code
- CURRENT: human title already; BETA CLEARANCE sticker is loud.
- SHOULD BE: invite field + Continue.
- DEMOTE: clearance sticker to flavor.
- WHY: empty submit must still explain itself (already does).

### Sign Up
- CURRENT: jargon default (`PROFILE_SETUP // AUTH_SECURE`, `READY_FOR_LAUNCH`, `SYSTEM_MESSAGE`, `CRITICAL`).
- SHOULD BE: Create account + form + Create account button.
- DEMOTE: bureau flavor to frankieMode only.
- WHY: Phase 2 leftover; users bounce on fake-gov copy.

### Legal
- CURRENT: checklist + Agree & Continue; disabled looks broken.
- SHOULD BE: checkbox + **I agree — continue**.
- DEMOTE: policy grid; AUTHORIZING jargon.
- WHY: one reason the button is dead: check the box.

### Explorer quiz
- CURRENT: “Explorer Type Signal” unexplained.
- SHOULD BE: question + answers; eyebrow **3 quick picks**.
- DEMOTE: invented signal language.

### Explorer result
- CURRENT: `PROT_CLASSIFICATION.HV`, identity tags, giant persona card vs sticky CTA.
- SHOULD BE: Your Explorer Type + **Start my first mission**.
- DEMOTE: PROT_DRIVE / BUREAU_STAMP / IDENTITY_TAGS to flavor.

### Field Kit
- CURRENT: Priority_Handshake / Handshake Complete / READY_FOR_DEPLOYMENT.
- SHOULD BE: Turn on camera + location; Allow; Not now.
- DEMOTE: boot jargon to supporting.

### Basecamp
- CURRENT: Loteria/Settings above the fold; Today, Progress, Crew, Quick Links equally loud; empty Crew campaign art competes.
- SHOULD BE: **Today at Basecamp** (bulletin) + posted Next Action CTA from guidance snapshot.
- DEMOTE: Loteria/Settings into More places; empty Crew; empty Attention; Quick Links; XP hero vs Next Action.
- WHY: Basecamp answers “what matters today?”

### Missions — DRAW_STARTER / DRAW_NEXT / DRAW_MISSION
- CURRENT: Now strip, deck hero, draw button, season bar, sidebar all loud.
- SHOULD BE: Draw control / deck stack.
- DEMOTE: Now strip to one-line support; season timing; diagnostics; logbook sidebar.

### Missions — RESUME_ACTIVE
- CURRENT: strip + deck browsing + sidebar compete.
- SHOULD BE: Resume / Do This Mission.
- DEMOTE: deck chooser, cover draw, shelf.

### Missions — REPAIR / RETRY
- CURRENT: Add More Proof vs draw stack.
- SHOULD BE: Add More Proof / Retry.
- DEMOTE: drawing.

### Missions — WAITING_FOR_STARTER_REVIEW
- SHOULD BE: View Proof Status.
- DEMOTE: draw.

### Capture
- CURRENT: Submit Proof; note counter nearby not on button.
- SHOULD BE: Open Camera / Submit Proof (n/10) / Sending…
- DEMOTE: TRANSMISSION READY flavor.

### Post-submit
- CURRENT: Proof sent + next CTA (good); TRANSMISSION COMPLETE + print look broken.
- SHOULD BE: Proof sent ✓ + primary next.
- DEMOTE: print; bureau TX ref.

### Logbook empty
- SHOULD BE: why empty + Draw a mission.
- DEMOTE: empty archive poetry.

### Dex / Voting / Big Board / Loteria locked
- SHOULD BE: Locked for now + 3/3 progress + one CTA to Missions.
- DEMOTE: rule manuals.

### Bottom nav
- CURRENT: Dex raised when unlocked; attention is a 2px dot; locked looks broken; labels 7–10px.
- SHOULD BE four distinct states: CURRENT / NEXT / LOCKED / NORMAL.
- DEMOTE: Dex lift unless current or the single attention target.

### Trevor
- CURRENT: same chip for all states; long witty copy.
- SHOULD BE: small normal; stronger warning; brief celebration for unlock.
- DEMOTE: extra clauses; auto-expand stays repair/retry/unlock only.
