# Texas deck example photos

Every Texas card (`Get It, Y'all`, FT-06) carries a real example photo in
`public/assets/challenges/texas-XX.jpg`, wired in via the card's `image` field.
`getMissionImage` returns the photo when one is supplied and falls back to the
generated badge art otherwise. Cards with a photo show an "Example photo" chip
in the deck library and the card detail modal, so players know it's a sample,
not the target itself.

## Sources and licenses

All photos are from Wikimedia Commons and are freely licensed. Attribution:

| Card | File | Source | License |
| --- | --- | --- | --- |
| texas-01 — Lone Star Sky | `texas-01.jpg` | [File:2019-07-21 20 32 05 Sky just after sunset along Katy Mills Parkway in Katy, Fort Bend County, Texas.jpg](https://commons.wikimedia.org/wiki/File%3A2019-07-21_20_32_05_Sky_just_after_sunset_along_Katy_Mills_Parkway_in_Katy%2C_Fort_Bend_County%2C_Texas.jpg) | CC BY-SA 4.0 |
| texas-02 — Taco Truck Stop | `texas-02.jpg` | [File:Cuantos Tacos.jpg](https://commons.wikimedia.org/wiki/File%3ACuantos_Tacos.jpg) | CC BY-SA 4.0 |
| texas-03 — Boots on the Ground | `texas-03.jpg` | [File:Boots at Boot Barn - September 2023 - Sarah Stierch 02.jpg](https://commons.wikimedia.org/wiki/File%3ABoots_at_Boot_Barn_-_September_2023_-_Sarah_Stierch_02.jpg) | CC BY 4.0 |
| texas-04 — Bluebonnet Patch | `texas-04.jpg` | [File:A Texas bluebonnet at late afternoon.jpg](https://commons.wikimedia.org/wiki/File%3AA_Texas_bluebonnet_at_late_afternoon.jpg) | CC BY 4.0 |
| texas-05 — Y'all Means All | `texas-05.jpg` | [File:Bratz Y'all New Orleans Dec 2017 02.jpg](https://commons.wikimedia.org/wiki/File%3ABratz_Y%27all_New_Orleans_Dec_2017_02.jpg) | CC BY-SA 4.0 |
| texas-06 — Brisket Smoke | `texas-06.jpg` | [File:Beer garden barbecue grill at the The Queen's Head, Boreham, Essex, England.jpg](https://commons.wikimedia.org/wiki/File%3ABeer_garden_barbecue_grill_at_the_The_Queen%27s_Head%2C_Boreham%2C_Essex%2C_England.jpg) | CC BY-SA 4.0 |
| texas-07 — Two-Step Floor | `texas-07.jpg` | [File:Floore store 2012.jpg](https://commons.wikimedia.org/wiki/File%3AFloore_store_2012.jpg) | CC BY 4.0 |
| texas-08 — Longhorn Lookout | `texas-08.jpg` | [File:2021-08-21 Montgomery County Agricultural Fair Texas Longhorn.jpg](https://commons.wikimedia.org/wiki/File%3A2021-08-21_Montgomery_County_Agricultural_Fair_Texas_Longhorn.jpg) | CC BY 4.0 |
| texas-09 — Whataburger Run | `texas-09.jpg` | [File:Whataburger-Frisco.jpg](https://commons.wikimedia.org/wiki/File%3AWhataburger-Frisco.jpg) | CC BY-SA 3.0 |
| texas-10 — Lone Star Flag | `texas-10.jpg` | [File:A trailer, or RV, park with U.S. and Texas flags a-flying in Carrizo Springs, Texas LCCN2014630586.tif](https://commons.wikimedia.org/wiki/File%3AA_trailer%2C_or_RV%2C_park_with_U.S._and_Texas_flags_a-flying_in_Carrizo_Springs%2C_Texas_LCCN2014630586.tif) | Public domain |
| texas-11 — Swimming Hole | `texas-11.jpg` | [File:360 Barton Springs 5July08 (9).JPG](https://commons.wikimedia.org/wiki/File%3A360_Barton_Springs_5July08_%289%29.JPG) | Public domain |
| texas-12 — Friday Night Lights | `texas-12.jpg` | [File:Celina High School, Friday Night Football.jpg](https://commons.wikimedia.org/wiki/File%3ACelina_High_School%2C_Friday_Night_Football.jpg) | CC BY-SA 4.0 |
| texas-13 — Big Bend Blues | `texas-13.jpg` | [File:Big Bend Chihuahuan Desert.jpg](https://commons.wikimedia.org/wiki/File%3ABig_Bend_Chihuahuan_Desert.jpg) | CC BY-SA 3.0 |
| texas-14 — Kolache Run | `texas-14.jpg` | [File:Boudin kolaches at Lickin' Good Donuts, Winnsboro, Louisiana.jpg](https://commons.wikimedia.org/wiki/File%3ABoudin_kolaches_at_Lickin%27_Good_Donuts%2C_Winnsboro%2C_Louisiana.jpg) | CC BY 2.0 |
| texas-15 — Don't Mess With Texas | `texas-15.jpg` | [File:'Don't Mess With Texas' garbage can - panoramio.jpg](https://commons.wikimedia.org/wiki/File%3A%27Don%27t_Mess_With_Texas%27_garbage_can_-_panoramio.jpg) | CC BY-SA 3.0 |

## How they were chosen

Each photo was checked by eye against the card's required subjects before wiring.
Three first picks failed that check and were replaced: a scanned 1968 document
for Brisket Smoke, a "Welcome to Boling" sign with no "y'all" for Y'all Means All,
and a giant green flag that wasn't the Texas flag for Lone Star Flag.

To replace a photo: drop a new file in `public/assets/challenges/` and update the
card's `image` field in `src/data/texasChallengeBank.ts`. The gate test
`src/__tests__/texasExamplePhotos.test.ts` fails if a Texas card's photo is missing.
The fetch script `scripts/fetch-texas-example-photos.py` re-downloads from Commons
with the recorded queries (Openverse was bot-blocked from this machine).

## Next decks

The same pattern extends to any deck: add an `image` field to the card, drop the
file in `public/assets/challenges/`, and the photo shows everywhere the card art
renders (library, detail modal, capture flow) with the "Example photo" chip where
the surface shows it. Record the source and license here.
