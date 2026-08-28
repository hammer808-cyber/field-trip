# Fieldtrip Zero-Instruction Usability Audit

**Date:** 2026-08-28  
**Scope:** Can a brand-new, low-confidence user who refuses to read instructions figure out Fieldtrip by looking, tapping, and following the interface?  
**Method:** Live walkthrough of Welcome → Access Code → Login on `localhost:3000`, plus source inspection of every major authenticated flow (Basecamp, Missions, Capture, Dex, Voting, Big Board, Crew, Loteria, Profile, Trevor).  
**Constraint:** No redesign or code changes in this pass. Authenticated gameplay could not be completed in this environment without a valid beta access code; post-login findings are grounded in current UI implementation and routing logic.

**Evidence captured live:**

- Welcome: `/opt/cursor/artifacts/welcome_screen.webp`
- How it works: `/opt/cursor/artifacts/how_it_works_modal.webp`
- Access code gate: `/opt/cursor/artifacts/access_code_gate.webp`
- Access code error: `/opt/cursor/artifacts/access_code_error.webp`
- Login: `/opt/cursor/artifacts/login_screen.webp`
- Login empty validation: `/opt/cursor/artifacts/login_empty_validation.webp`

---

## 1. Executive Diagnosis

**Plain English:** A clueless first-time user cannot currently understand Fieldtrip end to end without help.

They can tell it is a fun outdoor photo game from Welcome. After that, the app repeatedly asks them to understand an invented bureau dialect, five equally loud destinations, and a mission loop that says **Start Mission** before a mission has even been drawn. Basecamp already contains a useful “what to do next” system — but first-time users are steered to Missions, and Trevor only helps if they notice and open a collapsed chip.

The personality is strong and worth keeping. The problem is not campiness. The problem is that campiness currently carries the load of teaching, and low-confidence users do not read it.

### Scores

| Dimension | Score | Why |
|---|---:|---|
| **First-use clarity** | **4 / 10** | Welcome is clear. Access Code immediately walls them with jargon (`AUTH_CLEARANCE`, `ACCESS_CODE`). Explorer Type, Field Kit, and Missions stack new invented terms before the core loop is proven. |
| **Navigation clarity** | **4 / 10** | Five bottom tabs, with **Dex** visually dominant. Locked tabs remain tappable. Profile/Crew are not primary nav. Labels are 7–10px. |
| **“What do I press?” clarity** | **3 / 10** | Worst offender: Missions draw button uses `START_MISSION` before the card is drawn. Many screens have two equally large primary buttons. |
| **Feedback after actions** | **5 / 10** | Photo develop + transmit + pending stamp are good. Empty access-code submit is silent. Disabled print CTA has no explanation. Reward feedback is suppressed during guided first mission. |
| **Recovery from mistakes** | **5 / 10** | Back exists often. Save for Later / Draw Another can feel like losing the card. Capture redirects and timeout screens use opaque errors. |
| **Returning-user clarity** | **5 / 10** | Basecamp next-action logic is solid. Returning completed users can land on Basecamp. Pending/resume still requires noticing Logbook, Attention, or Trevor. |
| **Cognitive accessibility** | **3 / 10** | Tiny mono labels, dense bureau copy, many simultaneous choices, recognition fails when everything looks equally important. |
| **Overall self-guidance** | **4 / 10** | Individual pieces (Receipt Checklist, Basecamp next action, StarterGate CTA) are good. They do not form one coherent guidance system. |

---

## 2. Confusion Map

### SCREEN: Welcome (`/`) — `src/pages/Welcome.tsx`

**WHAT THE USER THINKS THIS SCREEN IS:** A fun outdoor photo game splash.  
**WHAT FIELDTRIP EXPECTS THEM TO DO:** Tap **Start First Mission** to begin signup, or **Log In**.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap the black **Start First Mission** button.  
**WHERE CONFUSION OCCURS:** CTA promises a mission, but opens Access Code. “Receipts” is unexplained. How it works is tiny and optional.  
**SEVERITY:** High

### SCREEN: How It Works modal — `Welcome.tsx`

**WHAT THE USER THINKS:** Optional tutorial.  
**WHAT FIELDTRIP EXPECTS:** Read 5 steps, then play.  
**WHAT THE USER IS MOST LIKELY TO DO:** Skip, or skim titles only.  
**WHERE CONFUSION OCCURS:** Step 02 copy says “Browse your desk” (typo for deck). Mentions Crew/season winner before those concepts exist. Users who skip never get the loop.  
**SEVERITY:** Medium

### SCREEN: Access Code — `src/pages/Auth/AccessCodeGate.tsx`

**WHAT THE USER THINKS:** A security/login wall, maybe government software.  
**WHAT FIELDTRIP EXPECTS:** Enter invite code, then signup.  
**WHAT THE USER IS MOST LIKELY TO DO:** Stare, tap disabled/empty submit, invent a code, or leave.  
**WHERE CONFUSION OCCURS:** Default copy is jargon: `ACCESS_CODE`, `AUTH_CLEARANCE`, `RETURN_TO_ENTRY_POINT`, `VIBE CHECK`. Empty submit is silent. Wrong/unavailable code shows `CONNECTIVITY_ERROR. THE_BUREAU_IS_UNREACHABLE.` No path to request a code. No visible Sign Up until after code succeeds.  
**SEVERITY:** Critical

### SCREEN: Sign Up — `src/pages/Auth/SignUp.tsx`

**WHAT THE USER THINKS:** Create account.  
**WHAT FIELDTRIP EXPECTS:** Email, username, strong password, confirm.  
**WHAT THE USER IS MOST LIKELY TO DO:** Struggle with password rules / username format.  
**WHERE CONFUSION OCCURS:** Password requirements are many. Errors can surface Firebase/admin jargon (`SECURITY_DENIAL`, “ask an admin”).  
**SEVERITY:** Medium

### SCREEN: Sign In — `src/pages/Auth/SignIn.tsx`

**WHAT THE USER THINKS:** Returning users log in here.  
**WHAT FIELDTRIP EXPECTS:** Email + password.  
**WHAT THE USER IS MOST LIKELY TO DO:** Try login, or hunt for Sign Up (not here).  
**WHERE CONFUSION OCCURS:** Subtitle `ACCOUNT_RECOVERY // SECURE` sounds like password recovery, not login. No create-account link. Empty submit validation is good.  
**SEVERITY:** Medium

### SCREEN: Legal / Beta Access Gate — `src/components/BetaAccessGate.tsx`

**WHAT THE USER THINKS:** Terms they must click through.  
**WHAT FIELDTRIP EXPECTS:** Confirm age/safety/legal, then continue.  
**WHAT THE USER IS MOST LIKELY TO DO:** Check the box and continue, or stall on long legal text.  
**WHERE CONFUSION OCCURS:** Welcome step inside the gate is clearer (“Find your Explorer Type”). Legal step is a wall. Accept disabled until checkbox — reason is present but dense.  
**SEVERITY:** Medium

### SCREEN: Classification / Persona Quiz — `src/components/onboarding/PersonaQuiz.tsx`

**WHAT THE USER THINKS:** A personality quiz.  
**WHAT FIELDTRIP EXPECTS:** Answer 3 vibe questions to get Explorer Type.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap answers quickly; may not know why this matters.  
**WHERE CONFUSION OCCURS:** “Explorer Type Signal” is unexplained. Answers are fun but long. Progress indicator is good.  
**SEVERITY:** Medium

### SCREEN: Field Type Result — `src/pages/FieldTypeResult.tsx`

**WHAT THE USER THINKS:** Character reveal / costume assignment.  
**WHAT FIELDTRIP EXPECTS:** Celebrate type, then start first mission.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap the sticky **Start First Mission** CTA.  
**WHERE CONFUSION OCCURS:** Headers like `PROT_CLASSIFICATION.HV`, `IDENTITY_TAGS.HV`, `ASSIGNED_UNIT`. Persona card is visually dominant over next action on desktop.  
**SEVERITY:** High

### SCREEN: Field Kit Onboarding — `src/components/FieldKitOnboarding.tsx`

**WHAT THE USER THINKS:** Permissions popup with sci-fi flavor.  
**WHAT FIELDTRIP EXPECTS:** Allow camera + location, or skip.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap Allow, or Maybe Later without understanding consequences.  
**WHERE CONFUSION OCCURS:** `Priority_Handshake`, `Handshake Complete`, `READY_FOR_DEPLOYMENT`. Camera reason is clear; location reason (“unlock nearby rewards”) is vague.  
**SEVERITY:** Medium

### SCREEN: Basecamp — `src/pages/Basecamp.tsx` + `src/logic/basecampViewModel.ts`

**WHAT THE USER THINKS:** Home / dashboard.  
**WHAT FIELDTRIP EXPECTS:** Follow the Next Action panel.  
**WHAT THE USER IS MOST LIKELY TO DO:** Scan the whole board, tap Loteria/Settings, or tap a Quick Link at random.  
**WHERE CONFUSION OCCURS:** “Basecamp” is unexplained. Hero shows XP/level before teaching missions. Loteria + Settings sit above the fold with equal visual weight. Four Quick Links look equally important. New users often never land here until Starter is done.  
**SEVERITY:** High

### SCREEN: Missions / Deck — `src/pages/Deck.tsx`

**WHAT THE USER THINKS:** The main game screen.  
**WHAT FIELDTRIP EXPECTS:** Draw a card, then start the mission.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap the big black button labeled **Start Mission** — which actually draws a card.  
**WHERE CONFUSION OCCURS:** Draw CTA uses `getDisplayLabel('START_MISSION')` (“Start Mission”) before draw. After draw, another **Start Mission** appears. Sidebar Deck Shelf / Logbook compete. Hero subtitle “Sector 7-B // Field Headquarters” teaches nothing. Disabled draw during pending review uses gray button + tiny `CALIBRATION_PENDING`.  
**SEVERITY:** Critical

### SCREEN: Guided Starter Draw (forced launch) — `Deck.tsx` `mustCompleteStarterMission`

**WHAT THE USER THINKS:** One clear mission screen.  
**WHAT FIELDTRIP EXPECTS:** Tap the card / Tap the Card, then Start Mission.  
**WHAT THE USER IS MOST LIKELY TO DO:** Follow the orange CTA.  
**WHERE CONFUSION OCCURS:** Much clearer than normal Missions. Still uses “Frequency Locked” and mission IDs.  
**SEVERITY:** Low (this is one of the better flows)

### SCREEN: Mission Briefing — `src/pages/MissionBriefing.tsx`

**WHAT THE USER THINKS:** Mission details.  
**WHAT FIELDTRIP EXPECTS:** Start Mission Now.  
**WHAT THE USER IS MOST LIKELY TO DO:** Hesitate between **Start Mission Now** and **Save for Later** (same size). Or tap Dismiss Data.  
**WHERE CONFUSION OCCURS:** Title “Briefing Data” is cold. Two equal CTAs. Save for Later returns to Missions with little confirmation of where the card went. Back uses `navigate(-1)`.  
**SEVERITY:** High

### SCREEN: Capture / Field Clipboard — `src/pages/Capture.tsx`, `src/components/FieldClipboard.tsx`

**WHAT THE USER THINKS:** Camera / proof screen.  
**WHAT FIELDTRIP EXPECTS:** Brief → photo → note → submit.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap **START MISSION** again (third time the phrase appears), then photo, then stall on field note.  
**WHERE CONFUSION OCCURS:** Receipt Checklist is good if read. Submit disabled until note ≥ 10 chars; helper is tiny (“field note is too short”). `OPEN BRIEF` / `MISSION_SIGNAL` jargon. Needs-more-proof uses “The Bureau…”. Timeout: `Handshake_Timeout`.  
**SEVERITY:** High

### SCREEN: Mission Result — `src/components/MissionResultCard.tsx`

**WHAT THE USER THINKS:** Success / score screen.  
**WHAT FIELDTRIP EXPECTS:** Understand pending review, return to Missions.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap **RETURN TO MISSIONS**, or **OPEN COLLECTION BOOK** (may hit Dex lock).  
**WHERE CONFUSION OCCURS:** “Pending Review” vs celebration visuals conflict. Disabled **PRINT_PHYSICAL_CARD** looks broken. No explicit “go grab another starter” or “2 of 3 done.” Collection link can dump into StarterGate.  
**SEVERITY:** High

### SCREEN: Mission Submitted (orphan) — `src/pages/MissionSubmitted.tsx`

**WHAT THE USER THINKS:** N/A for most users.  
**WHAT FIELDTRIP EXPECTS:** Celebrate and continue.  
**WHAT THE USER IS MOST LIKELY TO DO:** If reached, tap **View My Memories** → gated Dex.  
**WHERE CONFUSION OCCURS:** Route exists but capture does not navigate here. Primary CTA targets locked Memories for early users.  
**SEVERITY:** Medium (latent; critical if wired later without changes)

### SCREEN: Dex / Collection — `src/pages/Collection.tsx` + `StarterGate`

**WHAT THE USER THINKS:** The special orange middle button looks like “the main thing.”  
**WHAT FIELDTRIP EXPECTS:** View stickers/zines/memories after Starter.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap Dex first from bottom nav → **ACCESS RESTRICTED**.  
**WHERE CONFUSION OCCURS:** “Dex” means nothing. Lock screen mentions “Starter Signals,” “UNIQUE APPROVED,” duplicates, pending — too much rule text. Tabs: Collection / Sticker Machine / Zines / Memories.  
**SEVERITY:** Critical (as first-tap dead end)

### SCREEN: Voting — `src/pages/VotingHubPage.tsx`

**WHAT THE USER THINKS:** Community voting / awards.  
**WHAT FIELDTRIP EXPECTS:** Vote when unlocked and window open.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap Voting from nav, then bounce off lock / empty ballot / Tribunal.  
**WHERE CONFUSION OCCURS:** Title “PEER VOTE” vs nav “VOTING”. Clock card uses submission/voting phase jargon. Tribunal locked separately. Empty ballot copy mentions admins/Firestore for some reasons. Voting is reachable before Starter; Big Board is not — inconsistent.  
**SEVERITY:** High

### SCREEN: Big Board — `src/pages/BigBoard.tsx` + `StarterGate`

**WHAT THE USER THINKS:** Leaderboard / status board.  
**WHAT FIELDTRIP EXPECTS:** Check ranks/community after unlock.  
**WHAT THE USER IS MOST LIKELY TO DO:** Tap trophy tab → lock screen, or overwhelm if unlocked.  
**WHERE CONFUSION OCCURS:** Lock icon exists on nav (good) but still opens restricted page. Unlocked board is dense (split-flap, sabotage, crew, proofs).  
**SEVERITY:** Medium

### SCREEN: Crew — `src/pages/Crew.tsx`

**WHAT THE USER THINKS:** Friends / team feature.  
**WHAT FIELDTRIP EXPECTS:** Create or join a Crew.  
**WHAT THE USER IS MOST LIKELY TO DO:** Never find it (not in bottom nav), or hit Create/Join with many settings.  
**WHERE CONFUSION OCCURS:** Hidden. Mode/privacy options early. Multi-tab once joined.  
**SEVERITY:** Medium

### SCREEN: Loteria — `src/pages/LoteriaExploreBoard.tsx`

**WHAT THE USER THINKS:** A bingo/board mini-game.  
**WHAT FIELDTRIP EXPECTS:** Pick a sheet, mark cards, open missions.  
**WHAT THE USER IS MOST LIKELY TO DO:** Enter from Basecamp button before understanding Missions. HelpCircle opens board chooser (icon mismatch). Back from home goes to Big Board (often locked).  
**WHERE CONFUSION OCCURS:** Parallel system beside Missions. Marking a card does not equal completing a mission.  
**SEVERITY:** High

### SCREEN: Profile / Logbook — `src/pages/Profile.tsx`

**WHAT THE USER THINKS:** Account settings / history.  
**WHAT FIELDTRIP EXPECTS:** Check proof status, edit identity.  
**WHAT THE USER IS MOST LIKELY TO DO:** Struggle to find it (no bottom-nav item).  
**WHERE CONFUSION OCCURS:** Logbook is both Profile tab and Missions sidebar. Pending CTA sometimes uses `tab=history` while URL canon is `tab=logbook` (works via alias, but inconsistent).  
**SEVERITY:** Medium

### SCREEN: Trevor Guide — `src/components/TrevorGuide.tsx` / `TrevorGuideView.tsx`

**WHAT THE USER THINKS:** Optional floating tip, if noticed.  
**WHAT FIELDTRIP EXPECTS:** Open chip, follow primary action.  
**WHAT THE USER IS MOST LIKELY TO DO:** Ignore it.  
**WHERE CONFUSION OCCURS:** Collapsed by default. Witty multi-clause copy. Hidden on capture/briefing routes. Not a forced coach.  
**SEVERITY:** High (as guidance gap)

---

## 3. Dead Ends

1. **Access Code wall with no request path** — Welcome promises a mission; user hits invite gate with jargon CTA and no “how do I get a code?”
2. **Silent empty Access Code submit** — button disabled/no message; user thinks tap failed.
3. **Cryptic access validation errors** — `CONNECTIVITY_ERROR. THE_BUREAU_IS_UNREACHABLE.`
4. **Dex as visual nav magnet → ACCESS RESTRICTED** — most prominent tab for locked users.
5. **Big Board / Voting / Memories before Starter** — reachable or semi-reachable; dump into lock panels.
6. **“Start Mission” that only draws a card** — user believes they started; nothing camera-related happens.
7. **Triple Start Mission** — Deck draw → Deck/Briefing start → Capture START MISSION.
8. **Save for Later with weak confirmation** — card disappears into unclear storage.
9. **Field note gate** — Submit Proof disabled; reason is 9px mono text.
10. **Disabled PRINT_PHYSICAL_CARD** — looks broken.
11. **OPEN COLLECTION BOOK / View My Memories while Dex locked**.
12. **Pending Review with no next outdoor action** — “View Proof Status” / Logbook, not “do another mission” (except Basecamp pending copy, which many never see).
13. **Loteria back → Big Board** while Big Board locked.
14. **Profile not in primary nav** — “where did my thing go?” for proofs.
15. **RewardFeedback hidden during guided first mission** (`hideHelpers` in `App.tsx`) — “Did I earn anything?”
16. **Season unavailable / deck locked screens** with bureau poetry and weak recovery.
17. **Login has no Sign Up link** — new users who choose Log In get stuck.
18. **Returning after days** without opening Basecamp Attention / Trevor — active mission can sit unnoticed on Missions depending on session reveal state (`hasRevealedInActiveSession`).

---

## 4. Top 10 Usability Problems

### 1. Draw button labeled “Start Mission”
- **Current behavior:** Ready-state draw CTA uses `getDisplayLabel('START_MISSION')` → “Start Mission”. After draw, another Start Mission appears. Capture brief says START MISSION again.
- **Why confusing:** Users who do not read think the mission started. Nothing obvious happens except a card flip.
- **Proposed change:** Label draw **Draw a Mission**. After reveal: **Do This Mission**. Capture: **Open Camera**.
- **What user should see:** One verb per step.
- **Where:** `src/pages/Deck.tsx`, `src/utils/labelUtils.ts`, `src/components/FieldClipboard.tsx`, `src/pages/MissionBriefing.tsx`
- **Effort:** Small · **Impact:** High

### 2. Dex is the visual center of navigation while locked
- **Current behavior:** Raised orange Dex button dominates bottom nav; StarterGate blocks early users.
- **Why confusing:** Confused users tap the loudest control and hit a wall.
- **Proposed change:** During Starter, visually demote/lock Dex in-nav with badge “Locked · 0/3”, or spotlight Missions instead. Keep Dex special after unlock.
- **What user should see:** Missions glowing as the only loud destination until 3 approvals.
- **Where:** `src/components/BottomNav.tsx`, `src/components/StarterGate.tsx`
- **Effort:** Medium · **Impact:** High

### 3. Access Code gate uses default jargon + silent empty state
- **Current behavior:** `fc('AUTH_CLEARANCE','ENTER')` shows jargon when frankieMode is off. Empty code silently no-ops.
- **Why confusing:** Feels like broken government software, not a photo game.
- **Proposed change:** Human labels by default: **Enter**, **Access Code**, **Back**. Empty: “Paste your invite code.” Wrong code: “That code didn’t work.” Connectivity: “Can’t reach Fieldtrip. Check connection and try again.”
- **What user should see:** Invite wall that still feels on-brand but readable.
- **Where:** `src/pages/Auth/AccessCodeGate.tsx`, `src/services/authService.ts`
- **Effort:** Small · **Impact:** High

### 4. Welcome CTA overpromises
- **Current behavior:** **Start First Mission** → Access Code.
- **Why confusing:** Trust break on first tap.
- **Proposed change:** **Get Started** or **Enter with Invite**. Keep mission promise for after classification.
- **What user should see:** Button matches next screen.
- **Where:** `src/pages/Welcome.tsx`
- **Effort:** Small · **Impact:** High

### 5. No persistent “Do this next” for users who skip reading
- **Current behavior:** Basecamp has next-action VM; first users go to Missions; Trevor is collapsed; guided helpers often skipped.
- **Why confusing:** After any interruption, user asks “where was I?”
- **Proposed change:** Persistent **Now** strip on Basecamp + Missions: state-driven one-liner + one button. Auto-expand Trevor once per new high-priority state.
- **What user should see:** Always one obvious next move.
- **Where:** `src/logic/basecampViewModel.ts`, `Deck.tsx`, `TrevorGuide.tsx`, new shared objective component
- **Effort:** Medium · **Impact:** High

### 6. Capture field-note requirement is invisible
- **Current behavior:** Submit needs ≥10 chars; disabled style + tiny helper.
- **Why confusing:** “Why can’t I press this?”
- **Proposed change:** Keep requirement, put counter on button: **Submit Proof (4/10)** → **Submit Proof**.
- **What user should see:** Button itself teaches the rule.
- **Where:** `src/components/FieldClipboard.tsx`
- **Effort:** Small · **Impact:** High

### 7. Post-submit next step is weak / sometimes gated
- **Current behavior:** MissionResultCard celebrates pending, primary return to Missions; secondary opens Collection; disabled print. Orphan MissionSubmitted pushes Memories.
- **Why confusing:** User does not know if finished, how many starter left, or where proof went.
- **Proposed change:**  
  **Proof sent ✓**  
  **Waiting for approval.**  
  **Starter progress: 1/3**  
  **Draw next mission →**
- **Where:** `MissionResultCard.tsx`, optionally retire or rewire `MissionSubmitted.tsx`
- **Effort:** Medium · **Impact:** High

### 8. Equal-weight CTAs on Briefing / after draw
- **Current behavior:** Start and Save for Later are same size; Draw Another competes.
- **Why confusing:** “Which one matters?”
- **Proposed change:** One dominant primary. Secondary as text links: “Save for later” / “Draw a different one”.
- **Where:** `MissionBriefing.tsx`, `Deck.tsx`
- **Effort:** Small · **Impact:** Medium

### 9. Locked-feature language is rule-heavy
- **Current behavior:** StarterGate explains unique approved missions, pending, duplicates.
- **Why confusing:** Users need a door, not a policy manual.
- **Proposed change:**  
  **Locked for now**  
  **Finish 3 starter missions to open this.**  
  Progress bar + **Go do a mission →**
- **Where:** `StarterGate.tsx`, VotingLockedPanel, Collection LockedStarterPanel
- **Effort:** Small · **Impact:** Medium

### 10. Returning-user resume depends on noticing the right panel
- **Current behavior:** Active mission resume can depend on session reveal flags; Basecamp is better but not always where attention goes.
- **Why confusing:** Day-later users reopen app and feel lost.
- **Proposed change:** On app open, if active/pending/repair exists, show full-width resume card before other Missions chrome.
- **Where:** `Deck.tsx`, `Basecamp.tsx`, `App.tsx` destination resolver
- **Effort:** Medium · **Impact:** High

---

## 5. “Make It Impossible to Get Lost” Recommendations

Build one **Fieldtrip Now System** — not twenty tips.

### Pieces that work together

1. **Objective State Machine** (canonical user state)  
   Examples: `NEED_INVITE`, `NEED_LEGAL`, `NEED_TYPE`, `NEED_FIELD_KIT`, `DRAW_STARTER`, `MISSION_ACTIVE`, `CAPTURE_IN_PROGRESS`, `PROOF_PENDING`, `PROOF_NEEDS_FIX`, `STARTER_COMPLETE_CHOOSE_DECK`, `DRAW_SEASON`, `VOTE_OPEN`, `REWARD_UNSEEN`, `IDLE_EXPLORE`.

2. **Now Strip** (persistent, one line + one button)  
   Sits under page heroes on Basecamp and Missions, and as a compact chip above bottom nav elsewhere.  
   Always answers: what matters right now.

3. **Basecamp as “Here’s what matters”**  
   Keep playful layout, but make Next Action visually 2× everything else. Move Loteria/Settings into secondary. Collapse Quick Links into “More places”.

4. **First-use spotlights (temporary)**  
   Only at true forks: first Missions visit (pulse Draw), first Dex unlock, first Voting open. Max one spotlight. Auto-dismiss on success.

5. **Trevor as counselor, not syllabus**  
   Auto-open once when state becomes warning/stuck. Keep hide-for-session. Shorten copy to one sentence + button label that restates the action.

6. **Attention badges on nav**  
   Missions badge for active/repair. Voting badge when ballot ready. Dex badge for unseen rewards. Stop using Dex lift as the only attention cue.

7. **Completion → Next**  
   Every terminal screen (submit, approve toast, unlock, vote cast) must include the next objective from the state machine.

8. **Resume card for returning users**  
   If last session left active mission / needs-more-proof / unseen reward, show that before browsing chrome.

These pieces share one state source (extend `canonicalProgress` + existing Basecamp/Trevor context). Do not invent separate tip systems per page.

---

## 6. Screen-by-Screen Recommendations

Exact short copy preferred.

### Welcome
- Button: **Get Started** (not Start First Mission)
- Keep tagline.
- Under buttons: **Invite code needed for beta.**
- How it works step 02: **Get a photo mission** / “Draw a mission card and see what to photograph.”

### Access Code
- Title: **Got an invite?**
- Subtitle: **Paste your Fieldtrip code.**
- Button: **Continue**
- Back: **Back**
- Empty: **Paste your invite code first.**
- Bad code: **That code didn’t work.**
- Offline: **Can’t reach Fieldtrip. Try again.**
- Help: **Need a code? Ask the person who invited you.**

### Sign In
- Subtitle: **Log in to keep playing.**
- Add: **New here? Get started →**

### Legal Gate
- Keep checklist.
- Primary: **I agree — continue**
- Disabled helper: **Check the box to continue.**

### Persona Quiz
- Eyebrow: **3 quick picks**
- Subtitle under title: **This picks your Explorer Type.**
- Keep Back + progress.

### Field Type Result
- Remove/replace `PROT_CLASSIFICATION.HV`.
- Badge: **Your Explorer Type**
- Line: **Almost ready.**
- Button: **Start my first mission**

### Field Kit
- Title: **Turn on camera + location**
- Camera: **So you can take proof photos.**
- Location: **So Fieldtrip can check you were really out there.**
- Primary: **Allow**
- Secondary: **Not now**

### Basecamp
- Subtitle: **What to do right now.**
- Keep Next Action dominant.
- Move Loteria to Quick Links only.
- Quick Links header: **More places**
- Empty attention: **You’re clear. Go draw a mission.**

### Missions
- Draw button: **Draw a Mission**
- After draw primary: **Do This Mission**
- Secondaries as text: **Save for later** · **Draw a different one**
- Remove/rename **View Mission Dex** → **Browse decks**
- Pending: **Proof is in review.** / **You can wait, or open your Logbook.**
- Starter progress chip always visible: **Starter 1/3**

### Mission Briefing
- Title: **Your mission**
- Primary only: **Do This Mission**
- Secondary text: **Save for later**

### Capture
- Brief primary: **Open Camera**
- Checklist stays (Find it / Snap it / Say why) — excellent.
- Submit: **Submit Proof (n/10)** until ready, then **Submit Proof**
- Transmitting: **Sending…**
- Needs more proof: **Needs a clearer photo.** / **Retake photo**

### Result
- **Proof sent ✓**
- **Waiting for approval.**
- If starter incomplete: **Starter progress: 1/3** + **Draw next mission →**
- If repair: **Fix this proof →**
- Hide or label print: **Print card (coming soon)**

### Dex lock
- **Locked for now**
- **Finish 3 starter missions to open Dex.**
- **Go do a mission →**

### Voting lock
- **Voting opens after your 3 starter missions.**
- Progress + **Finish starter missions →**

### Big Board lock
- Same pattern as Dex, mention ranks/community briefly.

### Trevor lines (examples)
- Starter: **Draw your starter mission.**
- Active: **You’re on a mission — open it.**
- Pending: **Proof sent ✓ Grab another mission.**
- Repair: **This proof needs a clearer photo.**
- Vote: **Your vote is ready.**

---

## 7. Quick Wins

Implementation order:

1. Rename draw/start/capture verbs so each step has a unique label.  
2. Fix Access Code / Sign In default copy (swap jargon out of the default `fc` slot) + empty-state message.  
3. Rename Welcome CTA to **Get Started**; add invite expectation line.  
4. Demote Save for Later / Draw Another / Print to secondary or “coming soon”.  
5. Put field-note requirement on the Submit button.  
6. Simplify StarterGate / Voting lock copy.  
7. On Mission Result, show starter progress + Draw next mission.  
8. During Starter, add Missions nav spotlight / Dex locked badge.  
9. Stop hiding RewardFeedback during first guided mission (or show a one-line “Proof saved” toast).  
10. Fix How it works “desk” → “deck”; add invite sentence.  
11. Loteria back should go to Basecamp, not Big Board.  
12. Add Sign Up link on Sign In.

---

## 8. Structural Changes

Keep separate from quick wins:

1. **Fieldtrip Now state machine** shared by Basecamp, Missions, Trevor, nav badges.  
2. **Onboarding destination policy:** after Field Kit, land on a single-purpose Starter Mission screen (the guided `mustCompleteStarterMission` UI is closer to right) rather than full Missions chrome.  
3. **Nav attention model:** badges > raised Dex forever.  
4. **Unify proof archive:** one Logbook entry point; stop scattering history/logbook/memories naming.  
5. **Decide Loteria’s role:** tutorial side path vs seasonal mode; do not promote from Basecamp header until Missions loop is learned.  
6. **Retire or rewire orphan `/mission-submitted`** so it cannot outrank MissionResultCard with worse CTAs.  
7. **Profile in IA:** avatar affordance from Basecamp/Missions header.  
8. **Error language system:** user-facing vs diagnostic; never show Firestore/admin strings to players.  
9. **Resume-on-launch** for active mission / needs-more-proof / unseen rewards.  
10. **Post-Starter unlock ceremony** that teaches Dex/Voting/Big Board one at a time (starter completion intro already partly does decks — extend it).

---

## 9. Proposed User Guidance System

Derived from actual app states (`canonicalProgress`, Basecamp VM, Trevor rules, voting phase, activeTrip):

| State | Now Strip | Primary button |
|---|---|---|
| `NEED_INVITE` | Invite code needed | Enter code |
| `NEED_LEGAL` | One quick agreement | Continue |
| `NEED_TYPE` | Pick your Explorer Type | Start quiz |
| `NEED_FIELD_KIT` | Camera helps you play | Allow camera |
| `DRAW_STARTER` | Draw your first mission | Draw a Mission |
| `MISSION_DRAWN` | Mission ready | Do This Mission |
| `MISSION_ACTIVE` | You’re on a mission | Open Camera |
| `PROOF_PENDING` | Proof sent ✓ | Draw next mission |
| `PROOF_NEEDS_FIX` | Needs a clearer photo | Fix proof |
| `PROOF_REJECTED` | Try this mission again | Retry mission |
| `STARTER_PENDING_ALL` | All 3 in review | Open Logbook |
| `STARTER_COMPLETE` | Starter done ✓ | Choose summer deck |
| `DRAW_SEASON` | Ready for another receipt | Draw a Mission |
| `VOTE_OPEN` | Your vote is ready | Vote now |
| `REWARD_UNSEEN` | You got something | Open Dex |
| `IDLE_EXPLORE` | No rush — pick a place | Open Basecamp |

Rules:
- Only one Now Strip action.
- Trevor restates the same action, never a different destination.
- Nav badges mirror the same state.
- Spotlights fire only on first entry to a state family.

---

## 10. Final Priority Plan

### FIX FIRST
Problems actively preventing understanding.

1. Relabel the mission verb chain (Draw → Do → Open Camera → Submit).  
2. Humanize Access Code / default jargon CTAs + empty/error feedback.  
3. Stop Dex from being the loudest locked destination during Starter.  
4. Make Welcome CTA honest (**Get Started** + invite line).  
5. Result screen must teach pending + next mission + starter progress.

### FIX NEXT
Unnecessary confusion.

6. Persistent Now Strip / resume card.  
7. Field-note requirement on Submit button.  
8. Briefing/draw secondary CTA hierarchy.  
9. Simplify lock screens.  
10. Don’t hide first-mission reward feedback.  
11. Sign In ↔ Get Started link.  
12. Loteria back to Basecamp; demote Loteria on first-use Basecamp.

### POLISH LATER

13. Full Now state machine + nav badges.  
14. Starter unlock ceremony for Dex/Voting/Big Board.  
15. Profile header affordance.  
16. Error language system.  
17. Orphan MissionSubmitted cleanup.  
18. Deeper cognitive pass on Big Board density / Tribunal naming.

---

## Five Changes Most Likely to Make Fieldtrip Usable Without Reading

1. **Unique action verbs per step** so tapping the obvious button always does the obvious next thing.  
2. **One persistent Now Strip** driven by real user state.  
3. **Human default copy on the invite wall** with clear empty/error feedback.  
4. **Missions-first nav attention during Starter** (Dex looks locked; Missions looks hot).  
5. **Proof sent ✓ → starter progress → Draw next mission** on every submission result.

Preserve the playful, campy, game-like identity — just stop making comprehension depend on reading the trench coat.

---

## Appendix A: Live Test Notes

**Completed live**
- Welcome hierarchy and CTA behavior
- How it works modal
- Access Code empty/fake submit behavior
- Login empty validation and recover-password guard

**Not completed live (blocked by invite)**
- Authenticated onboarding, Missions draw, Capture, Dex, Voting, Big Board, Crew

**Source-backed for blocked flows**
- Routing/guards in `src/App.tsx`
- Basecamp VM in `src/logic/basecampViewModel.ts`
- Missions draw labels in `src/pages/Deck.tsx` + `src/utils/labelUtils.ts`
- Capture/result in `FieldClipboard.tsx` / `MissionResultCard.tsx`
- StarterGate + BottomNav prominence
- Trevor collapsed guidance model

## Appendix B: Key Files

- `src/pages/Welcome.tsx`
- `src/pages/Auth/AccessCodeGate.tsx`
- `src/pages/Auth/SignIn.tsx`
- `src/pages/Auth/SignUp.tsx`
- `src/components/BetaAccessGate.tsx`
- `src/components/onboarding/PersonaQuiz.tsx`
- `src/pages/FieldTypeResult.tsx`
- `src/components/FieldKitOnboarding.tsx`
- `src/pages/Basecamp.tsx`
- `src/logic/basecampViewModel.ts`
- `src/pages/Deck.tsx`
- `src/pages/MissionBriefing.tsx`
- `src/pages/Capture.tsx`
- `src/components/FieldClipboard.tsx`
- `src/components/MissionResultCard.tsx`
- `src/pages/MissionSubmitted.tsx`
- `src/pages/Collection.tsx`
- `src/components/StarterGate.tsx`
- `src/components/BottomNav.tsx`
- `src/pages/VotingHubPage.tsx`
- `src/pages/BigBoard.tsx`
- `src/pages/Crew.tsx`
- `src/pages/LoteriaExploreBoard.tsx`
- `src/components/TrevorGuide.tsx`
- `src/App.tsx`
