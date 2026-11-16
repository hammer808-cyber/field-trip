import { ChallengeCard } from '../types/challenges';

const MOCK_TIME = new Date().toISOString();

/**
 * Gobble & Glow — a holiday seasonal deck.
 *
 * The rule for this deck: Thanksgiving and winter holidays mixed in one
 * deck, photographable anywhere. No card needs one specific place — a
 * Friendsgiving table, a block's overboard light display, frost on a
 * windshield all count. Mostly easy on purpose: this is the seasonal
 * fun deck. Seasonal gate: Nov 1, 2026 – Jan 11, 2027 (see DECK_PACKS
 * startsAt/endsAt, enforced by src/logic/deckAccess.ts).
 * No locationTag: the location layer pays on any captured GPS, the way
 * the Heatwave deck works.
 */
export const HOLIDAY_CHALLENGE_BANK: Partial<ChallengeCard>[] = [
  {
    id: "holiday-01",
    deckId: "gobble-and-glow",
    title: "The Long Table",
    shortPrompt: "Set a table for a crowd.",
    description: "Thanksgiving, Friendsgiving, Christmas Eve — any table set for more people than usual. Plates, glasses, the good napkins if you've got them.",
    mission: "“Photograph a holiday table set for a crowd.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["thanksgiving", "table", "feast", "dinner", "family"],
    proofRequirements: {
      requiredSubjects: ["table", "plates", "feast", "dinner", "candles"],
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
    id: "holiday-02",
    deckId: "gobble-and-glow",
    title: "Pie Evidence",
    shortPrompt: "Find a pie, whole or sliced.",
    description: "Pumpkin, apple, pecan, key lime — if it's in a pie dish and someone's proud of it, it counts. Crumbs on the plate count double.",
    mission: "“Capture a pie, whole or sliced.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["pie", "dessert", "baking", "thanksgiving", "sweet"],
    proofRequirements: {
      requiredSubjects: ["pie", "dessert", "slice", "crust", "baking"],
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
    id: "holiday-03",
    deckId: "gobble-and-glow",
    title: "Gratitude Note",
    shortPrompt: "Show a thank-you in writing.",
    description: "A card, a list on the fridge, a napkin with three things you're grateful for. Handwritten only — typed doesn't count.",
    mission: "“Photograph a handwritten thank-you or gratitude list.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["gratitude", "note", "handwriting", "thanksgiving", "kind"],
    proofRequirements: {
      requiredSubjects: ["note", "handwriting", "card", "list", "thank you"],
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
    id: "holiday-04",
    deckId: "gobble-and-glow",
    title: "Leftover Architecture",
    shortPrompt: "Stack the leftovers high.",
    description: "The day-after plate: turkey, stuffing, and cranberry sauce in one heroic stack. Fridge Tetris counts too.",
    mission: "“Photograph a plate of leftovers stacked high.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["leftovers", "food", "fridge", "thanksgiving", "funny"],
    proofRequirements: {
      requiredSubjects: ["leftovers", "plate", "food", "fridge", "turkey"],
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
    id: "holiday-05",
    deckId: "gobble-and-glow",
    title: "The Kids' Table",
    shortPrompt: "Find the kids' table.",
    description: "The folding table, the card table, the end of the counter where the kids got parked. Paper plates encouraged.",
    mission: "“Photograph the kids' table — or what passes for one.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["kids", "table", "family", "thanksgiving", "funny"],
    proofRequirements: {
      requiredSubjects: ["table", "kids", "plates", "chairs", "family"],
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
    id: "holiday-06",
    deckId: "gobble-and-glow",
    title: "Cranberry Sauce, Both Kinds",
    shortPrompt: "Catch the cranberry debate.",
    description: "The can-shaped jelly with the ridges still on it, or the real thing in a bowl. Pick a side, photograph it.",
    mission: "“Photograph cranberry sauce — canned rings or homemade, either counts.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["cranberry", "food", "thanksgiving", "debate", "funny"],
    proofRequirements: {
      requiredSubjects: ["cranberry", "sauce", "can", "bowl", "thanksgiving"],
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
    id: "holiday-07",
    deckId: "gobble-and-glow",
    title: "Ugly Sweater Sighting",
    shortPrompt: "Spot a holiday sweater.",
    description: "Reindeer, snowmen, blinking lights — the louder the sweater, the better the proof.",
    mission: "“Photograph someone wearing a holiday sweater.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["sweater", "holiday", "winter", "funny", "fashion"],
    proofRequirements: {
      requiredSubjects: ["sweater", "holiday", "reindeer", "lights", "person"],
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
    id: "holiday-08",
    deckId: "gobble-and-glow",
    title: "Light Hunt",
    shortPrompt: "Find the best-lit house on the block.",
    description: "One house always goes overboard. Find it, photograph it, no trespassing.",
    mission: "“Photograph the best-lit house on your block.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["lights", "house", "winter", "night", "decorations"],
    proofRequirements: {
      requiredSubjects: ["lights", "house", "christmas", "decorations", "night"],
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
    id: "holiday-09",
    deckId: "gobble-and-glow",
    title: "Frost Proof",
    shortPrompt: "Catch the cold on camera.",
    description: "First frost of the season, wherever it lands — window, windshield, or lawn.",
    mission: "“Photograph frost on a window, a windshield, or the grass.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["frost", "winter", "cold", "morning", "nature"],
    proofRequirements: {
      requiredSubjects: ["frost", "window", "cold", "morning", "winter"],
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
    id: "holiday-10",
    deckId: "gobble-and-glow",
    title: "Second Helping",
    shortPrompt: "Prove the clean-plate club.",
    description: "The empty plate. The scraped-clean serving dish. The pot with nothing left but the spoon.",
    mission: "“Photograph a clean plate after a holiday meal.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["food", "meal", "thanksgiving", "funny", "feast"],
    proofRequirements: {
      requiredSubjects: ["plate", "empty", "food", "meal", "clean"],
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
    id: "holiday-11",
    deckId: "gobble-and-glow",
    title: "The Unboxing",
    shortPrompt: "Catch wrapping paper mid-chaos.",
    description: "Torn paper, ribbon everywhere, one box still taped shut. The mess is the proof.",
    mission: "“Photograph wrapping paper chaos — mid-tear or the aftermath.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["gifts", "wrapping", "christmas", "chaos", "winter"],
    proofRequirements: {
      requiredSubjects: ["wrapping paper", "gift", "ribbon", "box", "chaos"],
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
    id: "holiday-12",
    deckId: "gobble-and-glow",
    title: "Two Holidays, One Table",
    shortPrompt: "Mash two holidays into one frame.",
    description: "A turkey next to a menorah, a pumpkin beside a tree. Two holidays sharing one table.",
    mission: "“Photograph Thanksgiving and winter decor in the same frame.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["mashup", "holidays", "table", "decorations", "family"],
    proofRequirements: {
      requiredSubjects: ["table", "decorations", "turkey", "tree", "menorah"],
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
    id: "holiday-13",
    deckId: "gobble-and-glow",
    title: "The Cook's Apron",
    shortPrompt: "Catch the cook mid-chaos.",
    description: "Flour on hands, apron on, three things on the stove. The cook doesn't have to pose.",
    mission: "“Photograph the cook — flour, apron, and all.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["cooking", "kitchen", "family", "thanksgiving", "chaos"],
    proofRequirements: {
      requiredSubjects: ["cook", "apron", "flour", "kitchen", "cooking"],
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
    id: "holiday-14",
    deckId: "gobble-and-glow",
    title: "The Full Spread",
    shortPrompt: "Get every dish in one frame.",
    description: "Not one plate: the whole table, every dish, nothing cropped out. Stand on a chair if you have to.",
    mission: "“Photograph the entire holiday meal — every dish — in one frame.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 150,
    tags: ["feast", "table", "food", "thanksgiving", "hard"],
    proofRequirements: {
      requiredSubjects: ["feast", "table", "dishes", "food", "spread"],
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
    id: "holiday-15",
    deckId: "gobble-and-glow",
    title: "Three Generations",
    shortPrompt: "Three generations, one photo.",
    description: "Grandparent, parent, kid — same frame, same moment. The hardest one in the deck, and the one you'll keep.",
    mission: "“Photograph three generations of one family together.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 150,
    tags: ["family", "generations", "portrait", "holiday", "hard"],
    proofRequirements: {
      requiredSubjects: ["family", "generations", "people", "portrait", "together"],
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
