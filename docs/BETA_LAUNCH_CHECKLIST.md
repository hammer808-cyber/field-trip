# Fieldtrip: Summer 2026 Beta Launch Checklist (5/30)

## 1. PRE-LAUNCH (Final 24 Hours)
- [ ] **Feature Flag Audit**: Confirm `ENABLE_DECK_PACK_DRAW_LOGIC` is set to `false` in `src/config/featureFlags.ts`.
- [ ] **Build Verification**: Run `npm run build` locally and in the container to ensure zero hydration or asset errors.
- [ ] **Data Integrity**: Verify `SUMMER_CHALLENGE_BANK` contains all 25+ "Approved" status missions.
- [ ] **Firebase Check**: Confirm Firestore security rules are deployed and `access_codes` collection is populated for testers.
- [ ] **Fallback Audit**: Ensure every mission has either a valid `image` URL or correctly triggers the visual fallback.
- [ ] **Route Safety**: Ensure `/admin` routes are protected or hidden from the main navigation for standard beta testers.

## 2. TESTER ONBOARDING
- [ ] **Invite List**: Finalize the list of initial "Bureau Scouts" (beta testers).
- [ ] **Access Handouts**: Ensure every scout has their unique 6-digit Bureau Access Code.
- [ ] **Documentation**: Send links to `BETA_TEST_SCRIPT.md` and `BETA_FEEDBACK_CHECKLIST.md`.

## 3. CORE LOOP TEST (5/30 Morning Pass)
- [ ] **The Draw**: Execute 3 random deck draws.
- [ ] **The Capture**: Successfully capture 1 Photo and 1 Field Note.
- [ ] **The Sync**: Verify the transmission animation completes without hangs.
- [ ] **The Result**: Confirm XP points are correctly added to the user's Profile (`points` field in Firestore).
- [ ] **The Vault**: Confirm completed missions appear in the "Archive" and "Collection" tabs.

## 4. LAUNCH MONITORING
- [ ] **Error Logs**: Monitor console and Firebase logs for `UNCAUGHT_EXCEPTION` or `PERMISSION_DENIED`.
- [ ] **Feedback Channel**: Monitor the designated channel (Slack/Discord/Form) for "Mission Blocker" reports.
- [ ] **XP Balance**: Observe if any mission is awarding significantly too much or too little XP compared to its difficulty.

## 5. POST-BETA TRIAGE (6/1)
- [ ] **Categorize Bugs**: Sort tester reports into **Priority A (Blocker)**, **Priority B (Polish)**, and **Priority C (Future)**.
- [ ] **Release Update**: Deploy the first "Beta Fix" build based on day-one feedback.
- [ ] **Stakeholder Update**: Send the first "Field Report" summarizing engagement metrics and known blockers.
