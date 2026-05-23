# Fieldtrip: 5/29 Presentation Demo Flow

## 1. Demo Goal
Demonstrate the "Core Loop" of the Fieldtrip application: from drawing a mission to securing evidence and receiving a reward. Highlighting the aesthetic, the feedback loop, and the "Certified" tier system.

## 2. Pre-Demo Setup
- **Device**: iPhone 15 Pro (Simulated or Real) or standard mobile-width browser (390px).
- **Environment**: AI Studio Preview or Cloud Run deployment.
- **Feature Flag**: `ENABLE_DECK_PACK_DRAW_LOGIC` should be `false` (default) for the standard public demo.
- **State**: User should be logged in and at the **Deck** page.
- **Mission Bank**: Ensure `starter-1` and `starter-2` are available in the bank.

## 3. The Intro Talking Points
*"Fieldtrip is a localized evidence-capture game that turns urban navigation into a series of 'Missions'. Today we're looking at the Summer 2026 'Bureau Audit' loop."*

## 4. Click-by-Click Demo Path

### Screen 1: The Deck
- **Action**: Open app to the Deck.
- **Narrative**: *"This is your Unit's centralized Deck. Every day, the Bureau issues new signals."*
- **Interaction**: Tap the physical deck stack in the center of the screen.
- **Result**: A card is "drawn" and presented.

### Screen 2: The Mission Card
- **Action**: Review `starter-1` (First Signal).
- **Narrative**: *"Each mission has a specific 'Ask'. This one is onboarding us into the field. It requires a Photo and a Field Note."*
- **Interaction**: Tap **GET INTEL** (to show the Bureau Penalty mechanism).
- **Narrative**: *"If a scout is stuck, they can request Bureau Intel, but it comes at a cost: a 15% XP penalty and the 'Certified' tier is blocked for this mission."*
- **Interaction**: Tap **SECURE EVIDENCE** (Primary Action).

### Screen 3: Capture (The Viewfinder)
- **Action**: Simulate a camera capture.
- **Narrative**: *"The viewfinder is optimized for one-handed field use."*
- **Interaction**: Tap the large **Camera Button**.
- **Result**: Photo "develops" and moves to the review state.

### Screen 4: Proof Review
- **Action**: Add a Field Note.
- **Interaction**: Type "Threshold crossed. Signal clear." in the note area.
- **Narrative**: *"Notes must be at least 10 characters to ensure detailed field reporting."*
- **Observation**: Point out the **BETA_LOCATION_SYNC** banner to show the location requirement is met (simulated).
- **Condition Check**: Tap the **SECURE EVIDENCE** button (footer).

### Screen 5: The Transmission
- **Narrative**: *"Evidence is transmitted to the Bureau for validation."*
- **Result**: Transmission animation completes (X-ray/Sync pulse).

### Screen 6: XP Result
- **Action**: View `MissionResultCard`.
- **Narrative**: *"Results are immediate. We see our final XP, our tier (Advanced), and the Bureau Penalty if applied."*
- **Interaction**: Tap **BACK_TO_DECK**.

---

## 5. Demo Safety Tips
- **DO NOT CLICK**: Avoid clicking "Admin" or "Profile" unless explicitly asked; keep focus on the loop.
- **BACKUP MISSION**: If `starter-1` is already completed by a test user, use `starter-2` ("Mood Object") or `template_15_ordinary_main_character`.
- **MISSION TO AVOID**: Avoid `template_16_one_block_expedition` (requires 5 photos) for a quick live demo.

## 6. Backup Plan
- **Asset Failure**: If images don't load, explain: *"The Bureau is using standard fieldScape fallbacks for this sector during the initial deployment."*
- **State Failure**: Use the "Reset" button (if available via Admin) or simply refresh the page to clear the current deck state.
