# Fieldtrip: Feature Freeze Note (May 2026)

## 1. Frozen Status
As of 5/20/2026, the Fieldtrip application is under **Feature Freeze** for the 5/29 Stakeholder Presentation and 5/30 Beta Launch.

## 2. What is Frozen
- **Deck Pack Progress**: Mastery logic and reward triggers are deferred.
- **Persistent Selection**: `activePackId` will reset on refresh/session end (local state only).
- **Database Schema**: No changes to Firestore collections or document structures.
- **New Features**: No unrequested modules or social features.

## 3. Mandatory Configuration (Launch State)
The following state MUST be maintained for the beta window:
- `src/config/featureFlags.ts` -> `ENABLE_DECK_PACK_DRAW_LOGIC: false`
- This ensures the physical `DeckStack` uses the verified Summer Surge mission pool.

## 4. Allowed Modifications (Hotfixes Only)
The following changes are permitted during the freeze window:
- Critical build failure fixes.
- Blocker-level logic fixes (e.g., Secure Evidence hangs).
- Significant mobile layout clipping on verified devices.
- Documentation and copy corrections.

## 5. Rollback Procedure
If the application displays "No Active Mission" or blank cards on a fresh draw:
1. Verify `ENABLE_DECK_PACK_DRAW_LOGIC` is `false`.
2. Clear local storage/cache.
3. Refresh the Bureau Session.

---
*Bureau Management // May 2026*
