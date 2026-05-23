# Fieldtrip Beta Known Limitations

As this is a pre-release beta for the Summer 2026 launch, the following limitations are intentional and part of the current development phase.

## 0. Gameplay Systems (Freeze Status)
- **Deck Packs**: The Deck Pack selector is currently in **Preview Mode**. Switching packs visually updates the UI, but the physical draw pool remains synced to the core Summer Surge registry for launch stability. Pack-based draw logic is currently disabled via feature flag.

## 1. Technical Simulations
- **Location/GPS**: Location verification is currently simulated for beta stability. The app will confirm a "Satellite Lock" automatically. Production-grade GPS geofencing is slated for the Post-Beta phase.
- **Image Processing**: Some advanced "Lens Effects" are emulated using CSS filters rather than server-side RAW processing to ensure low latency for testers.

## 2. Content & Assets
- **Artwork**: Some sticker and badge visuals are "placeholder" or use standard Fieldtrip branding. Final high-fidelity holographic artwork is pending.
- **Mission Bank**: The current mission library is a curated "Starter Pack." The full 100+ mission deployment will occur at the start of the summer season.
- **Image Fallbacks**: If a mission image fails to load from the remote repository, a standard Fieldscape fallback illustration will be displayed. This is expected behavior.

## 3. Storage & Persistence
- **Media Hosting**: Large-scale image hosting is optimized for the current tester volume. High-traffic stressors are being mitigated.
- **Data Resets**: Core mission logic and user progress may be reset periodically as we refine the scoring balances and rank requirements.

## 4. UI/UX
- **Admin Tools**: The `/admin` routes are functional but have a lower visual polish priority than the player experience.
- **Horizontal Scroll**: Swipe gestures on the "Archive" tab are undergoing refinement for different device widths.
- **Notifications**: System-wide push notifications for "Field Checks" are currently handled via in-app overlays rather than OS-level notifications.

---

**Reporting Bugs**: If you encounter an issue NOT listed above (e.g. a complete crash, impossible XP calculation, or broken back buttons), please report it via the Beta Feedback form.
