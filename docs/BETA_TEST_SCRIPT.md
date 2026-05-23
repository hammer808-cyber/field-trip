# Fieldtrip Beta Test Script

## 1. Purpose of the Beta Test
The goal of this beta is to validate the core user loop of the Fieldtrip application. We are testing the usability of the mission drawing mechanic, the clarity of mission requirements, the capture flow, and the reward/XP feedback loops.

## 2. Tester Setup
- **Device**: Mobile (iOS/Android) is preferred to test the field-oriented layout. Desktop is acceptable for functional testing.
- **Browser**: High-performance browsers like Chrome or Safari.
- **Access**: Ensure you have a valid beta access code or are logged in as an authorized scout.

## 3. Step-by-Step Tester Script

### Phase 1: Onboarding & Deck Interaction
1. **Open the App**: Navigate to the development or preview URL.
2. **Enter the Deck**: From the landing or splash page, proceed to your unit's Deck.
3. **Observation - Deck Hero**:
   - Do you notice the large deck of cards in the center?
   - Is it obvious you need to tap it to start?
4. **Draw a Mission**: Tap the deck stack to draw a mission.
5. **Review the Card**:
   - Read the mission title, "The Ask" (description), and the Field Note Prompt.
   - Look at the evidence checklist (Photo, Field Note, etc.).
   - Is the XP breakdown clear?

### Phase 2: Mission Intel & Field Work
1. **Get Intel (Optional)**: If you are confused, tap "GET INTEL" (Hint).
   - *Notice*: This triggers a "Bureau Penalty" which blocks the 'Certified' scoring tier. Does this trade-off make sense to you?
2. **Start Mission**: Tap "SECURE EVIDENCE" or the Camera icon to enter the Capture screen.

### Phase 3: Evidence Capture
1. **The Viewfinder**:
   - Aim your camera at the target subject.
   - Tap "TAKE PHOTO".
2. **Review & Preparation**:
   - Once the photo "develops", enter your Field Note text in the text area.
   - *Requirement*: Field Notes must be at least 10 characters to count as valid evidence.
   - Observe the Location Sync banner. (Note: Location is simulated for this beta).
3. **Select Scoring Tier**: Choose between 'Standard' or 'Advanced' (or 'Certified' if not penalized).
4. **Validation**: Try to tap "SECURE EVIDENCE" before adding a note. Does the app stop you with a clear message?

### Phase 4: Scoring & Results
1. **Secure Evidence**: Once all requirements are met, tap the large "SECURE EVIDENCE" button.
2. **Transmission**: Wait for the "Transmitting" animation to complete.
3. **Review Results**:
   - Look at the resulting Mission Result Card.
   - Does the XP awarded match your expectations?
   - If you used a hint, was the 15% penalty visible?
4. **Return to Deck**: Tap "BACK_TO_DECK".

### Phase 5: Verification
1. **Check Status**: On the Deck page, verify that your mission count has increased.
2. **Mission Archive**: Scroll down to the "Deck_Archive" or "Field_Logs" to see your completed entry.

## 4. Success Criteria
A test is considered successful if the tester completes a mission start-to-finish without needing developer intervention, and finds the scoring feedback satisfying.
