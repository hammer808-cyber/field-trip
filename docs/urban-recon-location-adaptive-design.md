# Urban Recon — location-adaptive deck (SPEC)

Status: SPEC — draft for Zach's red pen, not approved for build. Date: Nov 21, 2026. Decisions Nov 21: provider Google Places (key done), radii 5/15/35, deck size 20, template Action + Place + Token.

## What it is

Urban Recon becomes the first location-adaptive deck: generic card
skeletons that resolve to a real place where the player actually is. The
deck already exists as a shell in code (`urban-recon`, "Urban Recon",
"Future drop. Tactical navigation of the concrete jungle.", theme
diamond, catalog section `local-fieldtrips`) with **zero missions**
(`missionIds: []`) and a deck-completion sticker already in the registry
(`deck-urban-recon`, URBAN RECON). This spec fills that shell.

The deck is evergreen. Per the seasons decision (Nov 21, 2026),
location decks (SoCal, Texas) never lock; Urban Recon is the same — it
never locks, it just resolves differently wherever you are.

The standing constraint holds: no new reward engine. Sticker awards,
the deck-completion sticker, XP layers, and triggers all run through
the existing centralized collectible system.

## How a card works

Every card is a skeleton with three parts — **Action + Place +
Token**:

- **Action:** the verb — what you do (grab, photograph, find,
  order, climb, taste).
- **Place:** the slot the resolver fills with a real named place
  near the player.
- **Token:** the memorable thing — what you take away, find, or
  notice, and what the photo/note has to show. The token is the
  proof subject: it is what makes the card stick in memory instead
  of reading like a generic "photograph a building." The place is
  resolved by the API; the token is found on site.

His example, as a card: "Grab a specialty drink at {taco truck}
with some friends." Action: grab a specialty drink. Place: the
taco truck. Token: the drink itself (and the truck's name in the
shot). The "with some friends" is crew flavor — some cards are
crew-friendly, not all.

At draw time the app resolves `{place}` to a real place near the
player and the card renders concrete: "Photograph the holiday lights
on the Long Beach Terrace Theater." The resolved place (name +
coordinates) is stored on the drawn card record, so a refresh keeps
it and the entry carries it into review. If resolution fails for any
reason — no GPS, no match, no signal — the card renders its generic
default instead (see Fallback ladder). Location is an enhancement,
never a gate: a card always renders and is always submittable.

Base rule, unchanged: every card is photo + field note. Proof types
are flavors on top, not substitutes.

## The resolver

Runs once, at draw time. Four steps:

1. **GPS, one-shot.** Same posture as Near You (Nov 20, 2026):
   `getCurrentPosition` on draw, in-memory only, no coordinates stored
   except the resolved place on the entry (see Privacy).
2. **Reverse-geocode.** Turns the coordinates into address parts:
   neighbourhood, city/town, county. This is what makes the fallback
   ladder administrative instead of guesswork.
3. **Tiered place search.** Search for the skeleton's place type
   inside the tier radii below. First tier with a match wins; the
   match's name fills the slot. The tier also sets the label the
   player sees: "near you in {neighbourhood}", "in {city}", or
   "in {county}". A skeleton's `placeQuery` may pair a type with a
   keyword (e.g. type `restaurant` + keyword `taco truck`) where no
   Places type fits the place.
4. **Store the resolution.** Entry carries `resolvedPlace: { name,
   placeId, lat, lng, tier }`. Admin review shows it; the photo check
   verifies against it; the location layer pays on it.

### Radius tiers (recommendation)

Cities are not circles, so there is no single "city radius." Three
search tiers instead — **decided Nov 21: 5 / 15 / 35 miles.**

| Tier | Radius | Meaning |
| ---- | ------ | ------- |
| 1 — neighbourhood | 5 miles | The neighbourhood and nearby — a short drive or a long bike ride. Dense cities resolve here. |
| 2 — city | 15 miles | Covers most cities proper. Suburbs usually resolve here. |
| 3 — county / metro | 35 miles | The metro net. From Long Beach this reaches across LA/OC; from a small town it reaches the next town over. |

A skeleton may override the tiers (a "tallest building" card can start
at Tier 2; a "corner store" card never needs Tier 3). The radii are
config on the skeleton, not hard-coded in the resolver.

### Fallback ladder

Exactly this order, no exceptions:

1. Tier 1 match (5 mi) → named place, "near you in {neighbourhood}".
2. Tier 2 match (15 mi) → named place, "in {city}".
3. Tier 3 match (35 mi) → named place, "in {county}".
4. **No match anywhere → the generic default.** The skeleton's
   generic noun, written to be completable anywhere: "find lights
   decorating a building" instead of "the town hall." The card never
   names a place it could not find, and never blocks.

Suburbs work the way he described: the search broadens outward —
neighbourhood, then city, then county — and the label says which level
it landed on, so the player always knows how far the net went.

## Provider

**DECIDED Nov 21, 2026: Google Places API (new) — key set up by Zach.**

- **Primary: Google Places Nearby Search (new).** Best
  coverage of named civic places (city hall, library, market) and
  clean display names, which matters because the name goes on the
  card. Env var on Render: `GOOGLE_PLACES_API_KEY`, same class of
  secret as the Gemini key (`GEMINI_API_KEY`). Cost is roughly cents
  per search; at beta scale the bill is effectively zero.
- **Key restrictions (his setup, Nov 21):** API-restricted to
  Places API (New) + Geocoding API; server-side key, so the
  application restriction is IP addresses (Render outbound IPs),
  NOT HTTP referrers — a referrer restriction would break server
  calls, which send no referrer. Never in the repo or client code.
- **Documented alternative: OpenStreetMap (Nominatim for
  reverse-geocode + Overpass for place search).** Free, no key.
  Coverage is good in big cities and thinner in small towns, and
  niche place types are spottier. The generic-default fallback is
  what makes this safe to use — thin coverage degrades to generic
  cards, never to errors.

The resolver is written provider-neutral: a skeleton declares a
`placeQuery` (`googleType` + `osmTags`), and the provider is a
config choice at build time, not a rewrite.

## Skeleton catalog (20 — deck size decided Nov 21, 2026)

XP follows the house ladder: easy 100, medium 125, hard 175.

### Easy (100 XP)

| # | Title | Action | Place (slot) | Token | Generic default |
| - | ----- | ------ | ------------ | ----- | --------------- |
| 1 | City Hall Steps | Stand on the steps | {city hall} | the plaque or lettering with the building's name | a civic building |
| 2 | Lights on a Building | Photograph the lights | {landmark building} | the brightest single display | lights on a building |
| 3 | Market Morning | Buy one thing | {farmers market} | the thing you bought | a market stall |
| 4 | Library Card | Hold up the book you picked | {public library} | the book itself | a library |
| 5 | Transit Rush | Catch the rush | — (no slot; any stop) | the departure board at its peak | a transit stop |
| 6 | Mural Hunt | Find it yourself | — (no slot) | the mural's hidden signature or smallest detail | a mural |
| 7 | Park Bench View | Sit and look | {park} | the view from the bench | a park bench |
| 8 | Corner Store Run | Buy the house specialty | {corner store} | the thing it sells best | a corner store |
| 9 | Waterfront Walk | Walk to the water at golden hour | {waterfront} | the light on the water | any water you can find, even a fountain |
| 10 | Crosswalk Rush | Cross with the crowd | {downtown} | the busiest crossing | a busy crosswalk |

### Medium (125 XP)

| # | Title | Action | Place (slot) | Token | Generic default |
| - | ----- | ------ | ------------ | ----- | --------------- |
| 11 | Tallest View | Get to the top | {tallest building} | the highest view you can get | the highest view you can get |
| 12 | Night Market Bite | Eat one thing after dark | {night market / food hall} | the dish | street food at night |
| 13 | Hidden Staircase | Climb it | {park} | the staircase most people walk past | a public staircase |
| 14 | Taco Truck Run | Grab a specialty drink, with friends | {taco truck} | the drink + the truck's name | a food truck |
| 15 | Oldest on the Menu | Order the oldest dish | {diner} | the dish | the oldest place you can find |
| 16 | Postcard Home | Buy a postcard | {gift shop} | the postcard | a souvenir |
| 17 | Busker's Encore | Tip a street performer | {transit plaza} | the song they played | a street performer |

### Hard (175 XP)

| # | Title | Action | Place (slot) | Token | Generic default |
| - | ----- | ------ | ------------ | ----- | --------------- |
| 18 | Lights After Dark | Photograph after dark | {landmark} | the lights | lights on a building after dark |
| 19 | Postcard Shot | Frame the shot | {top-rated attraction} | the view the city is known for | the place your city is most known for |
| 20 | Sunrise First Light | Be there at sunrise | {landmark / waterfront} | first light hitting it | sunrise on a landmark |

Notes on the catalog:

- **Exact vs any:** the resolver names one place when the specific
  place is the point (city hall, landmark, market, library). When
  the place is a commodity and the token is the point, the card is
  unslotted and any instance counts — Transit Rush (any stop; Places
  has no ridership data, so "busiest" is unknowable, and the nearest
  stop is usually two blocks away anyway) and Mural Hunt (find it
  yourself). Unslotted cards pay the location layer the same way
  generic-default cards do (same city/county as the draw).
- **#9's generic default is the model for all of them.** A
  landlocked city has no waterfront, so the default has to be
  completable anywhere: "any water you can find, even a fountain."
  Every generic default in the table passes that test.
- **#14 Taco Truck Run is his example, verbatim shape** — and the
  deck's crew-friendly anchor: the token (the drink) is easy to
  share, and the card reads "with some friends." #12 Night Market
  Bite is crew-friendly too.
- **#18 combines the two newest mechanics:** a `timeWindow`
  (6 PM–6 AM, the Lights After Dark pattern from the winter deck)
  plus a location slot. A card can carry both. **#20 adds a second
  window:** sunrise, 5–8 AM.
- **#19 is the "if you know, you know" hard card:** the resolver
  picks the top-rated tourist attraction nearby, which is a different
  kind of hard — not effort, but knowing your city.
- **The token is the proof subject.** The photo check verifies
  against the token + the resolved place name, so "the drink" and
  "the truck's name" are what the reviewer looks for, not just "a
  taco truck somewhere."

## Verification (how it stays honest)

- **Photo check:** verifies against the token plus the resolved
  place name (the token is the proof subject — see Notes on the
  catalog), same as the Texas deck verifies against its subjects. A
  generic-default card checks against the generic noun.
- **Location layer:** pays (+25%, same as Texas) when the submission
  GPS is within the tier radius that produced the match. A
  generic-default card pays the layer when the GPS is anywhere in
  the same city/county as the draw — the layer rewards "you went
  out," not "you found the exact door."
- **Admin review:** sees the resolved place (name, tier, distance)
  on the entry, so a reviewer can tell at a glance whether the photo
  matches the place the card named.
- **No new triggers.** Awards run through the existing evaluator
  (first approval, deck completion, archetype milestones). The
  deck-completion sticker `deck-urban-recon` already exists.

## Privacy

Same posture as Near You: GPS is one-shot at draw, in-memory only.
The only location stored is the resolved place (name + coordinates)
on the entry — the same thing location-tagged missions already store.
No track, no history, no home location saved.

## Composes with

- **Time windows:** hard cards can carry `timeWindow` + a slot (#14).
- **Crew layer:** crew-friendly skeletons pay the +25% crew layer
  when submitted as a crew, same as the winter deck rule.
- **Seasons calendar:** evergreen, never locks. The resolver is
  season-blind; a winter skeleton and a summer skeleton resolve the
  same way.
- **Near You:** Urban Recon has no `homeRegion` bbox (it is
  everywhere by definition), so it never needs a Near You boost —
  it IS the near-you deck.

## Test plan

- **Grand Prairie, Nov 21–24 (his Texas trip):** the same skeleton
  resolves to Dallas-area places. Draw City Hall Steps there and it
  should name a Dallas-area city hall, not a Long Beach one.
- **Long Beach (home):** the same skeleton resolves to Long Beach
  places. Same card, two cities, two answers — that is the demo.
- **No-match case:** a rural draw, or GPS denied, must render the
  generic default with no error and no block. This is the case to
  watch, because it is the one the player will actually hit.

## Open questions for Zach

1. **Radii:** ~~3 / 10 / 25 miles~~ DECIDED Nov 21 — 5 / 15 / 35.
2. **Provider:** ~~Google Places primary (recommended) or OSM-only?~~ DECIDED Nov 21 — Google Places API, key done.
3. **Deck size:** ~~15 to start, or go straight to 20 like winter?~~ DECIDED Nov 21 — 20.
4. **The skeleton list:** red pen on the 20 — which stay, which go,
   what is missing? (His call on the mix of slotted vs unslotted, and on the Action + Place + Token template.)
5. **Marquee-city hand variants:** default is no — the resolver
   covers it. Say the word if a specific city deserves a hand-written
   card anyway (e.g., a Rockefeller tree card that only ever resolves
   in New York).
