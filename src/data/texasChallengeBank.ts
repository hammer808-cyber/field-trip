import { ChallengeCard } from '../types/challenges';

const MOCK_TIME = new Date().toISOString();

/**
 * Get It, Y'all — a Texas regional deck.
 *
 * The rule for this deck: unmistakably Texas, photographable anywhere in
 * the state. No card needs one specific place — a taco truck in Houston, a
 * bluebonnet patch off I-35, a Whataburger cup in El Paso all count.
 * Mostly easy on purpose: this is the "generically easy" deck.
 */
export const TEXAS_CHALLENGE_BANK: Partial<ChallengeCard>[] = [
  {
    id: "texas-01",
    deckId: "texas-get-it-yall",
    title: "Lone Star Sky",
    shortPrompt: "Find the biggest sky you can.",
    description: "Texas is famous for its sky. Find a wide, open stretch of it at golden hour — no buildings crowding the frame, just sky doing the work.",
    mission: "“Capture a wide Texas sky.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "sky", "golden-hour", "nature", "iconic"],
    proofRequirements: {
      requiredSubjects: ["sky", "clouds", "sunset", "sunrise", "horizon"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-02",
    deckId: "texas-get-it-yall",
    title: "Taco Truck Stop",
    shortPrompt: "Find tacos from a truck.",
    description: "Breakfast tacos, street tacos, any tacos — as long as they come from a food truck or trailer. Bonus points if there's a line of regulars.",
    mission: "“Capture tacos from a food truck.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "tacos", "food-truck", "snack", "street-food"],
    proofRequirements: {
      requiredSubjects: ["taco", "food truck", "trailer", "food", "sign"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-03",
    deckId: "texas-get-it-yall",
    title: "Boots on the Ground",
    shortPrompt: "Find a pair of cowboy boots.",
    description: "Yours, a storefront display, a mural, a statue — any pair of cowboy boots counts. The louder the stitching, the better the evidence.",
    mission: "“Capture a pair of cowboy boots.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "boots", "cowboy", "iconic", "street"],
    proofRequirements: {
      requiredSubjects: ["boots", "cowboy boots", "footwear", "store", "mural"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-04",
    deckId: "texas-get-it-yall",
    title: "Bluebonnet Patch",
    shortPrompt: "Find bluebonnets in bloom.",
    description: "The state flower, doing its thing. Find a patch of bluebonnets — or any wildflower field standing in for them out of season — and get low for the shot.",
    mission: "“Capture a patch of bluebonnets.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "bluebonnet", "wildflowers", "nature", "spring"],
    proofRequirements: {
      requiredSubjects: ["bluebonnet", "flowers", "wildflowers", "field", "bloom"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-05",
    deckId: "texas-get-it-yall",
    title: "Y'all Means All",
    shortPrompt: "Find the word 'y'all' in the wild.",
    description: "On a sign, a menu, a bumper sticker, a shop window — anywhere the word 'y'all' is doing official business in public.",
    mission: "“Capture the word 'y'all' on a sign.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "sign", "slang", "yall", "street"],
    proofRequirements: {
      requiredSubjects: ["sign", "text", "y'all", "menu", "bumper sticker"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-06",
    deckId: "texas-get-it-yall",
    title: "Brisket Smoke",
    shortPrompt: "Find smoke from a BBQ pit.",
    description: "Follow your nose. Capture smoke rising from a BBQ pit, a smoker trailer, or the sign of a BBQ joint that's clearly working hard.",
    mission: "“Capture BBQ smoke.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "bbq", "brisket", "smoke", "food"],
    proofRequirements: {
      requiredSubjects: ["smoke", "bbq", "barbecue", "pit", "sign"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-07",
    deckId: "texas-get-it-yall",
    title: "Two-Step Floor",
    shortPrompt: "Find where the two-step happens.",
    description: "A dance floor, a honky-tonk sign, a live-music stage — any place where people two-step. If the band is playing, that's the shot.",
    mission: "“Capture a two-step dance floor.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["texas", "dance", "honky-tonk", "music", "nightlife"],
    proofRequirements: {
      requiredSubjects: ["dance floor", "honky-tonk", "stage", "music", "sign"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-08",
    deckId: "texas-get-it-yall",
    title: "Longhorn Lookout",
    shortPrompt: "Find a longhorn.",
    description: "Live, statue, mural, or logo — any longhorn counts. The wider the horns, the stronger the evidence.",
    mission: "“Capture a longhorn.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["texas", "longhorn", "animal", "iconic", "statue"],
    proofRequirements: {
      requiredSubjects: ["longhorn", "bull", "horns", "statue", "mural"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-09",
    deckId: "texas-get-it-yall",
    title: "Whataburger Run",
    shortPrompt: "Find the orange-and-white stripes.",
    description: "A Whataburger cup, bag, or sign — the orange-and-white stripes are the giveaway. Late-night counts double in spirit, not in points.",
    mission: "“Capture a Whataburger cup or sign.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "whataburger", "fast-food", "snack", "iconic"],
    proofRequirements: {
      requiredSubjects: ["whataburger", "cup", "sign", "fast food", "orange"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-10",
    deckId: "texas-get-it-yall",
    title: "Lone Star Flag",
    shortPrompt: "Find a Texas flag flying.",
    description: "The Lone Star flag, flying anywhere — a porch, a storefront, a highway rest stop, a school flagpole. One star, one state, one photo.",
    mission: "“Capture a Texas flag flying.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "flag", "lone-star", "iconic", "street"],
    proofRequirements: {
      requiredSubjects: ["flag", "texas flag", "lone star", "pole", "star"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-11",
    deckId: "texas-get-it-yall",
    title: "Swimming Hole",
    shortPrompt: "Find a Texas swimming hole.",
    description: "A river bend, a spring-fed pool, a lake dock — any natural water Texans actually swim in. Get the water in the frame, not just the parking lot.",
    mission: "“Capture a natural swimming hole.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["texas", "water", "swimming", "river", "nature"],
    proofRequirements: {
      requiredSubjects: ["river", "lake", "swimming hole", "water", "dock"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-12",
    deckId: "texas-get-it-yall",
    title: "Friday Night Lights",
    shortPrompt: "Find stadium lights over a field.",
    description: "A high school football stadium, lights on, after dark. The whole town is usually there — catch the glow, not the crowd's faces.",
    mission: "“Capture stadium lights at night.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 150,
    tags: ["texas", "football", "stadium", "night", "lights"],
    proofRequirements: {
      requiredSubjects: ["stadium", "lights", "football field", "night", "bleachers"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-13",
    deckId: "texas-get-it-yall",
    title: "Big Bend Blues",
    shortPrompt: "Find a wide desert view.",
    description: "Desert hills, a far horizon, scrub and stone — the West Texas kind of empty. The shot should feel like you could drive an hour and still be nowhere.",
    mission: "“Capture a wide desert view.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 150,
    tags: ["texas", "desert", "landscape", "west-texas", "nature"],
    proofRequirements: {
      requiredSubjects: ["desert", "hills", "horizon", "landscape", "cactus"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-14",
    deckId: "texas-get-it-yall",
    title: "Kolache Run",
    shortPrompt: "Find kolaches at a bakery.",
    description: "Czech-Texan fuel. Find kolaches — or a pie, if the bakery's out — at a bakery, donut shop, or roadside stand. The box counts as evidence.",
    mission: "“Capture kolaches from a bakery.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "kolache", "bakery", "snack", "food"],
    proofRequirements: {
      requiredSubjects: ["kolache", "bakery", "pastry", "donut", "box"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "texas-15",
    deckId: "texas-get-it-yall",
    title: "Don't Mess With Texas",
    shortPrompt: "Find the slogan in the wild.",
    description: "The slogan itself — on a sign, a shirt, a bumper sticker, a mural. Seven words of state pride, somewhere in public.",
    mission: "“Capture the 'Don't Mess With Texas' slogan.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["texas", "slogan", "sign", "iconic", "street"],
    proofRequirements: {
      requiredSubjects: ["sign", "slogan", "shirt", "bumper sticker", "mural"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
];
