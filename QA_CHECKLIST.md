# Field Trip QA Checklist

## 1. User Pathways
- [ ] **Onboarding**: Start as guest, answer quiz, receive Field Type. Verify Field Type is saved to Firebase.
- [ ] **Returning User**: Verify points, solo count, and submissions persist across sessions.
- [ ] **Memorial Day Lock**:
  - [ ] Set "Simulated Date" to before May 25. Verify Viewfinder shows "SYSTEM_LOCKED".
  - [ ] Set "Simulated Date" to after May 25. Verify Viewfinder opens and allows capture.
- [ ] **Solo Progression**:
  - [ ] Start at 0 missions. Verify Crew Mode is locked in Deck/Nav.
  - [ ] Complete 3 missions. Verify Crew Mode unlocks (visual update).
- [ ] **Submission Flow**:
  - [ ] Capture image, add note, dispatch.
  - [ ] Verify entry appears in "Prior Reports" on Deck.
  - [ ] Verify points are added correctly (base points + Field Type modifiers).
- [ ] **Leaderboard**:
  - [ ] Verify user is hidden from leaderboard below 50 points.
  - [ ] Verify user appears on Frontlines board after 50 points.
- [ ] **Skin Switching**:
  - [ ] Switch to Baja, Diamond, Heatwave.
  - [ ] Verify visual assets (Hibiscus, Stars, Colors) update.
  - [ ] Verify core logic (capturing, submitting) remains functional.

## 2. Failure Points
- [ ] **Firebase Permission**: Attempt to modify another user's profile via dev console. Verify Firestore rules block.
- [ ] **Missing Profile**: Clear local storage/auth. Re-login. Verify new profile is created without crash.
- [ ] **Offline Simulation**: Toggle "Offline" in browser. Verify UI shows connectivity warning (if implemented) or fails gracefully.
- [ ] **Duplicate Points**: Rapid-click "Dispatch Validation". Verify only one entry is created.

## 3. Game State Matrix
| State | Viewfinder | Crew Mode | Leaderboard | Profile |
|-------|------------|-----------|-------------|---------|
| New (Pre-Season) | Locked | Locked | Hidden | Recruit |
| New (Post-Unlock) | Open | Locked | Hidden | Recruit |
| Active (1-2 Missions) | Open | Locked | Hidden | Field Agent |
| Active (3+ Missions) | Open | Unlocked | Hidden | Field Agent |
| Elite (50+ Pts) | Open | Unlocked | Visible | Field Agent |
| Admin | Always Open | Always Unlocked | Visible | Admin |

## 4. Automated Tests Pathway
- [ ] `progression.ts` unit tests.
- [ ] Firestore rules security spec review.
- [ ] Component hydration checks (all pages load without error).
