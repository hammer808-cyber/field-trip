# BETA LAUNCH CHECKLIST (ADMIN)

Complete these steps before inviting the first external tester.

## 1. Environment Verification
- [ ] `npm run build` passes with zero errors.
- [ ] `npm run lint` passes (no type errors).
- [ ] Firebase Config is verified (Firestore & Auth connected).
- [ ] `FIREBASE_API_KEY` is set in the environment.

## 2. Config & Rules
- [ ] **Deck Gates**: Confirm `Starter Signals` -> `SoCal/Heatwave` unlock logic triggers at 3 approvals.
- [ ] **AI Caps**: Verify Gemini API usage limits are configured in the cloud console.
- [ ] **Storage**: Confirm image uploads go to the correct bucket with 10MB limits.

## 3. Core Flow Smoke Test
- [ ] New Test Account created successfully.
- [ ] Quiz completed and profile generated.
- [ ] Starter mission drawn and submitted.
- [ ] Admin can see the submission in real-time.
- [ ] Approval awards XP and increments counter.
- [ ] 3rd Approval unlocks SoCal Summer deck.

## 4. UI/UX Polishing
- [ ] **Permissions**: Camera and Location prompts use "Human-friendly" language.
- [ ] **Beta Note**: Non-invasive beta disclaimer visible in the Missions view.
- [ ] **Asset Check**: All icons (Lucide) and images (thumbnails) load correctly.

## 5. Communications
- [ ] `BETA_TEST_SCRIPT.md` is ready for sharing.
- [ ] `FEEDBACK_CHECKLIST.md` sent to testers.
- [ ] Admin review schedule set for the first 48 hours.

## 6. Kill Switches
- [ ] Confirm how to disable uploads globally if spam occurs.
- [ ] Confirm how to toggle Maintenance Mode if needed.

**READY FOR TESTERS.**
