# Earn-audit fix #3 — trigger definitions for the 54 admin-grant stickers

Draft for Zach's red pen, Nov 20, 2026. Audit item #3: 54 of 105 stickers
can only be earned by an admin grant — nothing in play awards them.
This doc defines what should earn each one. Nothing here is built yet;
the definitions are the work, and the build follows Zach's call.

## Status

- Registry: 105 stickers. Earnable by playing today: **40** (36 from the
  audit + 4 milestone variants from fix #2b). Admin-grant-only: **54**.
  (The other 11 are the dead triggers from the audit: Voting 4 + Zines 2
  parked, challenge_approved's missing fallback, and friends — those are
  fixes #4 and #5, not this one.)
- If every proposal below lands: earnable goes to roughly **52 of 105**,
  with ~42 staying admin-grant by design (see "Stays admin-grant").
- Accomplice is NOT in the 54 — it is already wired to `crew_joined`.
  The audit's "qualifying" note on it is Q11 below.

## Mechanism key

What it costs to make a trigger real:

- **EXISTS** — the trigger already fires in the evaluator; wiring is a
  registry-only change (change the sticker's `awardTrigger`, update the
  tags, add a test). No evaluator work.
- **NEW RULE** — a new rule on data the evaluator can already see: the
  canonical snapshot (approved/submitted/needs-more/rejected challenge
  ids, per-deck approved counts, XP/level, last draw/submission times)
  plus the challenge catalog (deck, location tags). Evaluator work, no
  new instrumentation.
- **NEW INSTRUMENTATION** — the evaluator cannot see the data today: the
  submission's participation layers, the photo analysis result, crew
  membership, a streak history, a submission's hour. Needs new plumbing
  from the service that owns the data into the evaluator, plus tests.
- **STAYS ADMIN** — no mechanical reading that isn't forced. The admin
  grant is the right tool: Zach awards it when the moment happens.

## The trigger vocabulary today

15 triggers fire (or could): `starter_pack`, `first_submission`,
`first_approval`, `field_note_added`, `photo_proof_added`,
`challenge_approved`, `weekly_vote_cast`, `weekly_winner`,
`crew_joined`, `crew_created`, `zine_page_added`,
`archetype_milestone`, `season_milestone`, `mission_count_milestone`,
`level_up`. Stage 6 (planned, not built) already names four more:
`location_verified`, `chaos_modifier_applied`,
`late_night_submission`, `new_destination`. This draft reuses the
Stage 6 names where they fit, instead of inventing new ones.

## FIRST OFFENSES (4) — cross-pack achievement

| Sticker | Reason as written | Proposed trigger | Mechanism |
|---|---|---|---|
| Scene Starter | start your first mission | `first_submission` — stacks with Fresh Meat on the first submit | EXISTS |
| The Instigator | kick off your first mission or group action | `crew_created` — stacks with Whistle Lanyard on creating a crew | EXISTS |
| Outside Person | complete your first location-based adventure | `location_verified` (Stage 6 name) — first approved proof on a location-tagged or location-required mission | NEW RULE |
| Certified Menace | your first Chaos achievement | first chaos-collection sticker earned (meta — needs the Chaos pack mechanized first) | NEW RULE |

Notes: Scene Starter and The Instigator both stack a second sticker onto
an event that already awards one — that is the FIRST OFFENSES series
being the firsts series, but it means a first submit hands out Fresh
Meat + Scene Starter (+ the archetype first_submission variant). Q2/Q3
ask whether Zach wants the stacking or a separate moment. Certified
Menace is circular until at least one Chaos sticker is earnable — Q5.

## On a Roll (1) — chaos

| Sticker | Proposed trigger | Mechanism |
|---|---|---|
| On a Roll | streak of approved proofs on consecutive days | NEW INSTRUMENTATION |

The snapshot carries only `lastSubmissionAt` — no streak history. A
streak rule needs the approval history plumbed in. Proposed: **3
approved proofs on 3 consecutive days**, and rarity **common → rare**
(a streak is a real achievement; a common streak sticker undersells
it). Q1 is the streak length, what counts (approvals vs submissions),
and the rarity call.

## Side Quests (11) — cross-pack

| Sticker | Reason as written | Proposed trigger | Mechanism |
|---|---|---|---|
| Retail Therapy | a little retail therapy on the road | `first_approval` as Mall Rat — becomes the Mall Rat first-approval variant (Mall Rat has none today; the default Checkmark Seal fires instead) | EXISTS |
| Snack Attack | a snack stop becomes the adventure | stays admin — no food tag exists in the catalog, no honest mechanical reading | STAYS ADMIN |
| Detour | taking the detour instead of the highway | first approval on a deck different from the previous approval's deck | NEW RULE |
| Night Owl | staying out past dark | `late_night_submission` (Stage 6 name) — submission 9 PM–midnight local | NEW INSTRUMENTATION |
| Hidden Gem | finding a hidden gem off the main road | first approval where the photo subject matched the AI analysis | NEW INSTRUMENTATION |
| Good Company | good company on the road | `crew_joined` — stacks with Accomplice on joining a crew | EXISTS |
| Roadside Weird | stopping at the weird roadside thing | first approval on a Texas-deck mission (the road-trip deck) | NEW RULE |
| Full Send | going full send | first approval with all three participation layers (photo match + real note + captured location) | NEW INSTRUMENTATION |
| After Hours | the after-hours adventure | `late_night_submission` — submission midnight–5 AM local (the other half of the night from Night Owl) | NEW INSTRUMENTATION |
| Plot Twist | the plan takes a plot twist | first approval of a mission that was sent back for more proof and then passed (repair → approval) | NEW RULE |
| Sasquatch Sighting | spotting Sasquatch in the wild | stays admin — or becomes Bigfoot's `first_approval` variant (registry change: give it archetype `bigfoot`; as a cross-pack sticker it would fire on every first approval, which is wrong) | STAYS ADMIN (Q8) |

Notes: Detour's reading is the weakest in this group — "a different
deck than last time" is a real observable but a stretch of the word.
Hidden Gem leans on the photo analysis the evaluator cannot see today.
Snack Attack has no reading at all without a food tag nobody asked for.

## The 28 pack stickers — the real question

Mall Rat 8 (Mascot, Bag Lounge, Food Court Feast, Shopping Cart Haul,
Chunky Sneaker, Mirror Selfie, Mall Arcade, Pretzel and Iced Coffee),
Elondra 10 (Neon Cactus Cooler, Starstruck Sunglasses, Bedazzled Phone,
Art Kit, Platform Loafers, Cosmic Charm Bracelet, Center Stage
Microphone, Glamour Kit, Cosmic Shopping Bags, Desert Alien Encounter),
Captain Clipboard 10 (Cat Eye Glasses, Rule Enforcer Gavel, Chess
Queen, Sideline Megaphone, Color Coded Organizer, Velvet Rope
Checkpoint, Perfect Lunchbox, Minivan Keychain, Rules Stamp, Precision
Measuring Tape).

26 of the 28 are scene/wardrobe flavor with no mechanical reading: a
phone, loafers, a lunchbox, a keychain. There is no honest one-to-one
trigger for "packing it perfectly" or "keeping the keys to the
kingdom." The options are:

- **A. Per-archetype count ladder** (NEW RULE): archetype approvals at
  10 / 15 / 20 / 25… hand the pack out in display order. 28 stickers
  need 28 rungs; most players never reach 20+ approvals as one
  archetype, so the tail of each pack stays unwon for almost everyone.
- **B. Deck-completion loot** (NEW RULE): each deck completion awards
  the next unowned sticker from the player's archetype pack, in
  displayOrder. Six decks exist, so at most 6 per player — the packs
  stay mostly unwon.
- **C. Stay admin-grant** (STAYS ADMIN): the packs were shipped as a
  collection to grant, not to earn. Zach awards them for mall / glam /
  clipboard moments. The audit's premise — unearnable is a problem —
  may not apply to a collection designed for granting.
- **D. Mix**: mechanize the ones with a real reading, grant the rest.

The one pack sticker with a real reading is Desert Alien Encounter
("a close encounter in the desert"): first approval on a mission
tagged to a desert state — but no desert tag exists in the catalog
today, so it is NEW RULE + a catalog tag (Q10), or it stays admin.

Recommendation: **D** — Desert Alien Encounter gets its rule if Zach
wants the desert tag; the other 27 stay admin-grant unless he picks A
or B. Q9 is the call.

## Chaos (10, excluding On a Roll)

Runaway Cart, Roller Skate, Backpack Heist, Vending Machine, Melting
Cone, Disco Explosion, Crayon Campfire, Punk Moon, Confused Signpost,
Cosmic Payphone — **all stay admin-grant**. They are moment/joke
stickers; forcing a mechanical trigger onto "melting down in the best
way" or "howling at the punk moon" would be worse than the grant. The
future mechanization path is Stage 6's `chaos_modifier_applied`, if
chaos modifiers ever ship — not this fix.

## Stays admin-grant (by design)

Snack Attack, Sasquatch Sighting (unless Q8 goes the other way), the
10 Chaos stickers above, and 27 of the 28 pack stickers (unless Q9
picks the ladder or the loot). That is ~39 stickers whose grant is the
feature, not a gap. The admin-grant path stays for all of them — and
for anything Zach wants to hand out by hand.

## Open questions (Zach only)

- **Q1 — On a Roll:** streak length (3 / 5 / 7 days)? Approvals or
  submissions? Rarity common → rare?
- **Q2 — Scene Starter:** stack on `first_submission` with Fresh Meat,
  or a new `first_draw` event (draw-time call site, more build)?
- **Q3 — The Instigator:** `crew_created` with Whistle Lanyard, or
  `first_submission`?
- **Q4 — Outside Person:** location-tagged missions only, or any proof
  with a captured GPS?
- **Q5 — Certified Menace:** what counts as "Chaos" in play? First
  chaos-collection sticker, or wait for chaos modifiers?
- **Q6 — Night Owl vs After Hours:** split the night 9 PM–midnight /
  midnight–5 AM, or different windows?
- **Q7 — Detour / Hidden Gem / Roadside Weird:** accept the proposed
  readings, or do these stay admin too?
- **Q8 — Sasquatch Sighting:** stays admin, or becomes Bigfoot's
  `first_approval` variant?
- **Q9 — The 28 pack stickers:** ladder (A), loot (B), stay admin (C),
  or mix (D)?
- **Q10 — Desert Alien Encounter:** add a desert-state tag and a rule,
  or stays admin?
- **Q11 — Accomplice "qualifying":** it is wired to `crew_joined`
  today — does Zach want a bar on what counts as a qualifying join
  (e.g. crew still exists a week later), or is any join enough?

## Build order (after Zach's call)

1. EXISTS group (registry-only): Scene Starter, The Instigator,
   Retail Therapy, Good Company — plus whatever Q7/Q8 approves.
2. NEW RULE group: Outside Person, Certified Menace, Detour, Roadside
   Weird, Plot Twist — plus Desert Alien Encounter if Q10 says yes.
3. NEW INSTRUMENTATION group: On a Roll, Night Owl, After Hours,
   Hidden Gem, Full Send — each needs its data plumbed into the
   evaluator first; these are the expensive ones.
4. The ladder/loot, if Q9 picks one — a design of its own, not a
   follow-on.

## Outcome — Zach's calls, built Nov 20, 2026

Zach's red pen (Nov 20, 10:10 AM) and his "Build all and q7 and chaos
as your suggestion" (10:22 AM). What shipped, per question:

- **Q1 — On a Roll: 5 days in a row** (approvals; the draft's rare
  taken as the default, flagged to Zach, unconfirmed). New
  `approval_streak` count rule, threshold 5, catch-up; the streak is
  maintained by the server in the approve transaction
  (`approvalStreakDays` + `approvalStreakLastDay`, UTC days) and carried
  into the admin path's snapshot. Rarity common → rare.
- **Q2 — Scene Starter: separate `first_draw` event.** The hook lives
  inside `drawTrip` in `AppContext.tsx` (both callers covered — Deck
  and DeckLibrary), firing at the three new-draw returns; the
  Missions page itself is untouched except the freeze-comment lift
  note in `Deck.tsx`.
- **Q3 — The Instigator: `crew_created`, stacks with Whistle Lanyard.**
- **Q4 — Outside Person: location-tagged missions only** (new
  `location_verified` trigger, awarded in the approval bundle when the
  approved mission carries a location tag; stacks with Roadside Weird
  + Texas Y'all 01 on a first Texas approval, since only Texas
  missions carry tags today).
- **Q5 — Chaos: all 10 stay admin-grant, each with a written grant
  moment** in its unlockReason. **Certified Menace fires automatically
  the first time any Chaos sticker is granted** (server-side, inside
  `grantStickerServer`, best-effort in its own transaction; already-owned
  is a no-op, so a player who already holds a Chaos sticker earns it on
  their next Chaos grant). The Melting Cone comeback experiment was
  offered only conditionally and was NOT picked — not built.
- **Q6 — Night Owl / After Hours: windows as drafted (9 PM–midnight /
  midnight–5 AM).** New `late_night_submission` trigger with
  `hourWindow` on the stickers; the submitting device's local hour is
  passed at the submit call site in `AppContext.addEntry`. No hour, no
  award.
- **Q7 — Roadside Weird: first Texas approval** (deck-scoped
  `first_approval`; stacks with Texas Y'all 01). **Detour and Hidden
  Gem stay admin** (the readings are stretches — Detour fires trivially
  on the second approval; Hidden Gem needs photo-analysis plumbing).
- **Q8 — Sasquatch Sighting: Bigfoot's `first_approval` variant**
  (archetype cross-pack → bigfoot; replaces the Checkmark Seal default
  for Bigfoot).
- **Q9 — mix (D).** Desert Alien Encounter got its rule (Q10); the
  other 27 pack stickers stay admin-grant.
- **Q10 — Desert Alien Encounter: desert-state tag + rule** (new
  `desert_state_approval`; `LocationTag` widened with `DesertState =
  'AZ' | 'NV' | 'NM' | 'UT'`). No desert-state mission exists yet —
  only Texas missions carry state tags — so the rule is built but
  cannot fire until one does.
- **Q11 — Accomplice: a bar — the crew must still exist a week after
  it was created** (`crew_survived_week`). Mechanism change from the
  draft's "daily server job": the codebase's only cron schedule is
  disabled (see `server.ts`), so the check is lazy and client-side in
  `crewService` — at membership reconciliation (Crew page load) and on
  both join paths, reading the crew's `createdAt` fresh. Joining an
  already-old crew qualifies at once; a new crew qualifies on the next
  check after it turns a week old. The unlock dedupes re-checks.

Registry after the build: 118 stickers (no new ones). Earnable by
playing: **64 of 118** (was 56). Admin-grant-only: **42** (was 51).
Dead triggers (Voting/Zines, fix #5 territory): 11. Rule built, no live
path: 1 (Desert Alien Encounter). Trigger-pending tags: 41.

New triggers (23 total): `first_draw`, `location_verified`,
`late_night_submission`, `desert_state_approval`, `approval_streak`,
`crew_survived_week`. All six are in `firestore.rules`
`isValidStickerTrigger` (repo file — needs Zach's second publish;
see the rules note in MEMORY.md).

Tests: `src/__tests__/earnAuditFix3Remainder.test.ts` (20 tests) +
pin updates in firstOffenses, sideQuests, chaosPack, elondraPack,
stickerCollections, stickerMachine, stickerEvaluator, earnAuditFix3,
challengeApprovedVariants, milestoneStickers. Suite: 1064 tests /
997 pass / 67 fail = the pre-existing emulator-dependent baseline.
