# Example photos

Every card in the Texas and Heatwave decks carries a real example
photo. This file records where each one came from and its license.

## Texas deck — Get It, Y'all (FT-06)

Every Texas card (`Get It, Y'all`, FT-06) carries a real example photo in
`public/assets/challenges/texas-XX.jpg`, wired in via the card's `image` field.
`getMissionImage` returns the photo when one is supplied and falls back to the
generated badge art otherwise. Cards with a photo show an "Example photo" chip
in the deck library and the card detail modal, so players know it's a sample,
not the target itself.

## Texas — sources and licenses

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

## Texas — how they were chosen

Each photo was checked by eye against the card's required subjects before wiring.
Three first picks failed that check and were replaced: a scanned 1968 document
for Brisket Smoke, a "Welcome to Boling" sign with no "y'all" for Y'all Means All,
and a giant green flag that wasn't the Texas flag for Lone Star Flag.

To replace a photo: drop a new file in `public/assets/challenges/` and update the
card's `image` field in `src/data/texasChallengeBank.ts`. The gate test
`src/__tests__/texasExamplePhotos.test.ts` fails if a Texas card's photo is missing.
The fetch script `scripts/fetch-texas-example-photos.py` re-downloads from Commons
with the recorded queries (Openverse was bot-blocked from this machine).

## Heatwave Receipts deck — example photos

Every Heatwave card (`Heatwave Receipts`, FT-01) carries a real example photo in
`public/assets/challenges/heatwave-XX.jpg`, wired in via the card's `image` field,
the same way the Texas deck got its photos. Cards with a photo show an "Example
photo" chip in the deck library and the card detail modal, so players know it's
a sample, not the target itself.

### Sources and licenses

All photos are from Wikimedia Commons and are freely licensed (CC BY, CC BY-SA,
CC0, or public domain). Attribution:

| Card | File | Source | License |
| --- | --- | --- | --- |
| heatwave-01 — Heat Signature | `heatwave-01.jpg` | [File:WiltedSunflower.jpg](https://commons.wikimedia.org/wiki/File%3AWiltedSunflower.jpg) | CC BY 4.0 |
| heatwave-02 — Shade Economy | `heatwave-02.jpg` | [File:A seller of Ice Cream popsicle sleeping on the shade of a tree on a hot summer day in Maidan, Kolkata.jpg](https://commons.wikimedia.org/wiki/File%3AA_seller_of_Ice_Cream_popsicle_sleeping_on_the_shade_of_a_tree_on_a_hot_summer_day_in_Maidan%2C_Kolkata.jpg) | CC BY-SA 4.0 |
| heatwave-03 — Color That Refused to Whisper | `heatwave-03.jpg` | [File:(Field of colorful flowers in Paso Robles, California) - DPLA - de2fe8aba5a58c1c1cce55effbaff01f.jpg](https://commons.wikimedia.org/wiki/File%3A%28Field_of_colorful_flowers_in_Paso_Robles%2C_California%29_-_DPLA_-_de2fe8aba5a58c1c1cce55effbaff01f.jpg) | CC BY 4.0 |
| heatwave-04 — Plastic Kingdom | `heatwave-04.jpg` | [File:Air mattress Fortepan 1559.jpg](https://commons.wikimedia.org/wiki/File%3AAir_mattress_Fortepan_1559.jpg) | CC BY-SA 3.0 |
| heatwave-05 — Vacation Behavior Detected | `heatwave-05.jpg` | [File:Cocktail tropicana.jpg](https://commons.wikimedia.org/wiki/File%3ACocktail_tropicana.jpg) | Public domain |
| heatwave-06 — The Season Is Doing Too Much | `heatwave-06.jpg` | [File:1st Intel Bn. beats summer heat on beach 120816-M-PF875-004.jpg](https://commons.wikimedia.org/wiki/File%3A1st_Intel_Bn._beats_summer_heat_on_beach_120816-M-PF875-004.jpg) | Public domain |
| heatwave-07 — Proof of Brief Existence | `heatwave-07.jpg` | [File:Man looking down at shoes (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3AMan_looking_down_at_shoes_%28Unsplash%29.jpg) | CC0 |
| heatwave-08 — Main Character Checkpoint | `heatwave-08.jpg` | [File:A recreational trail viewpoint along the Arkansas River in North Little Rock, Arkansas (d0766a93-ef12-41b4-8f2f-6570eba8b494).JPG](https://commons.wikimedia.org/wiki/File%3AA_recreational_trail_viewpoint_along_the_Arkansas_River_in_North_Little_Rock%2C_Arkansas_%28d0766a93-ef12-41b4-8f2f-6570eba8b494%29.JPG) | Public domain |
| heatwave-09 — Field Selfie, Loosely Defined | `heatwave-09.jpg` | [File:A person in the crowd takes a selfie with recording Artist Jimmy Buffett and the Coral Reefer Band. (30386552480).jpg](https://commons.wikimedia.org/wiki/File%3AA_person_in_the_crowd_takes_a_selfie_with_recording_Artist_Jimmy_Buffett_and_the_Coral_Reefer_Band._%2830386552480%29.jpg) | Public domain |
| heatwave-10 — Current Personal Weather | `heatwave-10.jpg` | [File:Sunny green paddy fields with trees and long shadows at golden hour.jpg](https://commons.wikimedia.org/wiki/File%3ASunny_green_paddy_fields_with_trees_and_long_shadows_at_golden_hour.jpg) | CC BY-SA 4.0 |
| heatwave-11 — Tiny Victory Receipt | `heatwave-11.jpg` | [File:Receipt from the store (PNG).jpg](https://commons.wikimedia.org/wiki/File%3AReceipt_from_the_store_%28PNG%29.jpg) | CC BY 4.0 |
| heatwave-12 — Crew Weather Advisory | `heatwave-12.jpg` | [File:DSC 7059 A group of friends laugh and chat over drinks and dinner at a cozy restaurant with warm brick walls and a red tablecloth setting the scene.jpg](https://commons.wikimedia.org/wiki/File%3ADSC_7059_A_group_of_friends_laugh_and_chat_over_drinks_and_dinner_at_a_cozy_restaurant_with_warm_brick_walls_and_a_red_tablecloth_setting_the_scene.jpg) | CC BY-SA 4.0 |
| heatwave-13 — Questionable But Loyal Formation | `heatwave-13.jpg` | [File:Friends of Natasha 2013.jpg](https://commons.wikimedia.org/wiki/File%3AFriends_of_Natasha_2013.jpg) | CC BY-SA 3.0 |
| heatwave-14 — The Group Chat Would Understand | `heatwave-14.jpg` | [File:A funny sign in front of the first station in Mullumbimby, NSW.jpg](https://commons.wikimedia.org/wiki/File%3AA_funny_sign_in_front_of_the_first_station_in_Mullumbimby%2C_NSW.jpg) | CC0 |
| heatwave-15 — Snack Council Minutes | `heatwave-15.jpg` | [File:A bowl of snacks.jpg](https://commons.wikimedia.org/wiki/File%3AA_bowl_of_snacks.jpg) | CC0 |
| heatwave-16 — Tiny Witness | `heatwave-16.jpg` | [File:Dogs looking out of window.jpg](https://commons.wikimedia.org/wiki/File%3ADogs_looking_out_of_window.jpg) | CC0 |
| heatwave-17 — Side Quest Receipt | `heatwave-17.jpg` | [File:Empty ice cream aisle in Paris grocery store.jpg](https://commons.wikimedia.org/wiki/File%3AEmpty_ice_cream_aisle_in_Paris_grocery_store.jpg) | CC0 |
| heatwave-18 — Emotional Support Beverage | `heatwave-18.jpg` | [File:A cup of ice fruits coffee.jpg](https://commons.wikimedia.org/wiki/File%3AA_cup_of_ice_fruits_coffee.jpg) | CC0 |
| heatwave-19 — Bag of Consequences | `heatwave-19.jpg` | [File:A man carrying bags of joss paper goods in a shopping mall Tai Po HK.jpg](https://commons.wikimedia.org/wiki/File%3AA_man_carrying_bags_of_joss_paper_goods_in_a_shopping_mall_Tai_Po_HK.jpg) | CC BY-SA 4.0 |
| heatwave-20 — Passenger Seat Prophecy | `heatwave-20.jpg` | [File:Cars through rainy windshield (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3ACars_through_rainy_windshield_%28Unsplash%29.jpg) | CC0 |
| heatwave-21 — The Quick Stop Lied | `heatwave-21.jpg` | [File:Shopping cart of Prisma shop.JPG](https://commons.wikimedia.org/wiki/File%3AShopping_cart_of_Prisma_shop.JPG) | Public domain |
| heatwave-22 — The Plot Has Thickened | `heatwave-22.jpg` | [File:Traffic Jam on the M62 - geograph.org.uk - 7390393.jpg](https://commons.wikimedia.org/wiki/File%3ATraffic_Jam_on_the_M62_-_geograph.org.uk_-_7390393.jpg) | CC BY-SA 2.0 |
| heatwave-23 — This Was Not the Plan | `heatwave-23.jpg` | [File:"ROAD CLOSED" sign on 7th Street NW.jpg](https://commons.wikimedia.org/wiki/File%3A%22ROAD_CLOSED%22_sign_on_7th_Street_NW.jpg) | CC BY-SA 2.0 |
| heatwave-24 — Aftermath Exhibit A | `heatwave-24.jpg` | [File:A stack of empty sushi plates at a conveyor belt sushi restaurant in Taiwan.jpg](https://commons.wikimedia.org/wiki/File%3AA_stack_of_empty_sushi_plates_at_a_conveyor_belt_sushi_restaurant_in_Taiwan.jpg) | CC BY-SA 4.0 |
| heatwave-25 — Add It to the Lore | `heatwave-25.jpg` | [File:Bush canopy during sunset in Lake Kaniere Scenic Reserve, West Coast, New Zealand.jpg](https://commons.wikimedia.org/wiki/File%3ABush_canopy_during_sunset_in_Lake_Kaniere_Scenic_Reserve%2C_West_Coast%2C_New_Zealand.jpg) | CC BY-SA 4.0 |

### How they were chosen

Each photo was checked by eye against the card's required subjects before wiring.
Nine first picks failed that check and were replaced: a scanned bacteria book
page for Heat Signature, a palace facade for Proof of Brief Existence, a paper
mill for Tiny Victory Receipt, a book-cover scan for Snack Council Minutes, a
17th-century painting for Tiny Witness, a street scene shot from the sidewalk
for Passenger Seat Prophecy, a scanned book of speeches for The Quick Stop Lied,
a traffic-model diagram for The Plot Has Thickened, and a USDA document cover
for Aftermath Exhibit A.

To replace a photo: drop a new file in `public/assets/challenges/` and update the
card's `image` field in `src/data/heatwaveChallengeBank.ts`. The gate test
`src/__tests__/heatwaveExamplePhotos.test.ts` fails if a Heatwave card's photo is
missing. The fetch script `scripts/fetch-heatwave-example-photos.py` re-downloads
from Commons with the recorded queries.

## Jet Setter deck — example photos

Every Jet Setter card (`Jet Setter`, FT-05) carries a real example photo in
`public/assets/challenges/jet-setter-XX.jpg`, wired in via the card's `image`
field (set in the map at the bottom of `src/data/jetSetterChallengeBank.ts`),
the same way the Texas and Heatwave decks got theirs. Cards with a photo show
an "Example photo" chip in the deck library and the card detail modal, so
players know it's a sample, not the target itself.

### Sources and licenses

All photos are from Wikimedia Commons and are freely licensed (CC BY, CC BY-SA,
CC0, or public domain). Attribution:

| Card | File | Source | License |
| --- | --- | --- | --- |
| jet-setter-01 — Vacation Behavior Detected | `jet-setter-01.jpg` | [Walking Barefoot in the Sand.jpg](https://commons.wikimedia.org/wiki/File%3AWalking_Barefoot_in_the_Sand.jpg) | CC BY 2.0 |
| jet-setter-02 — Resort Evidence | `jet-setter-02.jpg` | [Child enjoying a sunny day by the pool in a leisure resort undefined.jpg](https://commons.wikimedia.org/wiki/File%3AChild_enjoying_a_sunny_day_by_the_pool_in_a_leisure_resort_undefined.jpg) | CC BY 2.0 |
| jet-setter-03 — Pool Chair Politics | `jet-setter-03.jpg` | [Drone pool and deck chairs (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3ADrone_pool_and_deck_chairs_%28Unsplash%29.jpg) | CC0 |
| jet-setter-04 — Blue Water Propaganda | `jet-setter-04.jpg` | [Aerial view of the turquoise waters of the Indian Ocean at Le Morne Beach, Mauritius (53697980443).jpg](https://commons.wikimedia.org/wiki/File%3AAerial_view_of_the_turquoise_waters_of_the_Indian_Ocean_at_Le_Morne_Beach%2C_Mauritius_%2853697980443%29.jpg) | CC BY 2.0 |
| jet-setter-05 — The Towel Economy | `jet-setter-05.jpg` | [Guarding the Towel, Praa Sands - geograph.org.uk - 8358025.jpg](https://commons.wikimedia.org/wiki/File%3AGuarding_the_Towel%2C_Praa_Sands_-_geograph.org.uk_-_8358025.jpg) | CC BY-SA 2.0 |
| jet-setter-06 — Sunset Department | `jet-setter-06.jpg` | [Koh Mak (island), Thailand, Sunset on the beach with palms.jpg](https://commons.wikimedia.org/wiki/File%3AKoh_Mak_%28island%29%2C_Thailand%2C_Sunset_on_the_beach_with_palms.jpg) | CC BY 4.0 |
| jet-setter-07 — Passport to Nowhere, Face Optional | `jet-setter-07.jpg` | [DFC 0339 Relaxing on the sand in beaded sandals with bright blue toenail polish.jpg](https://commons.wikimedia.org/wiki/File%3ADFC_0339_Relaxing_on_the_sand_in_beaded_sandals_with_bright_blue_toenail_polish.jpg) | CC BY-SA 4.0 |
| jet-setter-08 — Beach Episode Unlocked | `jet-setter-08.jpg` | [People jumping on the beach.jpg](https://commons.wikimedia.org/wiki/File%3APeople_jumping_on_the_beach.jpg) | CC BY-SA 2.0 |
| jet-setter-09 — SPF Witness Statement | `jet-setter-09.jpg` | [Applying sunscreen.jpg](https://commons.wikimedia.org/wiki/File%3AApplying_sunscreen.jpg) | Public domain |
| jet-setter-10 — Main Character at the Pool Bar | `jet-setter-10.jpg` | [Swimming pool - Mercure Beaune Centre - outdoor bar area (35113316611).jpg](https://commons.wikimedia.org/wiki/File%3ASwimming_pool_-_Mercure_Beaune_Centre_-_outdoor_bar_area_%2835113316611%29.jpg) | CC BY-SA 2.0 |
| jet-setter-11 — Out-of-Office Alibi | `jet-setter-11.jpg` | [-i---i- (38646525730).jpg](https://commons.wikimedia.org/wiki/File%3A-i---i-_%2838646525730%29.jpg) | CC BY 2.0 |
| jet-setter-12 — Vacation Formation | `jet-setter-12.jpg` | [Black Rock beach.jpg](https://commons.wikimedia.org/wiki/File%3ABlack_Rock_beach.jpg) | CC BY 2.0 |
| jet-setter-13 — Snack Council: Vacation Session | `jet-setter-13.jpg` | [Brighton beach picnic 2024-03-31.jpg](https://commons.wikimedia.org/wiki/File%3ABrighton_beach_picnic_2024-03-31.jpg) | CC0 |
| jet-setter-14 — Group Chat on Island Time | `jet-setter-14.jpg` | [DSC 7089 Three friends laugh and toast over drinks during a lively evening dinner at a cozy plant-filled restaurant.jpg](https://commons.wikimedia.org/wiki/File%3ADSC_7089_Three_friends_laugh_and_toast_over_drinks_during_a_lively_evening_dinner_at_a_cozy_plant-filled_restaurant.jpg) | CC BY-SA 4.0 |
| jet-setter-15 — Tiny Travel Witness | `jet-setter-15.jpg` | [AT THE DOGGIE BEACH.MAY.2021.jpg](https://commons.wikimedia.org/wiki/File%3AAT_THE_DOGGIE_BEACH.MAY.2021.jpg) | CC BY-SA 4.0 |
| jet-setter-16 — The Lounging Committee | `jet-setter-16.jpg` | [People on the beach, Sunbathing, Gili Trawangan (island), Indonesia.jpg](https://commons.wikimedia.org/wiki/File%3APeople_on_the_beach%2C_Sunbathing%2C_Gili_Trawangan_%28island%29%2C_Indonesia.jpg) | CC BY 4.0 |
| jet-setter-17 — Luggage of Consequences | `jet-setter-17.jpg` | [Suitcase with luggage labels (178491614).jpg](https://commons.wikimedia.org/wiki/File%3ASuitcase_with_luggage_labels_%28178491614%29.jpg) | CC BY 2.0 |
| jet-setter-18 — Room Key to the Kingdom | `jet-setter-18.jpg` | [Cozumel Resort Balcony View-27527.jpg](https://commons.wikimedia.org/wiki/File%3ACozumel_Resort_Balcony_View-27527.jpg) | Public domain |
| jet-setter-19 — Frozen Drink Documentation | `jet-setter-19.jpg` | [Pina Colada at Aruba.jpg](https://commons.wikimedia.org/wiki/File%3APina_Colada_at_Aruba.jpg) | CC BY-SA 4.0 |
| jet-setter-20 — Souvenir Trap | `jet-setter-20.jpg` | [01-05-2017 Beach shop, Albufeira Marina (1).JPG](https://commons.wikimedia.org/wiki/File%3A01-05-2017_Beach_shop%2C_Albufeira_Marina_%281%29.JPG) | CC BY-SA 4.0 |
| jet-setter-21 — Travel Snack Manifest | `jet-setter-21.jpg` | [Sun Chips original flavor.JPG](https://commons.wikimedia.org/wiki/File%3ASun_Chips_original_flavor.JPG) | CC BY-SA 3.0 |
| jet-setter-22 — The Itinerary Has Left the Chat | `jet-setter-22.jpg` | [Detour Sign.jpg](https://commons.wikimedia.org/wiki/File%3ADetour_Sign.jpg) | CC0 |
| jet-setter-23 — Beach Day Aftermath | `jet-setter-23.jpg` | [DFC 2270 Empty plastic chairs gather under shady trees facing the calm sea as if waiting for sunset company.jpg](https://commons.wikimedia.org/wiki/File%3ADFC_2270_Empty_plastic_chairs_gather_under_shady_trees_facing_the_calm_sea_as_if_waiting_for_sunset_company.jpg) | CC BY-SA 4.0 |
| jet-setter-24 — Postcard From the Plot | `jet-setter-24.jpg` | [Miami Beach (Bal Harbour) - Sea View Hotel.jpg](https://commons.wikimedia.org/wiki/File%3AMiami_Beach_%28Bal_Harbour%29_-_Sea_View_Hotel.jpg) | Public domain |
| jet-setter-25 — Add It to the Vacation Lore | `jet-setter-25.jpg` | [A Sunset shared with friends.jpg](https://commons.wikimedia.org/wiki/File%3AA_Sunset_shared_with_friends.jpg) | CC BY-SA 4.0 |

Per-card creator names live in `scripts/jet-setter-example-photos-manifest.json`
(the `creator` field, alongside source URL, page, license, and bytes).

### How they were chosen

Each photo was checked by eye against the card's required subjects before wiring.
Thirteen first picks failed that check and were replaced: a scanned FBI document
page for Vacation Behavior Detected, a "Country Lawyer" book cover for Pool Chair
Politics, a blank red book cover for Beach Episode Unlocked, a Morro Bay beach
cleanup crew for SPF Witness Statement, a pool table in a library for Main
Character at the Pool Bar, a blank red book cover for Snack Council, a "Forest
Friends" book cover illustration for Group Chat on Island Time, a "Pool of
Flame" book cover for Lounging Committee, a flat vector illustration of a family
with suitcases for Luggage of Consequences, a photography color-checker card
for Room Key to the Kingdom, a "Woman of Thirty" book cover for Frozen Drink
Documentation, a "Vagabond in the Caucasus" book cover for Travel Snack
Manifest, and a "Church on Wheels" book cover for The Itinerary Has Left the
Chat.

The vibe cards are judgment calls, noted here so the next pass can revisit
them: Passport to Nowhere (07) is a pair of beaded sandals on the sand — feet
only, no face, no documents, which is the point of the card; Group Chat on
Island Time (14) is three friends laughing over drinks at a restaurant table —
it reads as the inside-joke moment, not the joke itself; The Itinerary Has Left
the Chat (22) is a literal orange DETOUR sign — the plan changing, in one
frame; Postcard From the Plot (24) is a literal vintage Miami Beach postcard
of the Sea View Hotel — the card wants a postcard-worthy moment, and this one
is the genre; Add It to the Vacation Lore (25) is two friends silhouetted on
a beach at sunset — the lore is the friendship, not a single object.

Files were recompressed into the ~87–200 KB class of the earlier decks
(PIL, max width 1024, JPEG quality 78) — the deck adds ~4.9 MB total.
The one outlier is jet-setter-15 (dogs at a dog beach, 382 KB): fine detail
(foliage, water) doesn't compress further without visible loss, so it stays.

To replace a photo: drop a new file in `public/assets/challenges/` and update
the card's `image` field in `src/data/jetSetterChallengeBank.ts` (or the
manifest entry). The gate test `src/__tests__/jetSetterExamplePhotos.test.ts`
fails if a Jet Setter card's photo is missing. The fetch script
`scripts/fetch-jet-setter-example-photos.py` re-downloads from Commons with
the recorded queries (Wikimedia rate-limits hard — expect HTTP 429s on
back-to-back runs; the script retries).

## SoCal Summer deck — example photos

Every SoCal Summer card (`SoCal Summer`, socal-summer) carries a real example
photo in `public/assets/challenges/socal-XX.jpg`, wired in via the card's
`image` field in `src/data/socalSummerChallengeBank.ts`, the same way the
Texas, Heatwave, and Jet Setter decks got theirs. Cards with a photo show an
"Example photo" chip in the deck library and the card detail modal, so players
know it's a sample, not the target itself.

### Sources and licenses

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

### How they were chosen

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

## Errand Deck — example photos

Every card in the Errand Deck (`The Errand Deck`, errand-deck) carries a real
example photo in `public/assets/challenges/errand-deck-XX.jpg`, wired in via
the card's `image` field (set in the map at the bottom of
`src/data/errandDeckChallengeBank.ts`), the same way the Texas, Heatwave, and
Jet Setter decks got theirs. Cards with a photo show an "Example photo" chip
in the deck library and the card detail modal, so players know it's a sample,
not the target itself.

### Sources and licenses

All photos are from Wikimedia Commons and are freely licensed (CC BY, CC BY-SA,
CC0, or public domain). Attribution:

| Card | File | Source | License |
| --- | --- | --- | --- |
| errand-deck-01 — Aisle Oracle | `errand-deck-01.jpg` | [File:Aisle in L Intermarche supermarket in Quebec City.jpg](https://commons.wikimedia.org/wiki/File%3AAisle_in_L_Intermarche_supermarket_in_Quebec_City.jpg) | CC BY-SA 4.0 |
| errand-deck-02 — Parking Lot Ecology | `errand-deck-02.jpg` | [File:Shopping carts littered across a store parking lot in El Monte, USA.jpg](https://commons.wikimedia.org/wiki/File%3AShopping_carts_littered_across_a_store_parking_lot_in_El_Monte%2C_USA.jpg) | CC0 |
| errand-deck-03 — Impulse Portal | `errand-deck-03.jpg` | [File:Cool M&M Candy Vending Machine (52989445950).jpg](https://commons.wikimedia.org/wiki/File%3ACool_M%26M_Candy_Vending_Machine_%2852989445950%29.jpg) | CC BY 2.0 |
| errand-deck-04 — Errand Goblin Sighting | `errand-deck-04.jpg` | [File:Supermarket entrance - Flickr - @imaxeslugo.jpg](https://commons.wikimedia.org/wiki/File%3ASupermarket_entrance_-_Flickr_-_%40imaxeslugo.jpg) | CC BY 2.0 |
| errand-deck-05 — One Thing, Allegedly | `errand-deck-05.jpg` | [File:Shopping with kids (5418349069).jpg](https://commons.wikimedia.org/wiki/File%3AShopping_with_kids_%285418349069%29.jpg) | CC BY 2.0 |
| errand-deck-06 — Checkout Face, Optional | `errand-deck-06.jpg` | [File:Publix checkout aisle.jpg](https://commons.wikimedia.org/wiki/File%3APublix_checkout_aisle.jpg) | CC BY 4.0 |
| errand-deck-07 — Errand Chaperone | `errand-deck-07.jpg` | [File:Service dog out shopping.jpg](https://commons.wikimedia.org/wiki/File%3AService_dog_out_shopping.jpg) | CC BY-SA 4.0 |
| errand-deck-08 — Cart Council | `errand-deck-08.jpg` | [File:Asian Family Customers Shopping in The Super Market.jpg](https://commons.wikimedia.org/wiki/File%3AAsian_Family_Customers_Shopping_in_The_Super_Market.jpg) | CC BY 2.0 |
| errand-deck-09 — Waiting Area Weather | `errand-deck-09.jpg` | [File:People Waiting For San Francisco Muni (84006253).jpg](https://commons.wikimedia.org/wiki/File%3APeople_Waiting_For_San_Francisco_Muni_%2884006253%29.jpg) | CC BY-SA 3.0 |
| errand-deck-10 — Bag of Consequences | `errand-deck-10.jpg` | [File:Shopping freak (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3AShopping_freak_%28Unsplash%29.jpg) | CC0 |
| errand-deck-11 — Receipt Archaeology | `errand-deck-11.jpg` | [File:Family Dollar store receipt.jpg](https://commons.wikimedia.org/wiki/File%3AFamily_Dollar_store_receipt.jpg) | CC BY-SA 3.0 |
| errand-deck-12 — Emotional Support Beverage | `errand-deck-12.jpg` | [File:Person holding to-go coffee (Unsplash).jpg](https://commons.wikimedia.org/wiki/File%3APerson_holding_to-go_coffee_%28Unsplash%29.jpg) | CC0 |
| errand-deck-13 — The Second Stop | `errand-deck-13.jpg` | [File:Customers about to load a car on the roof parking space 8c35060v.jpg](https://commons.wikimedia.org/wiki/File%3ACustomers_about_to_load_a_car_on_the_roof_parking_space_8c35060v.jpg) | Public domain |
| errand-deck-14 — The Errand Fought Back | `errand-deck-14.jpg` | [File:Close-up of a closed sign hanging on a store door (51284470254).jpg](https://commons.wikimedia.org/wiki/File%3AClose-up_of_a_closed_sign_hanging_on_a_store_door_%2851284470254%29.jpg) | CC BY 2.0 |
| errand-deck-15 — Add It to the Errand Lore | `errand-deck-15.jpg` | [File:Two friends sitting together, chatting and laughing.jpg](https://commons.wikimedia.org/wiki/File%3ATwo_friends_sitting_together%2C_chatting_and_laughing.jpg) | CC BY-SA 4.0 |

Per-card creator names live in `scripts/errand-example-photos-manifest.json`
(the `creator` field, alongside source URL, page, license, and bytes).

### How they were chosen

Each photo was checked by eye against the card's required subjects before wiring.
Two first picks failed that check and were replaced, both for the same card:
a "market basket" file for One Thing, Allegedly (05) that turned out to be a
shopping cart abandoned on the grass in front of a glass tower, not a basket
at all, and a stack of empty red shopping baskets for the same card — baskets,
but empty, showing no "one thing" and no mission mutation. A third candidate
for 05, a woman carrying a basket on her head down a street in Antigua, was
passed over because the basket is small in the frame and the shot is a street
scene, not an errand moment.

The vibe cards are judgment calls, noted here so the next pass can revisit
them: Errand Goblin Sighting (04) is a person with a stroller entering a
Mercadona supermarket at night, face not visible — proof of entering the
errand zone, which is the point of the card; One Thing, Allegedly (05) is a
child sitting inside a shopping basket at a checkout — the basket holds a kid,
not groceries, which is the mission mutating, the card's own joke; Cart
Council (08) is a family debating sushi choices at a deli counter — a group
decision moment at a counter, not a cart debate; Waiting Area Weather (09) is
two men waiting at a transit stop, one facepalming, one on his phone — the
emotional climate of waiting, not a store waiting area, but the card allows a
line, bench, or parking-lot pause; The Second Stop (13) is a 1940s FSA photo
of a man loading paper grocery bags into a car on a roof parking lot — the
black film-frame border is part of the archival negative scan, the same
archival-photo precedent as the Texas deck's Library of Congress scan; Add It
to the Errand Lore (15) is two friends laughing together in a village
courtyard — no errand setting at all, the lore is the laughter and the
friendship, the same rationale as Jet Setter's sunset-friends lore card.

Files were recompressed into the ~53–200 KB class of the earlier decks (PIL,
max width 1024, JPEG quality 78) — the deck adds ~2.2 MB total. Two files
needed lower quality to land in range: errand-deck-01 at quality 74 (188 KB)
and errand-deck-03 at quality 70 (196 KB). The one outlier is
errand-deck-02 (carts littered across a parking lot, 372 KB at quality 65):
fine detail (foliage, dozens of carts) doesn't compress further without
visible loss, so it stays, inside the ~380 KB outlier allowance. Two sources
were smaller than 1024 px wide (errand-deck-07, 478 px; errand-deck-11,
740 px) and were kept at native size, not upscaled.

Wikimedia rate-limit note (Nov 20, 2026): upload.wikimedia.org (unscaled
originals) returned HTTP 429 persistently from this machine, even after
multi-minute waits, while thumb.wikimedia.org (1280px thumbs) kept working —
the fetch script downloads through the thumb URLs, and the manifest records
those thumb URLs as `source_url`.

To replace a photo: drop a new file in `public/assets/challenges/` and update
the card's `image` field in `src/data/errandDeckChallengeBank.ts` (or the
manifest entry). The gate test `src/__tests__/errandExamplePhotos.test.ts`
fails if an Errand Deck card's photo is missing. The fetch script
`scripts/fetch-errand-example-photos.py` re-downloads from Commons with the
recorded queries (Wikimedia rate-limits hard — expect HTTP 429s on
back-to-back runs; the script retries).

## Starter Signals deck — example photos

Every starter card (`Starter Signals`, deck `starter-signals`) carries a real
example photo in `public/assets/challenges/starter-N.jpg`, wired in via the
card's `image` field in `src/data/starterMissionBank.ts`, the same way the
Texas, Heatwave, and Jet Setter decks got theirs. Cards with a photo show an
"Example photo" chip in the deck library and the card detail modal, so players
know it's a sample, not the target itself. These are the first three missions
every new player sees, so the photos matter most here.

### Sources and licenses

All photos are from Wikimedia Commons and are freely licensed (CC BY, CC BY-SA,
CC0, or public domain). Attribution:

| Card | File | Source link | License |
| --- | --- | --- | --- |
| starter-1 — The Initial Signal | `starter-1.jpg` | [File:Sunflower with blue sky background.jpg](https://commons.wikimedia.org/wiki/File%3ASunflower_with_blue_sky_background.jpg) | Public domain |
| starter-2 — Snack Evidence | `starter-2.jpg` | [File:Slices of watermelon placed on a red tray at a summer gathering.jpg](https://commons.wikimedia.org/wiki/File%3ASlices_of_watermelon_placed_on_a_red_tray_at_a_summer_gathering.jpg) | CC BY 2.0 |
| starter-3 — Personal Oasis | `starter-3.jpg` | [File:Park Bench Ooty Botanical Garden (125298855).jpeg](https://commons.wikimedia.org/wiki/File%3APark_Bench_Ooty_Botanical_Garden_%28125298855%29.jpeg) | CC BY-SA 3.0 |

Per-card creator names live in `scripts/starter-example-photos-manifest.json`
(the `creator` field, alongside source URL, page, license, and bytes).

### How they were chosen

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

### Replace instructions

To replace a photo: drop a new file in `public/assets/challenges/` and update
the card's `image` field in `src/data/starterMissionBank.ts`. The gate test
`src/__tests__/starterExamplePhotos.test.ts` fails if a starter card's photo
is missing. The fetch script `scripts/fetch-starter-example-photos.py`
re-downloads from Commons with the recorded queries (Wikimedia rate-limits
hard — expect HTTP 429s on back-to-back runs; the script retries).

## Next decks

The same pattern extends to any deck: add an `image` field to the card, drop the
file in `public/assets/challenges/`, and the photo shows everywhere the card art
renders (library, detail modal, capture flow) with the "Example photo" chip where
the surface shows it. Record the source and license here. Texas, Heatwave, Jet Setter, SoCal Summer, Errand Deck, and the starter cards
are all done; every live deck now carries real example photos except Gobble &
Glow, which stays on SVG badges by design.
