# Fieldtrip: 5/29 Presentation Rehearsal Script

This document provides a guided script and click-path for the May 29th stakeholder presentation.

## 1. Pre-Demo Setup Checklist
- [ ] **Feature Flag**: Verify `src/config/featureFlags.ts` has `ENABLE_DECK_PACK_DRAW_LOGIC: false`.
- [ ] **Device**: Use a mobile-width browser (390px) or an iPhone 15 Pro.
- [ ] **User State**: Ensure you are logged in as a test scout.
- [ ] **Clean Slate**: If a mission is already active, complete it or refresh/reset to return to the **Deck** state.
- [ ] **Mission Availability**: Ensure `starter-1` ("First Signal") is available in the mission bank.

---

## 2. 1-Minute Highlight Script
*"Fieldtrip is a mobile experience that turns the physical world into a tactical observation game. We call it 'Bureau Auditing'."*

*(Action: Open to Deck)*
*"Everything starts here at your Unit's Deck. It's a localized feed of 'Signals' that require field verification."*

*(Action: Tap Deck → Draw starter-1)*
*"Drawing a card reveals a Mission. This is 'First Signal'. It's our onboarding mission. The Bureau needs a photo and a field note to verify this sector."*

*(Action: Start Mission → Capture → Secure)*
*"The interface is built for the field—one-handed, high-contrast, and immediate. We'll capture our evidence, transmit it back to the Bureau, and receive our XP and Archive rewards instantly."*

*(Action: Show Result Page)*
*"The loop is complete. We've secured evidence, boosted our rank, and the mission is now archived in our permanent Collection."*

---

## 3. 3-Minute Expanded Script
*(Full narration with context)*

**The Concept (0:00 - 1:00)**
"Fieldtrip is an experimental urban observation platform. We're building for a 2026 summer launch where users act as 'Scouts' for the Bureau. The goal is to get people out into the world, looking closer at the details they usually ignore."

**The Interaction (1:00 - 2:00)**
"Here we see the main interface—the Deck. It uses a physical metaphor for discovery. Tap the stack, and the Bureau assigns a signal. We see the 'Mission Signal File' which provides the 'Ask'. Notice the 'Bureau Penalty'—scouts can request intel for a hint, but it reduces their potential XP. We're going for high-stakes, high-reward field reporting."

**The Secure Loop (2:00 - 3:00)**
"When we head into the 'Capture' phase, the app transforms into a viewfinder. We're validating location in real-time—simulated for this beta walk-through—and ensuring field notes are detailed. Transmitting evidence triggers a pulse animation back to the Bureau servers. Once secured, the scout is tiered—Certified, Advanced, or Expert—and the XP is added to their permanent record."

---

## 4. Click-by-Click Path
1. **START**: Open the app. The **Deck** page should be the landing state.
2. **THE DRAW**: Tap the center of the physical card stack.
3. **THE SIGNAL**: The "First Signal" (or similar) card pops up. Review the XP and Evidence requirements.
4. **START MISSION**: Tap the primary action button on the card.
5. **VIEWFINDER**: You are now in the Capture view. Tap the center **Camera Button**.
6. **PROOF REVIEW**: Tap the text area and type: *"Signal confirmed. Threshold is clear."* (Must be >10 chars).
7. **SECURE**: Tap the **SECURE EVIDENCE** button at the bottom.
8. **TRANSMISSION**: Wait for the X-ray animation to complete.
9. **RESULTS**: View the result card. Point out the XP gain.
10. **ARCHIVE**: Tap **BACK_TO_DECK**. 
11. **VAULT**: (Optional) Tap the **Collection** tab to show the mission is now Archived.

---

## 5. What NOT to Click
- **Admin Panel**: Do not open the debug/admin tools during the demo.
- **Deck Pack Selector**: Avoid changing packs unless asked; keep it on "Summer Surge" for stability.
- **Profile Edits**: Don't spend time on avatar or skin changes; focus on the gameplay loop.
- **Incomplete Missions**: Don't draw a 5-photo mission (e.g., "One Block Expedition") as it takes too long to demo.

---

## 6. Recovery Lines (Damage Control)

| Scenario | What to Say |
| :--- | :--- |
| **Mission takes 2+ seconds to load** | "The Bureau is establishing a localized uplink... common for initial field deployments." |
| **Location Sync is shown as 'Simulated'** | "For this presentation, we've enabled 'Simulation Sync' to ensure we can show the loop regardless of our current indoor GPS signal." |
| **Card Draw is blank** | "Signal interference in this sector. Let's refresh the Bureau uplink." *(Action: Refresh Page)* |
| **XP Result shows 0** | "XP is calculated based on accuracy and timestamp. Looks like we're in the baseline audit tier today." |

---

## 7. The Closing Statement
*"Fieldtrip launches to its first 50 scouts tomorrow on May 30th. This beta window will validate our core 'Draw-to-Secure' loop. After the summer season, we'll be expanding into 'Crew Territories' and deep-geofenced 'Expedition Packs'. The Bureau is officially online."*
