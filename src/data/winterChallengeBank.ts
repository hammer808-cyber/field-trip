import { ChallengeCard } from '../types/challenges';

const MOCK_TIME = new Date().toISOString();

/**
 * Winter — a winter seasonal deck (FT-08).
 *
 * The rule for this deck: December through February, photographable
 * anywhere, with a SoCal spine. Most cards work on any cold day
 * anywhere; five carry a place tag for real winter spots in Southern
 * California (Snow Summit, Mountain High, Lake Arrowhead, the Mission
 * Inn Festival of Lights, the Pershing Square rink), and the +25%
 * location layer only pays when the submission's GPS matches the tag
 * (see src/logic/locationTags.ts). A tag never blocks a submit.
 *
 * Proof is layers, not piles: every card is photo plus field note at
 * base. 15 photo-led, 2 audio-led (a voice note counts as the field
 * note, the Texas-07 pattern), 3 hard combos. No video cards: there
 * is no video capture flow.
 *
 * Seasonal gate: Dec 1 – Feb 28/29 (see src/data/seasons.ts, seasonId
 * 'winter'). Deck registration (deckPacks.ts, cover art) is a separate
 * slice; this file is the card bank only.
 */
export const WINTER_CHALLENGE_BANK: Partial<ChallengeCard>[] = [
  {
    id: "winter-01",
    deckId: "winter",
    title: "Paper Snowflakes",
    image: "/assets/challenges/winter-01.jpg",
    shortPrompt: "Cut snowflakes from paper.",
    description: "Fold a sheet of paper, cut a pattern, unfold it. Tape your snowflakes to a window and photograph them. No two alike, same as the real thing.",
    mission: "“Photograph paper snowflakes you cut yourself.”",
    theAsk: "Capture photo evidence of paper snowflakes you cut yourself, taped to a window.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "artifact", "snowflakes", "paper", "craft", "evidence"],
    proofRequirements: {
      requiredSubjects: ["paper snowflakes", "snowflake", "paper", "window", "scissors"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Cut the snowflakes." },
      Advanced: { points: 125, description: "A whole window full of them." },
      Certified: { points: 150, description: "A blizzard on the glass." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-02",
    deckId: "winter",
    title: "Ugliest Ornament",
    image: "/assets/challenges/winter-02.jpg",
    shortPrompt: "Find the ugliest ornament.",
    description: "Every tree has one. The ornament that makes you ask who bought this, and why. Photograph it in all its glory.",
    mission: "“Photograph the ugliest ornament you can find.”",
    theAsk: "Capture photo evidence of the ugliest ornament you can find.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "artifact", "ornament", "tree", "funny", "evidence"],
    proofRequirements: {
      requiredSubjects: ["ornament", "christmas tree", "tree", "decoration", "bauble"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the ornament." },
      Advanced: { points: 125, description: "Ugly, and proud of it." },
      Certified: { points: 150, description: "The ugliest on the block." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-03",
    deckId: "winter",
    title: "Soup Weather",
    image: "/assets/challenges/winter-03.jpg",
    shortPrompt: "Find a bowl of soup.",
    description: "Cold day, hot soup. A bowl of soup steaming on the table, homemade or from the corner spot. The steam is the proof it is winter.",
    mission: "“Photograph a steaming bowl of soup.”",
    theAsk: "Capture photo evidence of a steaming bowl of soup.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "soup", "food", "cozy", "evidence"],
    proofRequirements: {
      requiredSubjects: ["soup", "bowl", "steam", "spoon", "bread"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the soup." },
      Advanced: { points: 125, description: "Steam rising off the bowl." },
      Certified: { points: 150, description: "Homemade, still on the stove." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-04",
    deckId: "winter",
    title: "Bare Branches",
    image: "/assets/challenges/winter-04.jpg",
    shortPrompt: "Find a bare winter tree.",
    description: "No leaves, no apologies. A bare tree against a grey or blue winter sky, branches doing all the work.",
    mission: "“Photograph a bare tree against the winter sky.”",
    theAsk: "Capture photo evidence of a bare tree against the winter sky.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "tree", "nature", "sky", "evidence"],
    proofRequirements: {
      requiredSubjects: ["bare tree", "branches", "tree", "sky", "winter"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the tree." },
      Advanced: { points: 125, description: "Branches against a blue sky." },
      Certified: { points: 150, description: "A whole row of bare trees." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-05",
    deckId: "winter",
    title: "Winter Layers",
    image: "/assets/challenges/winter-05.jpg",
    shortPrompt: "Bundle up in three layers.",
    description: "Scarf, beanie, gloves. All three at once, on one person. If you can still move your arms, you are not layered enough.",
    mission: "“Photograph someone wearing a scarf, a beanie, and gloves.”",
    theAsk: "Capture photo evidence of someone wearing a scarf, a beanie, and gloves.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "layers", "scarf", "cold", "evidence"],
    proofRequirements: {
      requiredSubjects: ["scarf", "beanie", "gloves", "winter coat", "person"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the layers." },
      Advanced: { points: 125, description: "All three, plus a coat." },
      Certified: { points: 150, description: "Layered beyond recognition." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-06",
    deckId: "winter",
    title: "Foggy Morning",
    image: "/assets/challenges/winter-06.jpg",
    shortPrompt: "Catch the fog before it burns off.",
    description: "A morning so foggy the street ends ten feet out. Photograph the fog while it lasts, before the sun takes it.",
    mission: "“Photograph a foggy winter morning.”",
    theAsk: "Capture photo evidence of a foggy winter morning.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "fog", "morning", "nature", "evidence"],
    proofRequirements: {
      requiredSubjects: ["fog", "morning", "mist", "street", "trees"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the fog." },
      Advanced: { points: 125, description: "Fog thick enough to hide the street." },
      Certified: { points: 150, description: "Fog, and the sun breaking through it." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-07",
    deckId: "winter",
    title: "Winter Citrus",
    image: "/assets/challenges/winter-07.jpg",
    shortPrompt: "Find oranges on the tree.",
    description: "Winter is citrus season. Find oranges or lemons still on the tree, bright against the leaves, and get close.",
    mission: "“Photograph citrus fruit growing on a tree.”",
    theAsk: "Capture photo evidence of citrus fruit growing on a tree.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "citrus", "fruit", "nature", "evidence"],
    proofRequirements: {
      requiredSubjects: ["oranges", "citrus", "lemon", "tree", "fruit"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the fruit." },
      Advanced: { points: 125, description: "A whole branch of oranges." },
      Certified: { points: 150, description: "Citrus, picked fresh." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-08",
    deckId: "winter",
    title: "Palm Tree Lights",
    image: "/assets/challenges/winter-08.jpg",
    shortPrompt: "Find a palm tree in lights.",
    description: "Only in Southern California does the palm tree get the Christmas lights. Find one wrapped in lights and photograph it.",
    mission: "“Photograph a palm tree wrapped in holiday lights.”",
    theAsk: "Capture photo evidence of a palm tree wrapped in holiday lights.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "palm", "lights", "night", "evidence"],
    proofRequirements: {
      requiredSubjects: ["palm tree", "lights", "christmas lights", "palm", "night"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the palm." },
      Advanced: { points: 125, description: "Lit up after dark." },
      Certified: { points: 150, description: "A whole row of lit palms." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-09",
    deckId: "winter",
    title: "Beach in Winter",
    image: "/assets/challenges/winter-09.jpg",
    shortPrompt: "Find the beach in December.",
    description: "The beach does not close for winter. An empty stretch of sand, a lifeguard tower in a Santa hat, the ocean doing its cold grey thing.",
    mission: "“Photograph the beach on a winter day.”",
    theAsk: "Capture photo evidence of the beach on a winter day.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "beach", "ocean", "sand", "evidence"],
    proofRequirements: {
      requiredSubjects: ["beach", "sand", "ocean", "lifeguard tower", "waves"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the beach." },
      Advanced: { points: 125, description: "Empty sand, no crowds." },
      Certified: { points: 150, description: "The beach, plus a Santa hat somewhere." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-10",
    deckId: "winter",
    title: "Puddle Reflection",
    image: "/assets/challenges/winter-10.jpg",
    shortPrompt: "Catch the sky in a puddle.",
    description: "After a winter rain, the ground holds the sky. Find a puddle with a real reflection in it and get low for the shot.",
    mission: "“Photograph a reflection in a rain puddle.”",
    theAsk: "Capture photo evidence of a reflection in a rain puddle.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["winter", "puddle", "rain", "reflection", "evidence"],
    proofRequirements: {
      requiredSubjects: ["puddle", "reflection", "rain", "water", "street"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the puddle." },
      Advanced: { points: 125, description: "A reflection you can read." },
      Certified: { points: 150, description: "Sky, street, and puddle in one frame." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-11",
    deckId: "winter",
    title: "Gingerbread House",
    image: "/assets/challenges/winter-11.jpg",
    shortPrompt: "Build a gingerbread house.",
    description: "Kit or from scratch, frosting as mortar, candy as roof tiles. Build it, photograph it, then you may eat the evidence.",
    mission: "“Photograph a gingerbread house you built.”",
    theAsk: "Capture photo evidence of a gingerbread house you built.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["winter", "artifact", "gingerbread", "baking", "evidence"],
    proofRequirements: {
      requiredSubjects: ["gingerbread house", "gingerbread", "frosting", "candy", "house"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Build the house." },
      Advanced: { points: 150, description: "Frosting and candy roof." },
      Certified: { points: 175, description: "A whole gingerbread street." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-12",
    deckId: "winter",
    title: "Carolers",
    image: "/assets/challenges/winter-12.jpg",
    shortPrompt: "Find people singing carols.",
    description: "Carolers on a porch, in a plaza, at a door. Get the singers in the photo, and record a short voice note of the song. The voice note counts as your field note.",
    mission: "“Photograph carolers and record their song.”",
    theAsk: "Capture photo evidence of carolers singing, with a voice note of the song.",
    proofType: ["photo", "audio", "group-confirmation"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["winter", "carolers", "music", "crew", "evidence"],
    proofRequirements: {
      requiredSubjects: ["carolers", "singing", "people", "song", "choir"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Find the singers." },
      Advanced: { points: 150, description: "The song, recorded." },
      Certified: { points: 175, description: "Your crew, singing along." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-13",
    deckId: "winter",
    title: "Fireside Story",
    image: "/assets/challenges/winter-13.jpg",
    shortPrompt: "Record a story by the fire.",
    description: "Sit by a fire, any fire, and record a short voice note of someone telling a winter story. The photo is the fire. The voice note counts as your field note.",
    mission: "“Photograph a fire and record a winter story told beside it.”",
    theAsk: "Capture photo evidence of a fire, with a voice note of a winter story told beside it.",
    proofType: ["photo", "audio"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["winter", "fire", "story", "audio", "evidence"],
    proofRequirements: {
      requiredSubjects: ["fire", "fireplace", "flames", "story", "cozy"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Find the fire." },
      Advanced: { points: 150, description: "A story, told by the fire." },
      Certified: { points: 175, description: "The fire, the story, and the whole room listening." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-14",
    deckId: "winter",
    title: "Snowball Fight",
    image: "/assets/challenges/winter-14.jpg",
    shortPrompt: "Catch a snowball mid-air.",
    description: "Real snow, real snowballs, real people ducking. Get the throw, the dodge, or the aftermath. Your crew counts as proof you were there.",
    mission: "“Photograph a snowball fight in progress.”",
    theAsk: "Capture photo evidence of a snowball fight in progress, with your crew in frame.",
    proofType: ["photo", "group-confirmation"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["winter", "snowball", "snow", "crew", "evidence"],
    proofRequirements: {
      requiredSubjects: ["snowball", "snow", "people", "fight", "winter"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Find the fight." },
      Advanced: { points: 150, description: "A snowball, mid-air." },
      Certified: { points: 175, description: "The whole crew, covered in snow." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-15",
    deckId: "winter",
    title: "White Elephant",
    image: "/assets/challenges/winter-15.jpg",
    shortPrompt: "Catch the gift swap.",
    description: "The white elephant gift, wrapped and ridiculous, changing hands at the swap. Photograph the gift mid-steal with your crew in frame.",
    mission: "“Photograph a white elephant gift at the swap.”",
    theAsk: "Capture photo evidence of a white elephant gift at the swap, with your crew in frame.",
    proofType: ["photo", "group-confirmation"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["winter", "gift", "party", "crew", "evidence"],
    proofRequirements: {
      requiredSubjects: ["gift", "wrapped gift", "white elephant", "people", "party"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Find the gift." },
      Advanced: { points: 150, description: "The gift, mid-steal." },
      Certified: { points: 175, description: "The ugliest gift at the swap." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-16",
    deckId: "winter",
    title: "Ski Day",
    image: "/assets/challenges/winter-16.jpg",
    shortPrompt: "Find skis on a slope.",
    description: "Skis or a snowboard, on actual snow, at Mountain High. The lift, the lodge, the run, any of it counts if the mountain is in the frame.",
    mission: "“Photograph skis or a snowboard at Mountain High.”",
    theAsk: "Capture photo evidence of skis or a snowboard at Mountain High.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["winter", "ski", "snow", "mountain", "evidence"],
    locationTag: { kind: 'place', latitude: 34.37472, longitude: -117.69323, radiusMeters: 6000, label: 'Mountain High, Wrightwood' },
    proofRequirements: {
      requiredSubjects: ["skis", "snowboard", "slope", "snow", "lift"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Find the skis." },
      Advanced: { points: 150, description: "On the lift, boards on." },
      Certified: { points: 175, description: "Top of the run, mountain behind you." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-17",
    deckId: "winter",
    title: "Lodge Fire",
    image: "/assets/challenges/winter-17.jpg",
    shortPrompt: "Find a fire in a mountain lodge.",
    description: "A fireplace burning in a lodge or cabin up at Lake Arrowhead. The fire, the wood beams, the cold outside the window.",
    mission: "“Photograph a fireplace burning in a Lake Arrowhead lodge.”",
    theAsk: "Capture photo evidence of a fireplace burning in a Lake Arrowhead lodge.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["winter", "lodge", "fire", "mountain", "evidence"],
    locationTag: { kind: 'place', latitude: 34.25063, longitude: -117.19105, radiusMeters: 10000, label: 'Lake Arrowhead' },
    proofRequirements: {
      requiredSubjects: ["fireplace", "fire", "lodge", "cabin", "flames"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Find the fire." },
      Advanced: { points: 150, description: "Fire, beams, and a cold window." },
      Certified: { points: 175, description: "The whole lodge, glowing." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-18",
    deckId: "winter",
    title: "Snowman at the Summit",
    image: "/assets/challenges/winter-18.jpg",
    shortPrompt: "Build a snowman at Big Bear.",
    description: "Real snow, real snowman, at Snow Summit. Bring your crew, roll it together, and give it a face. The snowman is the artifact, the crew is the proof you built it.",
    mission: "“Photograph a snowman you built with your crew at Snow Summit.”",
    theAsk: "Capture photo evidence of a snowman you built with your crew at Snow Summit.",
    proofType: ["photo", "group-confirmation"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 175,
    tags: ["winter", "artifact", "snowman", "snow", "crew", "evidence"],
    locationTag: { kind: 'place', latitude: 34.23734, longitude: -116.88867, radiusMeters: 15000, label: 'Snow Summit, Big Bear Lake' },
    proofRequirements: {
      requiredSubjects: ["snowman", "snow", "carrot", "crew", "mountain"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 175, description: "Build the snowman." },
      Advanced: { points: 200, description: "A face, arms, and a hat." },
      Certified: { points: 225, description: "The tallest snowman on the summit." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-19",
    deckId: "winter",
    title: "Lights After Dark",
    image: "/assets/challenges/winter-19.jpg",
    shortPrompt: "Catch the Mission Inn lights at night.",
    description: "The Festival of Lights at the Mission Inn, after dark. Every bulb, every arch, the whole building glowing. Go at night or it does not count.",
    mission: "“Photograph the Mission Inn Festival of Lights at night.”",
    theAsk: "Capture photo evidence of the Mission Inn Festival of Lights at night.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 175,
    tags: ["winter", "lights", "night", "festival", "evidence"],
    locationTag: { kind: 'place', latitude: 33.98445, longitude: -117.37706, radiusMeters: 1500, label: 'Mission Inn, Riverside' },
    proofRequirements: {
      requiredSubjects: ["lights", "mission inn", "festival", "night", "building"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true,
      // Night-only (Zach, Nov 21, 2026): 6 PM–6 AM local. The Festival of
      // Lights is a dusk show — a daytime photo does not count, and the
      // submit gate enforces it (see src/logic/timeWindow.ts).
      timeWindow: { startHour: 18, endHour: 6 }
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 175, description: "Find the lights." },
      Advanced: { points: 200, description: "The whole building, glowing." },
      Certified: { points: 225, description: "Lights, arches, and the crowd below." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "winter-20",
    deckId: "winter",
    title: "Rink Crew Skate",
    image: "/assets/challenges/winter-20.jpg",
    shortPrompt: "Skate with your crew at Pershing Square.",
    description: "The holiday rink at Pershing Square, skates on, crew in frame. Photograph your crew on the ice together. Falling counts as participating.",
    mission: "“Photograph your crew skating at the Pershing Square rink.”",
    theAsk: "Capture photo evidence of your crew skating at the Pershing Square rink.",
    proofType: ["photo", "group-confirmation"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 175,
    tags: ["winter", "rink", "skating", "crew", "evidence"],
    locationTag: { kind: 'place', latitude: 34.04848, longitude: -118.25244, radiusMeters: 800, label: 'Pershing Square, Los Angeles' },
    proofRequirements: {
      requiredSubjects: ["ice rink", "skating", "ice skates", "crew", "rink"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 175, description: "Get the crew on the ice." },
      Advanced: { points: 200, description: "Everyone skating, nobody falling." },
      Certified: { points: 225, description: "The whole crew, mid-lap." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
];
