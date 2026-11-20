# SoCal Summer deck — example photos

Every SoCal Summer card (`SoCal Summer`, socal-summer) carries a real example
photo in `public/assets/challenges/socal-XX.jpg`, wired in via the card's
`image` field in `src/data/socalSummerChallengeBank.ts`, the same way the
Texas, Heatwave, and Jet Setter decks got theirs. Cards with a photo show an
"Example photo" chip in the deck library and the card detail modal, so players
know it's a sample, not the target itself.

## Sources and licenses

All photos are from Wikimedia Commons and are freely licensed (CC BY, CC BY-SA,
CC0, or public domain). Attribution:

| Card | File | Source | License |
| --- | --- | --- | --- |
| socal-01 — Shoreline Signal | `socal-01.jpg` | [File:Breaking waves (Pacific Ocean shoreline at Heceta Head beach, Oregon, USA) 10.jpg](https://commons.wikimedia.org/wiki/File%3ABreaking_waves_%28Pacific_Ocean_shoreline_at_Heceta_Head_beach%2C_Oregon%2C_USA%29_10.jpg) | CC BY 2.0 |
| socal-02 — Palm Tree Paradise | `socal-02.jpg` | [File:Golden sunset with flying bird and palm trees silhouette at Rangamati.jpg](https://commons.wikimedia.org/wiki/File%3AGolden_sunset_with_flying_bird_and_palm_trees_silhouette_at_Rangamati.jpg) | CC BY-SA 4.0 |
| socal-03 — Boardwalk Snack | `socal-03.jpg` | [File:Ice cream cone at the beach.jpg](https://commons.wikimedia.org/wiki/File%3AIce_cream_cone_at_the_beach.jpg) | CC BY-SA 4.0 |
| socal-04 — Public Art Archive | `socal-04.jpg` | [File:A remarkable mural on a car park wall - geograph.org.uk - 7756456.jpg](https://commons.wikimedia.org/wiki/File%3AA_remarkable_mural_on_a_car_park_wall_-_geograph.org.uk_-_7756456.jpg) | CC BY-SA 2.0 |
| socal-05 — Golden Hour Glow | `socal-05.jpg` | [File:Colorful sky with orange and pink clouds reflecting in the water of a paddy field at dusk in Don Det Laos.jpg](https://commons.wikimedia.org/wiki/File%3AColorful_sky_with_orange_and_pink_clouds_reflecting_in_the_water_of_a_paddy_field_at_dusk_in_Don_Det_Laos.jpg) | CC BY-SA 4.0 |
| socal-06 — The Bike Path Scout | `socal-06.jpg` | [File:Beaches boardwalk and bike path (2481690050).jpg](https://commons.wikimedia.org/wiki/File%3ABeaches_boardwalk_and_bike_path_%282481690050%29.jpg) | CC BY 2.0 |
| socal-07 — Neighborhood Artifact | `socal-07.jpg` | [File:Battered Little Free Library on the Hill.jpg](https://commons.wikimedia.org/wiki/File%3ABattered_Little_Free_Library_on_the_Hill.jpg) | CC BY-SA 4.0 |
| socal-08 — Extreme Shadows | `socal-08.jpg` | [File:Sunset Beach - 016 (3468391204).jpg](https://commons.wikimedia.org/wiki/File%3ASunset_Beach_-_016_%283468391204%29.jpg) | CC BY 2.0 |
| socal-09 — The Park Oasis | `socal-09.jpg` | [File:People’s Park in Davao City (009).jpg](https://commons.wikimedia.org/wiki/File%3APeople%E2%80%99s_Park_in_Davao_City_%28009%29.jpg) | CC BY-SA 4.0 |
| socal-10 — Landmark Sighting | `socal-10.jpg` | [File:Lighthouse California-06499 - Point Arena Lighthouse (21719124282).jpg](https://commons.wikimedia.org/wiki/File%3ALighthouse_California-06499_-_Point_Arena_Lighthouse_%2821719124282%29.jpg) | CC BY-SA 2.0 |
| socal-11 — Cold Brew Trail | `socal-11.jpg` | [File:Chiang Mai, Thailand, Ice coffee.jpg](https://commons.wikimedia.org/wiki/File%3AChiang_Mai%2C_Thailand%2C_Ice_coffee.jpg) | CC BY 4.0 |
| socal-12 — Beach Gear Archive | `socal-12.jpg` | [File:Parasols, Evening, Beach, Rincon de la Victoria, Andalusia, Spain.jpg](https://commons.wikimedia.org/wiki/File%3AParasols%2C_Evening%2C_Beach%2C_Rincon_de_la_Victoria%2C_Andalusia%2C_Spain.jpg) | CC0 |
| socal-13 — Local Signage Clue | `socal-13.jpg` | [File:Equator coffees neon sign.jpg](https://commons.wikimedia.org/wiki/File%3AEquator_coffees_neon_sign.jpg) | CC0 |
| socal-14 — Boardwalk Souvenir | `socal-14.jpg` | [File:Board walk, a souvenir shop selling postcards is in the image (NBY 422406).jpg](https://commons.wikimedia.org/wiki/File%3ABoard_walk%2C_a_souvenir_shop_selling_postcards_is_in_the_image_%28NBY_422406%29.jpg) | Public domain |
| socal-15 — The Blanket Archive | `socal-15.jpg` | [File:Man and woman picnic under a tree next to a car (AM 77435-1).jpg](https://commons.wikimedia.org/wiki/File%3AMan_and_woman_picnic_under_a_tree_next_to_a_car_%28AM_77435-1%29.jpg) | CC BY 4.0 |

Per-card creator names live in `scripts/socal-example-photos-manifest.json`
(the `creator` field, alongside source URL, page, license, and bytes).

## How they were chosen

Each photo was checked by eye against the card's required subjects before wiring.
Six first picks failed that check and were replaced:

- The Bike Path Scout (06): the first pick was cyclists on the Los Angeles beach
  bike path, but the frame is dominated by a power plant and carries a film
  date stamp; replaced by a dedicated boardwalk bike path with cyclists.
- Extreme Shadows (08): four picks in a row failed. A telescope observatory
  building under construction whose long shadow was incidental; a night street
  scene whose long shadow falls under a streetlight, not late-afternoon sun; a
  busy Pattaya beachfront street at sunset whose "long evening shadows" are
  not the subject; and a backlit silhouette of a man and a rickshaw, which is
  a silhouette, not a shadow cast on a surface. The winner is a single long
  human shadow stretched across wet beach sand at low sun.
- Cold Brew Trail (11): the first pick was a sealed 85&deg;C Bakery Cafe cup shot
  from above — no ice and no iced coffee visible, it could be a hot drink;
  replaced by an iced coffee in a glass mug with ice and straws on a cafe table.

Two more swaps were quality upgrades, not subject failures: Landmark Sighting
(10) first used Pigeon Point Lighthouse small in the distance behind a painter
and was swapped for Point Arena Lighthouse filling the frame; The Bike Path
Scout's replacement above is also the cleaner of two usable shots.

The first Commons searches for Boardwalk Snack, Extreme Shadows, and Beach Gear
Archive returned nothing but scanned books and magazines (the search matches
the words, not the picture), so those cards needed narrower second-round
queries — see the QUERIES in `scripts/fetch-socal-example-photos.py`.

The judgment-call cards, noted here so the next pass can revisit them:

- Golden Hour Glow (05): the sky is the whole frame — orange, pink, and purple
  clouds at sunset — but the foreground is a flooded paddy field, not a SoCal
  beach. The card only requires the golden-hour sky.
- Extreme Shadows (08): the winning shadow falls on beach sand, not pavement;
  the shadow itself is the entire subject and extremely elongated.
- Landmark Sighting (10): Point Arena Lighthouse is in Northern California.
  The card lists "a lighthouse" as an example landmark, and any California
  lighthouse reads as the landmark.
- Boardwalk Souvenir (14): the photo itself is a vintage postcard (Wildwood, NJ
  boardwalk, c. 1900s) showing a boardwalk souvenir shop selling postcards —
  the card wants a postcard or souvenir, and this one is both. Precedent: Jet
  Setter's Postcard From the Plot is also a literal vintage postcard.
- The Blanket Archive (15): a 1940s black-and-white archival photo of a couple
  picnicking on a blanket on the grass — the picnic footprint is exactly the
  subject, vintage look and all.
- Shoreline Signal (01), Palm Tree Paradise (02), The Park Oasis (09), and
  Beach Gear Archive (12) are likewise not photographed in Southern California
  (Oregon coast, Bangladesh, Davao City, Spain); their subjects — the waterline,
  a palm silhouette, a shady park, resting beach umbrellas — are generic, and
  no SoCal-specific Commons photo of the same quality turned up.

Files were recompressed into the ~87–200 KB class of the earlier decks
(PIL, max width 1024, JPEG quality 78) — the deck adds ~2.9 MB total.
The outliers are the fine-detail shots that don't compress further without
visible loss: socal-07 (Little Free Library, 370 KB, quality 70) and
socal-08 (beach-sand shadow, 357 KB, quality 72); socal-01, socal-04,
socal-09, and socal-10 sit at 248–285 KB at quality 78 for the same reason.
socal-02 (74 KB) lands just under the band — a smooth sunset sky compresses
well, nothing wrong with the file.

To replace a photo: drop a new file in `public/assets/challenges/` and update the
card's `image` field in `src/data/socalSummerChallengeBank.ts` (or the manifest
entry). The gate test `src/__tests__/socalExamplePhotos.test.ts` fails if a
SoCal Summer card's photo is missing. The fetch script
`scripts/fetch-socal-example-photos.py` re-downloads from Commons with the
recorded queries (Wikimedia rate-limits hard — expect HTTP 429s on back-to-back
runs; the script retries. Note the script requests 1280px thumbs: 1024px is not
an allowed thumbor width and answers HTTP 400).
