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

## Next decks

The same pattern extends to any deck: add an `image` field to the card, drop the
file in `public/assets/challenges/`, and the photo shows everywhere the card art
renders (library, detail modal, capture flow) with the "Example photo" chip where
the surface shows it. Record the source and license here. Texas and Heatwave are
done; the remaining decks without example photos are SoCal Summer, Errand Runner,
Jet Setter, and the starter cards.
