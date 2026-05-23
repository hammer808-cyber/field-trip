# Fieldtrip: Deck Packs System Plan (Post-Beta)

## 1. Deck Pack Definition
A **Deck Pack** is a curated collection of Missions grouped by theme, gameplay archetype, or difficulty. While the current Beta utilizes a single "Unit Deck," the Deck Pack system allows for specialized signals to be layered over the core experience.

**Key Distinction**: Unlike the "Mission Archive" (which is a passive log of all known signals), a **Deck Pack** is an active filter. When a pack is "Slotted," the physical deck draws exclusively from that pack's pool.

## 2. First Recommended Packs

| Pack Name | Purpose | Example Missions |
| :--- | :--- | :--- |
| **Starter: First Signals** | Onboarding & Safety | "First Signal", "Mood Object", "Threshold Witness" |
| **Summer Surge 2026** | Main seasonal content | The primary 25+ mission bank approved for beta. |
| **Archetype: Mall Rat** | Urban retail & interior exploration | "Display Case Audit", "Escalator Loop", "Mall Relic" |
| **Archetype: Bigfoot** | Stealth & remote observation | "Invisible Observer", "Shadow Log", "Remote Witness" |
| **Difficulty: Expedition** | Long-form, high-effort signals | "One Block Expedition", "Triple-Color Walk" |
| **Rotating: Heatwave** | Atmospheric summer events | "Shade Quest", "Hydration Station", "Heat Mirage" |

## 3. Data Model Proposal

```typescript
interface DeckPack {
  packId: string;           // unique identifier (e.g., 'starter-v1')
  name: string;             // Display name (e.g., 'Starter: First Signals')
  description: string;      // The "Hook" for the scout
  themeKey: string;         // Links to visual skin or accent colors
  missionIds: string[];     // IDs of missions included in this pack
  
  // Rules & Scaffolding
  unlockRule?: string;      // 'immediate', 'rank_limit', 'archetype_match'
  requiredRank?: number;    // Min rank required to use
  isRepeatable: boolean;    // Can user redraw from this pack after completion?
  
  // Temporal Logic
  startsAt?: Date;          // Seasonal start
  endsAt?: Date;            // Seasonal sunset
  isActive: boolean;
  
  // Metadata & Visuals
  coverImage: string;       // Card back artwork
  fallbackIcon: string;     // Lucide icon backup
  rewardIds: string[];      // Unique badges/stickers for pack completion
}
```

## 4. UX & Draw Logic Proposal
- **The Selector**: On the Deck page, missions are grouped by pack. The user selects an "Active Pack."
- **The Physical Deck**: The `DeckStack` component updates its card-back artwork based on the selected pack's `coverImage`.
- **Filtered Draw**: When `handleDraw` is triggered, the pool of candidates is restricted to:
  `MOCK_TRIPS.filter(t => activePack.missionIds.includes(t.id) && !userCompletedIds.includes(t.id))`
- **Automatic Fallback**: If a pack is completed, the app suggests switching to the "Summer Surge" main pack.

## 5. Implementation Phases

### Phase 1: Data Model & Static Registry [COMPLETED]
- **Goal**: Define `DECK_PACKS` constant in `src/data/deckPacks.ts`.
- **Scope**: No UI changes. Verification of type safety with existing `MOCK_TRIPS`.
- **Outcome**: Registry created with 13 packs (Starter, Summer Surge, Quick Hits, Expeditions, Evidence-based, and Archetype placeholders).
- **Files**: `src/types/deckPacks.ts`, `src/data/deckPacks.ts`.
- **Wiring**: Intentionally not wired to UI yet to maintain beta stability.

### Phase 2: Deck Slotting UI [COMPLETED]
- **Goal**: Add a "Switch Deck" or "Pack Drawer" component to the Deck page.
- **Scope**: Allows user to toggle `activePackId` in local app state.
- **Outcome**: `DeckPackSelector` component integrated into the Deck page. Users can visually "slot" different packs.
- **Visuals**: Selector reflects pack difficulty, theme, and mission counts.
- **Stability**: Physical deck draw logic remains untouched (Phase 3 task).

### Phase 3: Dynamic Physical Deck [COMPLETED]
- **Goal**: Connect `DeckStack` and `handleDraw` to the active pack theme and mission pool.
- **Scope**: Feature-flagged implementation (`ENABLE_DECK_PACK_DRAW_LOGIC`).
- **Outcome**: `drawTrip` updated in `AppContext` to support `packId` filtering. `DeckStack` updated to show visual pack identity.
- **Rollback**: Set `ENABLE_DECK_PACK_DRAW_LOGIC: false` in `src/config/featureFlags.ts`.
- **Files**: `src/config/featureFlags.ts`, `src/context/AppContext.tsx`, `src/pages/Deck.tsx`, `src/components/DeckStack.tsx`.

### Phase 4: Pack Completion Rewards [DEFERRED]
- **Goal**: Check `packProgress` (missions_completed / total_in_pack).
- **Scope**: Trigger unique rewards upon 100% completion of a pack.
- **Status**: Post-Beta development.

## 6. Risks & Safeguards
- **Risk**: User has no eligible missions in a small pack.
  - **Safeguard**: "Low Inventory" warning + automatic redirect to the unit's main Summer Surge deck if a drawer is empty.
- **Risk**: Database drift during pack migration.
  - **Safeguard**: Store only `activePackId` in Firestore; keep the mission lists in the code registry for easier versioning.
- **Risk**: Confusing users with too many choices.
  - **Safeguard**: Lock all packs except "Starter" for the first 3 mission completions.

## 7. Recommended Next Prompt (Post-Launch)
*"Proceed with mission content expansion and review beta analytics to inform the Pack Mastery reward logic."*
