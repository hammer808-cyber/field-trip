# Starter Signals — example photos

Every starter card (`Starter Signals`, deck `starter-signals`) carries a real
example photo in `public/assets/challenges/starter-N.jpg`, wired in via the
card's `image` field in `src/data/starterMissionBank.ts`, the same way the
Texas, Heatwave, and Jet Setter decks got theirs. Cards with a photo show an
"Example photo" chip in the deck library and the card detail modal, so players
know it's a sample, not the target itself. These are the first three missions
every new player sees, so the photos matter most here.

## Sources and licenses

All photos are from Wikimedia Commons and are freely licensed (CC BY, CC BY-SA,
CC0, or public domain). Attribution:

| Card | File | Source link | License |
| --- | --- | --- | --- |
| starter-1 — The Initial Signal | `starter-1.jpg` | [File:Sunflower with blue sky background.jpg](https://commons.wikimedia.org/wiki/File%3ASunflower_with_blue_sky_background.jpg) | Public domain |
| starter-2 — Snack Evidence | `starter-2.jpg` | [File:Slices of watermelon placed on a red tray at a summer gathering.jpg](https://commons.wikimedia.org/wiki/File%3ASlices_of_watermelon_placed_on_a_red_tray_at_a_summer_gathering.jpg) | CC BY 2.0 |
| starter-3 — Personal Oasis | `starter-3.jpg` | [File:Park Bench Ooty Botanical Garden (125298855).jpeg](https://commons.wikimedia.org/wiki/File%3APark_Bench_Ooty_Botanical_Garden_%28125298855%29.jpeg) | CC BY-SA 3.0 |

Per-card creator names live in `scripts/starter-example-photos-manifest.json`
(the `creator` field, alongside source URL, page, license, and bytes).

## How they were chosen

Each photo was checked by eye against the card's required subjects before wiring.
Two first picks failed that check and were replaced:

- Personal Oasis (starter-3): first pick was "Shady bench under an old tree"
  (geograph.org.uk) — the bench is under a tree, but the frame is dominated by
  a brick apartment block ("FLATS 13-28"), so it reads as a housing estate,
  not a cool shady retreat. Replaced with the Ooty Botanical Garden shot.
- Snack Evidence (starter-2): first pick was "Ice cream cone - Summer 2018" —
  a sprinkle-covered cone, clearly summer-coded, but the frame centers on a
  young girl holding it rather than the snack itself. Replaced with watermelon
  slices on a red tray: snack-only, unmistakably summer.

Judgment-call cards, noted here so the next pass can revisit them:

- Personal Oasis (starter-3) is a wide botanical-garden shot: a huge shady
  tree dominates the frame, with green benches visible underneath it. The
  oasis is the shade under the tree, and the benches are small in frame —
  it reads as "shady park" rather than a close-up of one bench.
- The Initial Signal (starter-1) is a sunflower against a striking blue sky —
  two of the card's three allowed subjects (vibrant flower, blue sky) in one
  frame.

Files were recompressed into the ~87–200 KB class of the earlier decks
(PIL, max width 1024, JPEG quality 78) — the deck adds ~420 KB total.
The one outlier is starter-3 (251 KB): fine detail (foliage, grass) doesn't
compress further without visible loss (quality 72 only reached 218 KB), so it
stays, within the fine-detail allowance used by Jet Setter. starter-2 was
saved at quality 85 (82 KB) because quality 78 came in at 64 KB, under the
target band.

## Replace instructions

To replace a photo: drop a new file in `public/assets/challenges/` and update
the card's `image` field in `src/data/starterMissionBank.ts`. The gate test
`src/__tests__/starterExamplePhotos.test.ts` fails if a starter card's photo
is missing. The fetch script `scripts/fetch-starter-example-photos.py`
re-downloads from Commons with the recorded queries (Wikimedia rate-limits
hard — expect HTTP 429s on back-to-back runs; the script retries).
