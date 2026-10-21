/**
 * Plain-language copy for every playable card — the Frankie Mode layer.
 *
 * One entry per card ID. When Frankie Mode (Simple Words) is on,
 * frankieModeLogic resolves title / description / directions / field-note
 * prompt from here first, then falls back to any plain* fields on the card
 * itself, then to the original flavor copy.
 *
 * Writing rules for new entries (see docs/FRANKIE_MODE.md):
 * - plainTitle: max ~4 words, names a real, concrete thing. No metaphors.
 * - plainDescription: one sentence, verb first, exactly what to photograph.
 * - plainDirections: 3 short steps separated by "\n".
 * - plainFieldNotePrompt: one short, simple prompt.
 *
 * Coverage is enforced by src/__tests__/frankieMode.test.ts — every card in
 * the five banks must have an entry here, and there must be no orphans.
 */
export interface PlainCardCopy {
  plainTitle: string;
  plainDescription: string;
  plainDirections: string;
  plainFieldNotePrompt: string;
}

export const PLAIN_CARD_COPY: Record<string, PlainCardCopy> = {
  'starter-1': {
    plainTitle: 'A Flower or Tree',
    plainDescription: 'Take a photo of a bright flower, a blue sky, or a shady tree near you.',
    plainDirections: 'Find a flower, blue sky, or shady tree.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what did you take a photo of?',
  },
  'starter-2': {
    plainTitle: 'A Snack or Drink',
    plainDescription: 'Take a photo of a snack or a cold drink that is close to you.',
    plainDirections: 'Find a snack or a cold drink.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is the snack or drink?',
  },
  'starter-3': {
    plainTitle: 'A Cool Rest Spot',
    plainDescription: 'Find a cool place to rest, like a room with air conditioning, a shady park bench, or cool water for your feet.',
    plainDirections: 'Find a cool place to rest.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where is this place, and why is it cool?',
  },
  'socal-01': {
    plainTitle: 'Where Water Meets Land',
    plainDescription: 'Take a photo of the place where the water meets the land at a beach or a marina.',
    plainDirections: 'Find the edge of the water at a beach or marina.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where did you find the water\'s edge?',
  },
  'socal-02': {
    plainTitle: 'A Palm Tree',
    plainDescription: 'Take a photo of one tall palm tree or a group of palm trees.',
    plainDirections: 'Find a palm tree or a group of palm trees.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where did you see the palm tree?',
  },
  'socal-03': {
    plainTitle: 'Food on the Boardwalk',
    plainDescription: 'Take a photo of ice cream, tacos, or a cold drink on the boardwalk or near a park path.',
    plainDirections: 'Find ice cream, tacos, or a cold drink near the boardwalk.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is the food or drink?',
  },
  'socal-04': {
    plainTitle: 'Art on a Wall',
    plainDescription: 'Find a mural or painting on a wall outside and take a photo of it.',
    plainDirections: 'Find a mural or painting on an outside wall.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what does the art show?',
  },
  'socal-05': {
    plainTitle: 'The Sky at Sunset',
    plainDescription: 'Take a photo of the sky when it turns orange, pink, or purple near the end of the day.',
    plainDirections: 'Wait until the sky turns orange, pink, or purple.\nTake one clear photo of the sky.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what colors did you see in the sky?',
  },
  'socal-06': {
    plainTitle: 'A Bike or Scooter',
    plainDescription: 'Take a photo of a bicycle, a scooter, or a bike lane near the beach or a park.',
    plainDirections: 'Find a bicycle, a scooter, or a bike lane.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what did you find, and where?',
  },
  'socal-07': {
    plainTitle: 'A Special Street Find',
    plainDescription: 'Find something special on a walk, like a pink lawn flamingo, a different mailbox, or a small free library box.',
    plainDirections: 'Find a lawn flamingo, a special mailbox, or a small free library.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you find it?',
  },
  'socal-08': {
    plainTitle: 'Shadows on the Ground',
    plainDescription: 'Take a photo of long, dark shadows on the ground in the late afternoon.',
    plainDirections: 'Look for long shadows on the ground in the late afternoon.\nTake one clear photo of them.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what made the shadows?',
  },
  'socal-09': {
    plainTitle: 'A Shady Park Spot',
    plainDescription: 'Find a nice place to sit under a tree in a park and take a photo of it.',
    plainDirections: 'Find a place to sit under a tree in a park.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where is this place in the park?',
  },
  'socal-10': {
    plainTitle: 'A Well-Known Place',
    plainDescription: 'Take a photo of a well-known place, like a lighthouse, a bridge, an old theater sign, or a famous building.',
    plainDirections: 'Find a lighthouse, a bridge, an old theater sign, or a well-known building.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is this place called?',
  },
  'socal-11': {
    plainTitle: 'An Iced Coffee Drink',
    plainDescription: 'Find a coffee shop near you and take a photo of an iced drink there.',
    plainDirections: 'Find an iced drink at a coffee shop near you.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is the drink?',
  },
  'socal-12': {
    plainTitle: 'Things for the Beach',
    plainDescription: 'Take a photo of a beach umbrella, a sandcastle, or a bright beach towel.',
    plainDirections: 'Find a beach umbrella, a sandcastle, or a beach towel.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what did you find at the beach?',
  },
  'socal-13': {
    plainTitle: 'A Sign Near You',
    plainDescription: 'Take a photo of a sign for a local shop, a community board, or a sign painted by hand.',
    plainDirections: 'Find a sign for a local shop or a sign painted by hand.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what does the sign say?',
  },
  'socal-14': {
    plainTitle: 'A Small Shop Gift',
    plainDescription: 'Find a postcard, a keychain, or a small gift in a local shop and take a photo of it.',
    plainDirections: 'Find a postcard, a keychain, or a small gift in a shop.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and which shop was it in?',
  },
  'socal-15': {
    plainTitle: 'A Blanket Outside',
    plainDescription: 'Take a photo of a towel or blanket spread out on the grass or the sand.',
    plainDirections: 'Find a towel or blanket spread out on grass or sand.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where is the blanket, grass or sand?',
  },
  'heatwave-01': {
    plainTitle: 'Something Hot From Summer',
    plainDescription: 'Take a photo of something the summer heat has changed, like a melted snack, a sweaty drink, or a person fanning themselves.',
    plainDirections: 'Find something the heat has changed.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and how did the heat change it?',
  },
  'heatwave-02': {
    plainTitle: 'A Good Patch of Shade',
    plainDescription: 'Take a photo of the best shady spot near you, like shade under a tree, an umbrella, or a building.',
    plainDirections: 'Find a good patch of shade.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where is this shade?',
  },
  'heatwave-03': {
    plainTitle: 'The Brightest Color Nearby',
    plainDescription: 'Take a photo of the brightest color you can find near you, like a red sign, a yellow shirt, or a blue wall.',
    plainDirections: 'Find the brightest color near you.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and what color is it?',
  },
  'heatwave-04': {
    plainTitle: 'Something Plastic and Bright',
    plainDescription: 'Take a photo of something plastic, shiny, or blow-up, like a pool float, a plastic cup, or a beach ball.',
    plainDirections: 'Find something plastic, shiny, or blow-up.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you find it?',
  },
  'heatwave-05': {
    plainTitle: 'Signs of a Vacation',
    plainDescription: 'Take a photo of something that looks like a vacation in a normal place, like sandals, sunglasses, a cold drink, or a towel.',
    plainDirections: 'Find something that looks like a vacation.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you see it?',
  },
  'heatwave-06': {
    plainTitle: 'The Most Summer Thing',
    plainDescription: 'Take a photo of the thing near you that feels most like summer, like ice cream, a pool, or bright sun on a hot street.',
    plainDirections: 'Find the thing that feels most like summer.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and why is it summer?',
  },
  'heatwave-07': {
    plainTitle: 'Proof You Were Here',
    plainDescription: 'Take a photo that shows you were here today, like your shoes, your shadow, or your hand holding a drink.',
    plainDirections: 'Find something that shows you were here.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where were you?',
  },
  'heatwave-08': {
    plainTitle: 'You Arriving Somewhere New',
    plainDescription: 'Take a photo that shows you got to a new place today, like a door, a sign, or the first thing you saw there.',
    plainDirections: 'Find the place you just got to.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where did you arrive?',
  },
  'heatwave-09': {
    plainTitle: 'A Photo of Yourself',
    plainDescription: 'Take a photo of yourself today, any way you like.',
    plainDirections: 'Find a good spot for a photo of yourself.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where are you in this photo?',
  },
  'heatwave-10': {
    plainTitle: 'How You Feel Today',
    plainDescription: 'Take a photo that shows how you feel today, like bright sun if you feel happy, clouds if you feel calm, or rain if you feel sad.',
    plainDirections: 'Find something that looks like how you feel today.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: how do you feel today?',
  },
  'heatwave-11': {
    plainTitle: 'A Small Win Today',
    plainDescription: 'Take a photo of a small good thing that happened today, like a finished task, a good meal, or a kind message.',
    plainDirections: 'Find proof of a small win from today.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what was the win?',
  },
  'heatwave-12': {
    plainTitle: 'Your Group\'s Mood Today',
    plainDescription: 'Take a photo of your group that shows how everyone feels right now, like laughing, resting, or eating together.',
    plainDirections: 'Find a moment that shows your group\'s mood.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: how does your group feel right now?',
  },
  'heatwave-13': {
    plainTitle: 'Your Group Right Now',
    plainDescription: 'Take a photo of your group just as you are right now, with no need to pose or fix anything.',
    plainDirections: 'Find your group as it is right now.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: who is in the photo, and where are you?',
  },
  'heatwave-14': {
    plainTitle: 'Something Only Your Group Gets',
    plainDescription: 'Take a photo of something only your group would think is funny or strange, like an inside joke, a funny sign, or a strange snack.',
    plainDirections: 'Find something only your group would get.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and why would your group get it?',
  },
  'heatwave-15': {
    plainTitle: 'Food With Your Group',
    plainDescription: 'Take a photo of food your group ordered, shared, or talked about, like a snack, a meal, or a drink.',
    plainDirections: 'Find the food your group had or talked about.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is the food, and who liked it?',
  },
  'heatwave-16': {
    plainTitle: 'A Small Part of Today',
    plainDescription: 'Take a photo of one small thing that was part of your day, like a pet, a soft toy, a drink, or a bag.',
    plainDirections: 'Find one small thing that was part of your day.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where was it today?',
  },
  'heatwave-17': {
    plainTitle: 'A Quick Stop Grew',
    plainDescription: 'Take a photo that shows a quick stop turned into a longer trip, like an extra store, a long walk, or a meal you did not plan.',
    plainDirections: 'Find proof that a quick stop turned into a side trip.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where did you stop, and what else happened?',
  },
  'heatwave-18': {
    plainTitle: 'A Drink That Helps',
    plainDescription: 'Take a photo of a drink that is helping you or someone else keep going, like water, coffee, or a cold soda.',
    plainDirections: 'Find a drink that is helping someone keep going.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is the drink, and who is it for?',
  },
  'heatwave-19': {
    plainTitle: 'Something You Bought or Carried',
    plainDescription: 'Take a photo of something you bought, carried, or packed today, like a full bag, a box, or a new item.',
    plainDirections: 'Find something you bought, carried, or packed.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you get it?',
  },
  'heatwave-20': {
    plainTitle: 'Something Seen on the Way',
    plainDescription: 'Take a photo of something you saw on the way, not at the end, like a view from the car, a road sign, or a stop along the road.',
    plainDirections: 'Find something you saw on the way.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where were you going?',
  },
  'heatwave-21': {
    plainTitle: 'A Quick Stop Took Long',
    plainDescription: 'Take a photo that shows a quick stop took much longer than you planned, like a long line, a full cart, or a second store.',
    plainDirections: 'Find proof that a quick stop took a long time.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where did you stop, and what took so long?',
  },
  'heatwave-22': {
    plainTitle: 'When Things Got Busy',
    plainDescription: 'Take a photo of the moment things got more busy, funny, or full of food, like a big order, a change of plans, or a table full of snacks.',
    plainDirections: 'Find the moment things got more busy or funny.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what happened?',
  },
  'heatwave-23': {
    plainTitle: 'The Day Changed Plans',
    plainDescription: 'Take a photo that shows the day went a new way, like a new place, a changed plan, or something you did not expect.',
    plainDirections: 'Find proof that the day changed plans.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what was the plan, and what happened instead?',
  },
  'heatwave-24': {
    plainTitle: 'What Is Left After',
    plainDescription: 'Take a photo of what is left after something ends, like empty plates after a meal, wet towels after a swim, or bags after a trip.',
    plainDirections: 'Find what is left after a meal, trip, or game.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what just ended, and what is left?',
  },
  'heatwave-25': {
    plainTitle: 'Something to Remember Today',
    plainDescription: 'Take a photo of anything from today that you want to remember later, like a person, a place, or a small moment.',
    plainDirections: 'Find something from today you want to remember.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and why do you want to remember it?',
  },
  'jet-setter-01': {
    plainTitle: 'Things for a Vacation',
    plainDescription: 'Take a photo of sandals, sunglasses, or a beach towel.',
    plainDirections: 'Find sandals, sunglasses, or a beach towel.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you find it?',
  },
  'jet-setter-02': {
    plainTitle: 'Things at a Resort',
    plainDescription: 'Take a photo of a pool towel, a beach umbrella, or palm tree shadows.',
    plainDirections: 'Find a pool towel, a beach umbrella, or palm tree shadows.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you see it?',
  },
  'jet-setter-03': {
    plainTitle: 'Chairs by the Pool',
    plainDescription: 'Take a photo of chairs by the pool or on the beach.',
    plainDirections: 'Find chairs by the pool or on the beach.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where are the chairs, and what is on them?',
  },
  'jet-setter-04': {
    plainTitle: 'Blue Water',
    plainDescription: 'Take a photo of blue water in the ocean, a pool, or a harbor.',
    plainDirections: 'Find blue water in the ocean, a pool, or a harbor.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where is the water?',
  },
  'jet-setter-05': {
    plainTitle: 'Towels and Blankets',
    plainDescription: 'Take a photo of towels, blankets, or robes.',
    plainDirections: 'Find towels, blankets, or robes.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you find it?',
  },
  'jet-setter-06': {
    plainTitle: 'Sunset or Sunrise',
    plainDescription: 'Take a photo of the sky at sunset or sunrise, or of evening light on water.',
    plainDirections: 'Find the sky at sunset or sunrise, or evening light on water.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what colors did you see, and where were you?',
  },
  'jet-setter-07': {
    plainTitle: 'Signs of a Vacation',
    plainDescription: 'Take a photo of sandals by a door, sunglasses on a table, or a packed beach bag.',
    plainDirections: 'Find sandals, sunglasses, or a packed beach bag.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you find it?',
  },
  'jet-setter-08': {
    plainTitle: 'Start of Beach Day',
    plainDescription: 'Take a photo of sand, water, or a beach towel to show your beach day has started.',
    plainDirections: 'Find sand, water, or a beach towel at the start of your beach day.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where are you, and what did you do first?',
  },
  'jet-setter-09': {
    plainTitle: 'Staying Safe in Sun',
    plainDescription: 'Take a photo of sunscreen, a hat, or sunglasses.',
    plainDirections: 'Find sunscreen, a hat, or sunglasses.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and how does it keep you safe in the sun?',
  },
  'jet-setter-10': {
    plainTitle: 'By the Pool',
    plainDescription: 'Take a photo of yourself, your shadow, or your drink by the pool or at the beach.',
    plainDirections: 'Find a spot by the pool or at the beach with you, your shadow, or your drink in it.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where are you, and what are you doing?',
  },
  'jet-setter-11': {
    plainTitle: 'Resting on Vacation',
    plainDescription: 'Take a photo of a quiet place where you are resting, floating, or having a snack.',
    plainDirections: 'Find a quiet place where you are resting, floating, or having a snack.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where are you resting?',
  },
  'jet-setter-12': {
    plainTitle: 'Your Travel Group Together',
    plainDescription: 'Take a photo of the people or pets traveling with you, together in one place.',
    plainDirections: 'Find the people or pets traveling with you, together in one place.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: who is in the photo, and where are you?',
  },
  'jet-setter-13': {
    plainTitle: 'Vacation Food and Drink',
    plainDescription: 'Take a photo of food or a drink you chose on vacation, like beach snacks, pool food, or coffee.',
    plainDirections: 'Find food or a drink you chose on vacation.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you get it?',
  },
  'jet-setter-14': {
    plainTitle: 'Something Funny on Vacation',
    plainDescription: 'Take a photo of something funny, odd, or relaxing that happened on your trip.',
    plainDirections: 'Find something funny, odd, or relaxing from your trip.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and why is it funny, odd, or relaxing?',
  },
  'jet-setter-15': {
    plainTitle: 'Small Thing You Brought',
    plainDescription: 'Take a photo of a small thing that came on the trip, like a hat, a toy, or a bag charm.',
    plainDirections: 'Find a small thing that came on the trip, like a hat, a toy, or a bag charm.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and who brought it?',
  },
  'jet-setter-16': {
    plainTitle: 'Your Group Resting',
    plainDescription: 'Take a photo of your group sitting, reading, or resting in the shade.',
    plainDirections: 'Find your group sitting, reading, or resting in the shade.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: who is resting, and where are you?',
  },
  'jet-setter-17': {
    plainTitle: 'Bags and Luggage',
    plainDescription: 'Take a photo of luggage, a beach bag, or a backpack from your trip.',
    plainDirections: 'Find luggage, a beach bag, or a backpack from your trip.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: whose bag is it, and where did you find it?',
  },
  'jet-setter-18': {
    plainTitle: 'Your Vacation Place',
    plainDescription: 'Take a photo of the door to your place, the view from a balcony, or a towel on the bed.',
    plainDirections: 'Find the door to your place, a balcony view, or a towel on the bed.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and what do you like about this place?',
  },
  'jet-setter-19': {
    plainTitle: 'A Cold Vacation Drink',
    plainDescription: 'Take a photo of a cold drink on vacation, like a smoothie, iced coffee, or juice.',
    plainDirections: 'Find a cold drink on vacation, like a smoothie, iced coffee, or juice.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is the drink, and where did you get it?',
  },
  'jet-setter-20': {
    plainTitle: 'Souvenir in a Shop',
    plainDescription: 'Take a photo of a souvenir, a shell, or a postcard in a shop or market.',
    plainDirections: 'Find a souvenir, a shell, or a postcard in a shop or market.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where did you find it?',
  },
  'jet-setter-21': {
    plainTitle: 'Snacks for the Trip',
    plainDescription: 'Take a photo of snacks you brought on the trip, in a bag, a cooler, or on a table.',
    plainDirections: 'Find snacks you brought on the trip, in a bag, a cooler, or on a table.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what snacks are they, and where are they?',
  },
  'jet-setter-22': {
    plainTitle: 'Trip Plans Changed',
    plainDescription: 'Take a photo of something that shows the trip changed, like a new stop, rain, or a quiet lazy day.',
    plainDirections: 'Find something that shows the trip changed, like a new stop, rain, or a quiet lazy day.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what changed?',
  },
  'jet-setter-23': {
    plainTitle: 'After a Beach Day',
    plainDescription: 'Take a photo of what is left after a beach or pool day, like wet towels, sand, or empty cups.',
    plainDirections: 'Find what is left after a beach or pool day, like wet towels, sand, or empty cups.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is left, and where did you find it?',
  },
  'jet-setter-24': {
    plainTitle: 'A Postcard Photo',
    plainDescription: 'Take a photo of one pretty moment from the trip, like the beach, the sunset, or the water.',
    plainDirections: 'Find one pretty moment from the trip, like the beach, the sunset, or the water.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and where were you?',
  },
  'jet-setter-25': {
    plainTitle: 'Something to Remember',
    plainDescription: 'Take a photo of anything from the trip that you want to remember later.',
    plainDirections: 'Find anything from the trip that you want to remember later.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and why do you want to remember it?',
  },
  'errand-deck-01': {
    plainTitle: 'Helpful Sign in Store',
    plainDescription: 'Take a photo of a helpful sign or label in a store aisle, on a shelf, or on a menu.',
    plainDirections: 'Find a helpful sign or label.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what does the sign say, and where is it?',
  },
  'errand-deck-02': {
    plainTitle: 'Parking Lot Detail',
    plainDescription: 'Take a photo of something outside a store, like a cart, a bench, a bike rack, or the entrance.',
    plainDirections: 'Find one thing in the parking lot or outside the store.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is it, and which store is it at?',
  },
  'errand-deck-03': {
    plainTitle: 'Last-Minute Store Display',
    plainDescription: 'Take a photo of a display by the checkout made to get people to buy one more thing, like candy or a sale sign.',
    plainDirections: 'Find a display next to the checkout.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is the display selling?',
  },
  'errand-deck-04': {
    plainTitle: 'You Doing an Errand',
    plainDescription: 'Take a photo that shows you are out doing the errand, like you in the store or holding what you came to buy.',
    plainDirections: 'Find proof that you are out doing the errand.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what errand are you doing?',
  },
  'errand-deck-05': {
    plainTitle: 'What You Bought',
    plainDescription: 'Take a photo of the thing you came to buy, or the different thing you bought instead.',
    plainDirections: 'Find the thing you bought.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: did you buy what you came for?',
  },
  'errand-deck-06': {
    plainTitle: 'Paying at Checkout',
    plainDescription: 'Take a photo of the checkout, like the counter, the line, your bag, or paying for your things.',
    plainDirections: 'Find the checkout counter.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what did you buy?',
  },
  'errand-deck-07': {
    plainTitle: 'Who Came With You',
    plainDescription: 'Take a photo of who or what came with you, like a friend, a family member, a pet, or a drink.',
    plainDirections: 'Find the person or thing that came with you.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: who came with you?',
  },
  'errand-deck-08': {
    plainTitle: 'Choosing What to Buy',
    plainDescription: 'Take a photo of a choice you had to make, like picking a snack, looking at a menu, or choosing from a shelf.',
    plainDirections: 'Find a choice you need to make.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what did you choose?',
  },
  'errand-deck-09': {
    plainTitle: 'Waiting for Something',
    plainDescription: 'Take a photo of where you are waiting, like a line, a bench, your car, or a chair by the counter.',
    plainDirections: 'Find the place where you are waiting.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what are you waiting for?',
  },
  'errand-deck-10': {
    plainTitle: 'Bag You Are Carrying',
    plainDescription: 'Take a photo of something you bought or carried, like a shopping bag, a box you packed, or a thing you returned.',
    plainDirections: 'Find a bag or thing you are carrying.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is in the bag?',
  },
  'errand-deck-11': {
    plainTitle: 'Receipt or Label',
    plainDescription: 'Take a photo of a receipt, order screen, or label, and cover your name, card numbers, address, and other payment details first.',
    plainDirections: 'Find a receipt, and cover card numbers, addresses, and payment details.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what was bought? Do not write card numbers or private details.',
  },
  'errand-deck-12': {
    plainTitle: 'Drink on Your Errand',
    plainDescription: 'Take a photo of the drink you or someone with you has while doing the errand, like coffee, tea, or soda.',
    plainDirections: 'Find the drink for the errand.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what is the drink?',
  },
  'errand-deck-13': {
    plainTitle: 'Second Store Stop',
    plainDescription: 'Take a photo that shows you made a second stop, like a second store, a second bag, or a second receipt.',
    plainDirections: 'Find proof of your second stop.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: where was your second stop?',
  },
  'errand-deck-14': {
    plainTitle: 'Errand Got Harder',
    plainDescription: 'Take a photo that shows the errand got harder, like a long line, a closed store, an empty shelf, or a high price.',
    plainDirections: 'Find proof that the errand got harder.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: what went wrong?',
  },
  'errand-deck-15': {
    plainTitle: 'Something to Remember',
    plainDescription: 'Take a photo of anything from this errand that you want to remember later.',
    plainDirections: 'Find one thing you want to remember from this errand.\nTake one clear photo of it.\nTap Send.',
    plainFieldNotePrompt: 'In a few words: why do you want to remember this?',
  },
};
