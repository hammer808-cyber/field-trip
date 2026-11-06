# Old Decks Rebalance Audit

Read-only audit of the 83 old-deck cards — Starter (3), SoCal (15), Heatwave (25),
Jet Setter (25), Errand (15) — against the Texas deck as the standard.
Texas bar: **easy = 100 XP** (find/photograph one common thing nearby),
**medium = 125 XP** (needs a specific place, time, or real effort),
**hard = 150 XP** (rare, multi-step, or specific conditions).

Every card was judged from its actual text (title, description, mission,
shortPrompt, proofType, proofRequirements). Nothing here is invented;
rewrites quote the original wording they fix.

## Method and calibration

- **requiredSubjects is not a burden list.** It is one any-of AI check
  ("does the photo contain any of these keywords"), so subject count was
  never treated as difficulty.
- **requireLocation / requireTimestamp are uniform** across the old decks
  (76/83 require location, 83/83 require timestamp), so they do not
  differentiate difficulty and were not used as a reason to raise a card.
- **"Specific place" means a named or rare destination** (a mural, a
  lighthouse, a boardwalk), not a generic nearby location type. A park,
  a beach, or a street is "nearby" — easy.
- **Crew presence alone does not make a card medium.** In these social
  decks the crew is the assumed context; the photo is still one common
  thing nearby. This is a judgment call (see below) — if Zach wants
  crew-presence to count as medium, the affected cards are listed under
  "Judgment calls".
- **"Moment" cards** ("proof the day changed direction", "proof a quick
  stop ran long") were judged easy: the player photographs whatever
  happened, and detours happen constantly. The wording is vague but the
  listed examples define the act.
- A rewrite was proposed **only** when the wording has no concrete
  referent — a new player would stall on what to photograph. Flavor-heavy
  wording that still names a thing to photograph was left alone.

## Headline findings

- **27 of 83 cards change (33%). 56 are correct as-is.**
- The old decks' problem is mostly **mislabeled mediums, not wrong points**:
  23 of the 27 changes are difficulty-label-only (the card already pays
  100, which is the correct easy pay). Only **4 cards change points**.
- **Heatwave is the outlier.** 16 of its 25 cards are labeled medium at
  100 XP, but the deck is a "receipts" deck — nearly every ask is "take
  one photo of a vibe/moment nearby." All 16 drop to easy/100. After this
  pass Heatwave is a flat easy deck, which is honest about what it asks.
  (Jet Setter and Errand are already effectively flat-easy decks; their
  only mediums are the same "lore/moment" closers.)
- **SoCal is the only deck with real variety**, and it mostly holds up:
  its mediums are genuine hunts and its one hard is a genuine hard. It
  needs two points fixes (150 → 125, 200 → 150) and two judgment calls.
- **5 cards need rewrites**, all Heatwave, all the same failure: the
  wording names a feeling or a metaphor ("vacation energy", "this chapter
  of the day", "emotional forecast") with no concrete thing to photograph.
  Notably, the Frankie plain copy for all five **already says it plainly
  with examples** — the rewrites bring the base text in line with the
  plain copy that already exists.
- **No voice notes were added** in this audit (per Zach's call). Only
  starter-3 uses a note at all (photo + note proof).

## Summary counts by deck

| Deck | Cards | Difficulty changes | Points changes | Rewrites | Unchanged |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter (FT-SS) | 3 | 1 | 0 | 0 | 2 |
| SoCal (FT-03) | 15 | 2 | 4 | 0 | 11 |
| Heatwave (FT-01) | 25 | 16 | 0 | 5 | 9 |
| Jet Setter (FT-05) | 25 | 4 | 0 | 0 | 21 |
| Errand (FT-04) | 15 | 2 | 0 | 0 | 13 |
| **Total** | **83** | **25** | **4** | **5** | **56** |

Difficulty changes: 25 (24 medium → easy, 1 easy → medium).
Points changes: 4 (socal-04 150 → 125, socal-05 100 → 125,
socal-10 200 → 150, socal-15 150 → 100).
Proposals total: 27 cards (machine-readable list:
`/tmp/rebalance-proposals.json`).

## The 5 rewrites

All five are Heatwave. Each keeps the card's voice; each replaces a
feeling/metaphor with a concrete thing to photograph.

### heatwave-01 — Heat Signature
- Original: "Capture something that looks personally affected by summer."
- Proposed: "Capture something the heat got to — wilted, faded, melted,
  or just sweating."
- Why: "personally affected by summer" has no concrete referent. (Frankie
  plain copy already says it: "something the summer heat has changed,
  like a melted snack, a sweaty drink, or a person fanning themselves.")

### heatwave-05 — Vacation Behavior Detected
- Original: "Capture proof of vacation energy in a normal place."
- Proposed: "Capture vacation energy somewhere normal — sandals at the
  store, sunglasses indoors, a drink with an umbrella."
- Why: "vacation energy" has no concrete referent. (Frankie plain copy
  already gives the examples.)

### heatwave-08 — Main Character Checkpoint
- Original: "Take one photo that proves you entered this chapter of the day."
- Proposed: "Take one photo of the moment the day turned — a new place,
  a new plan, a new mood."
- Why: "chapter" is undefined; there is nothing concrete to photograph.
  (Frankie plain copy already resolves it as arriving somewhere new.)

### heatwave-10 — Current Personal Weather
- Original: "Capture your current energy as a weather report."
- Proposed: "Show today like a weather report — sunny, stormy, foggy, or
  clear — with a photo of what feels like your mood."
- Why: a metaphor with no concrete referent. (Frankie plain copy already
  maps feelings to weather with examples.)

### heatwave-12 — Crew Weather Advisory
- Original: "Capture the group's current emotional forecast."
- Proposed: "Capture the crew's mood right now — hyped, wiped, hangry,
  or unbothered."
- Why: "emotional forecast" has no concrete referent. (Frankie plain copy
  already says "laughing, resting, or eating together.")

## Judgment calls (easy to overrule)

1. **Crew presence ≠ medium.** heatwave-12/13/14/15 were kept easy on the
   grounds that the crew is the assumed context. If crew-presence should
   count as medium, those four go back to medium/125.
2. **socal-05 Golden Hour Glow → medium/125.** Time-gated (golden hour
   only). A reasonable reader could keep it easy — the sky is everywhere
   at sunset.
3. **starter-3 Personal Oasis → easy/100.** The note is a light extra step,
   not medium effort. Alternative: keep medium and pay 125.
4. **socal-15 The Blanket Archive → easy/100.** A towel on grass is one
   common thing nearby. Alternative: keep medium/125 if the intent is
   found-not-staged picnic scenes.
5. **"Moment" cards are easy.** heatwave-17/21/22/23, jet-setter-22/24,
   errand-deck-14 treat a "moment" (a detour, a complication) as
   photograph-whatever-happened. If moments should cost more, these
   nine go to medium/125 as a group.

## Per-card table

"Now" is current difficulty/points; "Proposed" is the change (— means no
change). "Ask" is what the card actually asks, in one sentence. "Clear?"
is whether a brand-new player would know what to do.

### Starter (FT-SS)

| ID | Title | Now | Proposed | Ask | Clear? | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| starter-1 | The Initial Signal | easy/100 | — | Photograph any outdoor nature detail nearby. | Yes | — |
| starter-2 | Snack Evidence | easy/100 | — | Photograph a snack or cold drink within reach. | Yes | — |
| starter-3 | Personal Oasis | medium/100 | easy/100 | Photograph your cool spot in the heat, plus a note. | Yes | Judgment call: the ask is one common thing nearby (easy by the Texas bar); the note is a light extra step, not medium effort. Alternative: keep medium and pay 125. |

### SoCal (FT-03)

| ID | Title | Now | Proposed | Ask | Clear? | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| socal-01 | Shoreline Signal | easy/100 | — | Photograph where land meets water. | Yes | — |
| socal-02 | Palm Tree Paradise | easy/100 | — | Photograph palm trees. | Yes | — |
| socal-03 | Boardwalk Snack | medium/125 | — | Photograph a boardwalk-style snack. | Yes | — |
| socal-04 | Public Art Archive | medium/150 | medium/125 | Photograph a mural or piece of public art. | Yes | Label fits (finding a mural takes a real hunt); points wrong for the label — medium pays 125. |
| socal-05 | Golden Hour Glow | easy/100 | medium/125 | Photograph the sky at golden hour. | Yes | Judgment call: time-gated (golden hour only), and the Texas bar counts a specific time as medium. A reasonable reader could keep it easy. |
| socal-06 | The Bike Path Scout | medium/125 | — | Photograph a bike, scooter, or bike lane near the beach or a park. | Yes | — |
| socal-07 | Neighborhood Artifact | easy/100 | — | Photograph a unique yard detail on a neighborhood walk. | Yes | — |
| socal-08 | Extreme Shadows | medium/125 | — | Photograph long late-afternoon shadows. | Yes | — |
| socal-09 | The Park Oasis | easy/100 | — | Photograph a shady spot in a park. | Yes | — |
| socal-10 | Landmark Sighting | hard/200 | hard/150 | Photograph a specific local landmark (lighthouse, bridge, theater sign). | Yes | Label fits (rare and specific); points wrong — hard pays 150, and 200 sits above the scale entirely. |
| socal-11 | Cold Brew Trail | easy/100 | — | Photograph an iced coffee or cold drink from a local shop. | Yes | — |
| socal-12 | Beach Gear Archive | medium/125 | — | Photograph resting beach gear (umbrella, sandcastle, towel). | Yes | — |
| socal-13 | Local Signage Clue | medium/125 | — | Photograph unique neighborhood signage. | Yes | — |
| socal-14 | Boardwalk Souvenir | medium/125 | — | Photograph a local summer souvenir. | Yes | — |
| socal-15 | The Blanket Archive | medium/150 | easy/100 | Photograph a towel or blanket spread out for rest. | Yes | Judgment call: a blanket on grass/sand is one common thing nearby in summer — easy. Points also wrong for medium (125). Alternative: keep medium/125 if the intent is found-not-staged picnic scenes. |

### Heatwave (FT-01)

| ID | Title | Now | Proposed | Ask | Clear? | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| heatwave-01 | Heat Signature | medium/100 | easy/100 | Photograph something the summer changed. | **No** — "personally affected by summer" has no concrete referent. | Wording has no concrete thing to photograph. **Rewrite:** "Capture something the heat got to — wilted, faded, melted, or just sweating." |
| heatwave-02 | Shade Economy | easy/100 | — | Photograph a patch of shade nearby. | Yes | — |
| heatwave-03 | Color That Refused to Whisper | easy/100 | — | Photograph the loudest summer color nearby. | Yes | — |
| heatwave-04 | Plastic Kingdom | medium/100 | easy/100 | Photograph something plastic, shiny, or fake. | Yes | One common thing nearby — easy; the list defines the hunt. |
| heatwave-05 | Vacation Behavior Detected | medium/100 | easy/100 | Photograph vacation energy in a normal place. | **No** — "vacation energy" has no concrete referent. | **Rewrite:** "Capture vacation energy somewhere normal — sandals at the store, sunglasses indoors, a drink with an umbrella." |
| heatwave-06 | The Season Is Doing Too Much | medium/100 | easy/100 | Photograph the most summery thing nearby. | Yes | Flavor-heavy but actable; one photo nearby — easy. |
| heatwave-07 | Proof of Brief Existence | easy/100 | — | Photograph proof you were here. | Yes | — |
| heatwave-08 | Main Character Checkpoint | medium/100 | easy/100 | Photograph proof you entered a new chapter of the day. | **No** — "chapter" is undefined. | **Rewrite:** "Take one photo of the moment the day turned — a new place, a new plan, a new mood." |
| heatwave-09 | Field Selfie, Loosely Defined | easy/100 | — | Take a self-photo, no strict rules. | Yes | — |
| heatwave-10 | Current Personal Weather | medium/100 | easy/100 | Photograph your energy as a weather report. | **No** — a metaphor with no concrete referent. | **Rewrite:** "Show today like a weather report — sunny, stormy, foggy, or clear — with a photo of what feels like your mood." |
| heatwave-11 | Tiny Victory Receipt | easy/100 | — | Photograph proof of a small win today. | Yes | — |
| heatwave-12 | Crew Weather Advisory | medium/100 | easy/100 | Photograph the group's emotional forecast. | **No** — "emotional forecast" has no concrete referent. | Judgment call on difficulty (crew presence ≠ medium). **Rewrite:** "Capture the crew's mood right now — hyped, wiped, hangry, or unbothered." |
| heatwave-13 | Questionable But Loyal Formation | medium/100 | easy/100 | Photograph the crew exactly as assembled right now. | Yes | Judgment call: one photo of people nearby — easy; crew presence is the assumed context. |
| heatwave-14 | The Group Chat Would Understand | medium/100 | easy/100 | Photograph something only your crew would find funny. | Yes | Judgment call: needing crew-shared context doesn't make the photo harder. |
| heatwave-15 | Snack Council Minutes | medium/100 | easy/100 | Photograph what the group ordered, shared, or debated. | Yes | Judgment call: a shared meal moment is one common thing nearby. |
| heatwave-16 | Tiny Witness | easy/100 | — | Photograph a pet, plush, or object witnessing the day. | Yes | — |
| heatwave-17 | Side Quest Receipt | medium/100 | easy/100 | Photograph proof a quick stop became a side quest. | Mostly — "side quest" is gamer-familiar and the list defines it. | "Moment" wording is vague but actable; no rewrite proposed. Judgment call. |
| heatwave-18 | Emotional Support Beverage | easy/100 | — | Photograph the drink helping someone continue. | Yes | — |
| heatwave-19 | Bag of Consequences | medium/100 | easy/100 | Photograph something acquired, carried, or regretted. | Yes | One common thing nearby — easy. |
| heatwave-20 | Passenger Seat Prophecy | easy/100 | — | Photograph proof from the journey, not the destination. | Yes | — |
| heatwave-21 | The Quick Stop Lied | medium/100 | easy/100 | Photograph proof a quick stop became more than a quick stop. | Mostly — same as heatwave-17. | "Moment" wording is vague but actable; no rewrite proposed. Judgment call. |
| heatwave-22 | The Plot Has Thickened | medium/100 | easy/100 | Photograph the moment things got complicated. | Yes | The list defines the moments; one photo — easy. |
| heatwave-23 | This Was Not the Plan | medium/100 | easy/100 | Photograph proof the day changed direction. | Yes | One photo of a detour — easy. |
| heatwave-24 | Aftermath Exhibit A | easy/100 | — | Photograph what remains after the meal, errand, or hangout. | Yes | — |
| heatwave-25 | Add It to the Lore | medium/100 | easy/100 | Photograph anything from today worth remembering. | Yes | Any one photo — easy. |

### Jet Setter (FT-05)

| ID | Title | Now | Proposed | Ask | Clear? | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| jet-setter-01 | Vacation Behavior Detected | easy/100 | — | Photograph vacation-energy items (sandals, sunglasses, drinks). | Yes | — |
| jet-setter-02 | Resort Evidence | easy/100 | — | Photograph something resort-coded (towels, wristbands, cabanas). | Yes | — |
| jet-setter-03 | Pool Chair Politics | easy/100 | — | Photograph a pool/beach chair and shade setup. | Yes | — |
| jet-setter-04 | Blue Water Propaganda | easy/100 | — | Photograph blue water (ocean, pool, fountain). | Yes | — |
| jet-setter-05 | The Towel Economy | easy/100 | — | Photograph towels and fabric of vacation life. | Yes | — |
| jet-setter-06 | Sunset Department | easy/100 | — | Photograph sunset or sunrise light. | Yes | — |
| jet-setter-07 | Passport to Nowhere, Face Optional | easy/100 | — | Photograph proof you entered vacation mode (no travel documents). | Yes | — |
| jet-setter-08 | Beach Episode Unlocked | easy/100 | — | Photograph proof your beach episode started. | Mostly — "beach episode" is flavor for "first beach photo." | — |
| jet-setter-09 | SPF Witness Statement | easy/100 | — | Photograph sun-survival gear. | Yes | — |
| jet-setter-10 | Main Character at the Pool Bar | easy/100 | — | Photograph yourself as part of the vacation scene. | Yes | — |
| jet-setter-11 | Out-of-Office Alibi | easy/100 | — | Photograph proof you're unavailable and relaxing. | Yes | — |
| jet-setter-12 | Vacation Formation | easy/100 | — | Photograph your travel crew in formation. | Yes | — |
| jet-setter-13 | Snack Council: Vacation Session | easy/100 | — | Photograph a vacation food or drink decision. | Yes | — |
| jet-setter-14 | Group Chat on Island Time | easy/100 | — | Photograph something only your crew would find funny. | Yes | — |
| jet-setter-15 | Tiny Travel Witness | easy/100 | — | Photograph a pet, plush, or object witnessing the trip. | Yes | — |
| jet-setter-16 | The Lounging Committee | easy/100 | — | Photograph the crew resting or lounging. | Yes | — |
| jet-setter-17 | Luggage of Consequences | easy/100 | — | Photograph luggage and travel gear. | Yes | — |
| jet-setter-18 | Room Key to the Kingdom | easy/100 | — | Photograph your temporary vacation base (room, key card, balcony). | Yes | — |
| jet-setter-19 | Frozen Drink Documentation | easy/100 | — | Photograph a vacation drink. | Yes | — |
| jet-setter-20 | Souvenir Trap | easy/100 | — | Photograph a souvenir or shop find. | Yes | — |
| jet-setter-21 | Travel Snack Manifest | easy/100 | — | Photograph the snacks that traveled with you. | Yes | — |
| jet-setter-22 | The Itinerary Has Left the Chat | medium/100 | easy/100 | Photograph proof the vacation changed direction. | Yes | One photo of a detour; the list defines it — easy. |
| jet-setter-23 | Beach Day Aftermath | medium/100 | easy/100 | Photograph what remains after a beach or pool day. | Yes | Leftovers, one photo — easy. |
| jet-setter-24 | Postcard From the Plot | medium/100 | easy/100 | Photograph a postcard-worthy trip moment. | Yes | One photo — easy; "with more personality" is flavor, not a condition. |
| jet-setter-25 | Add It to the Vacation Lore | medium/100 | easy/100 | Photograph anything from the trip worth remembering. | Yes | Any one photo — easy. |

### Errand (FT-04)

| ID | Title | Now | Proposed | Ask | Clear? | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| errand-deck-01 | Aisle Oracle | easy/100 | — | Photograph something in a store aisle that feels like advice. | Mostly — quirky, but the aisle list defines the hunt. | — |
| errand-deck-02 | Parking Lot Ecology | easy/100 | — | Photograph a parking-lot or outside errand detail. | Yes | — |
| errand-deck-03 | Impulse Portal | easy/100 | — | Photograph the thing designed to make someone buy, grab, or snack. | Yes | — |
| errand-deck-04 | Errand Goblin Sighting | easy/100 | — | Photograph proof you personally entered the errand zone. | Mostly — "errand zone" is loose, but you know you're on an errand. | — |
| errand-deck-05 | One Thing, Allegedly | easy/100 | — | Photograph the thing you came for (or got instead). | Yes | — |
| errand-deck-06 | Checkout Face, Optional | easy/100 | — | Photograph the checkout moment. | Yes | — |
| errand-deck-07 | Errand Chaperone | easy/100 | — | Photograph whoever or whatever is accompanying the errand. | Yes | — |
| errand-deck-08 | Cart Council | easy/100 | — | Photograph the group decision moment. | Yes | — |
| errand-deck-09 | Waiting Area Weather | easy/100 | — | Photograph the emotional climate of waiting. | Mostly — the list of waiting places defines it. | — |
| errand-deck-10 | Bag of Consequences | easy/100 | — | Photograph something acquired, carried, or regretted. | Yes | — |
| errand-deck-11 | Receipt Archaeology | easy/100 | — | Photograph a receipt or transaction proof (no private info). | Yes | — |
| errand-deck-12 | Emotional Support Beverage | easy/100 | — | Photograph the drink helping someone through the errand. | Yes | — |
| errand-deck-13 | The Second Stop | easy/100 | — | Photograph proof the errand grew another errand. | Yes | — |
| errand-deck-14 | The Errand Fought Back | medium/100 | easy/100 | Photograph proof the errand got harder, stranger, or longer. | Yes | One photo of whatever went wrong; the list defines it — easy. |
| errand-deck-15 | Add It to the Errand Lore | medium/100 | easy/100 | Photograph anything from this errand worth remembering. | Yes | Any one photo — easy. |

## Applying this audit

- The machine-readable proposals live at `/tmp/rebalance-proposals.json`
  (27 entries; unchanged cards omitted). Applying them is a data-only
  change to the five bank files (difficulty + baseXP fields, plus the
  five Heatwave description/shortPrompt/mission rewrites).
- The five rewritten cards' Frankie plain copy in
  `src/data/plainCardCopy.ts` already says the clear version — check it
  still matches after the base text changes, rather than rewriting it.
- `src/__tests__/deckValidationGate.test.ts` pins the live award rule
  (max = the card's baseXP); the gate stays green under these proposals
  because baseXP values stay on the 100/125/150 scale — but the SoCal
  200 disappears, which is the point.
- The "Fieldtrip Decks — All Cards" spreadsheet can be regenerated from
  the banks with `scripts/regenerate-deck-sheet-rows.ts` after applying,
  the same way it was regenerated for the Texas voice-note change.
- Nothing in this audit touches scoring logic, the meter, or the receipt:
  the layered model (base + photo/note/location layers, multipliers on
  top) is unchanged; only which base value each card carries moves.
