import { ChallengeCard } from '../types/challenges';

const MOCK_TIME = new Date().toISOString();

/**
 * Gobble & Glow — a holiday seasonal deck.
 *
 * The rule for this deck: 4 specifically Thanksgiving, 4 specifically
 * the winter holidays, and 7 fall/winter seasonal — activities and
 * things you only see at this time of year. Photographable anywhere.
 * Mostly easy on purpose: this is the seasonal fun deck. Seasonal
 * gate: Nov 1, 2026 – Jan 11, 2027 (see DECK_PACKS startsAt/endsAt,
 * enforced by src/logic/deckAccess.ts).
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
    theAsk: "Capture photo evidence of a holiday table set for a crowd.",
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
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Set the table." },
      Advanced: { points: 125, description: "Seat twelve or more." },
      Certified: { points: 150, description: "The full feast, candles lit." }
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
    theAsk: "Capture photo evidence of a pie, whole or sliced.",
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
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the pie." },
      Advanced: { points: 125, description: "Catch it mid-slice." },
      Certified: { points: 150, description: "The whole spread, pie front and center." }
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
    theAsk: "Photograph a handwritten thank-you — written evidence counts.",
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
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the note." },
      Advanced: { points: 125, description: "Three things, handwritten." },
      Certified: { points: 150, description: "The note, hand-delivered." }
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
    theAsk: "Capture photo evidence of a plate of leftovers stacked high.",
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
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Stack the plate." },
      Advanced: { points: 125, description: "Build a tower that stands." },
      Certified: { points: 150, description: "Fridge Tetris, fully solved." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "holiday-05",
    deckId: "gobble-and-glow",
    title: "Leaf Pile Jump",
    shortPrompt: "Find a pile of leaves.",
    description: "A raked pile, a drift against a fence, a whole yard gone gold. Jump in if you want — the photo counts either way.",
    mission: "“Photograph a pile of fallen leaves.”",
    theAsk: "Photograph a pile of fallen leaves.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["leaves", "fall", "yard", "nature", "autumn"],
    proofRequirements: {
      requiredSubjects: ["leaves", "pile", "fall", "rake", "autumn"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the pile." },
      Advanced: { points: 125, description: "Jump in — mid-air counts." },
      Certified: { points: 150, description: "The biggest pile on the block." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "holiday-06",
    deckId: "gobble-and-glow",
    title: "First Fire",
    shortPrompt: "Catch the first fire of the season.",
    description: "Fireplace, fire pit, chiminea — the first fire after months of quiet. Smoke from a chimney counts.",
    mission: "“Photograph a fire burning — fireplace, fire pit, or chimney smoke.”",
    theAsk: "Capture photo evidence of the first fire of the season.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["fire", "fireplace", "winter", "cozy", "fall"],
    proofRequirements: {
      requiredSubjects: ["fire", "fireplace", "flames", "chimney", "smoke"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the fire." },
      Advanced: { points: 125, description: "Catch the first flames." },
      Certified: { points: 150, description: "Fire, smoke, and the whole chimney." }
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
    theAsk: "Photograph someone wearing a holiday sweater — the louder, the better the evidence.",
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
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Spot the sweater." },
      Advanced: { points: 125, description: "Blinking lights included." },
      Certified: { points: 150, description: "The loudest sweater on the block." }
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
    theAsk: "Capture photo evidence of the best-lit house on your block.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["lights", "house", "winter", "night", "decorations"],
    proofRequirements: {
      requiredSubjects: ["lights", "house", "christmas", "decorations", "night"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true,
      // Night-only (Zach, Nov 27, 2026): the token is the house lit up —
      // a daytime photo of unlit decorations is not the card. 6 PM–6 AM
      // local. One-line flippable.
      timeWindow: { startHour: 18, endHour: 6 }
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the lights." },
      Advanced: { points: 125, description: "The whole house, lit up." },
      Certified: { points: 150, description: "The overboard house, every window." }
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
    theAsk: "Photograph frost on a window, a windshield, or the grass.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["frost", "winter", "cold", "morning", "nature"],
    proofRequirements: {
      requiredSubjects: ["frost", "window", "cold", "morning", "winter"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true,
      // Morning-only (Zach, Nov 27, 2026): frost is a morning thing —
      // "before the sun takes it". 5 AM–12 PM local. One-line flippable.
      timeWindow: { startHour: 5, endHour: 12 }
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the frost." },
      Advanced: { points: 125, description: "Frost on three surfaces." },
      Certified: { points: 150, description: "First frost, before the sun takes it." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "holiday-10",
    deckId: "gobble-and-glow",
    title: "Early Dark",
    shortPrompt: "Catch the sun going down early.",
    description: "It's 4 in the afternoon and the sun is already setting. Photograph the sunset while there's still daylight left on the clock.",
    mission: "“Photograph the sun setting while it is still afternoon.”",
    theAsk: "Capture photo evidence of the sun setting while it is still afternoon.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["sunset", "dark", "winter", "evening", "light"],
    proofRequirements: {
      requiredSubjects: ["sunset", "sky", "evening", "dark", "horizon"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true,
      // Sunset-only (Zach, Nov 27, 2026): "4 in the afternoon and the sun
      // is already setting" / "sun down before five" — the early winter
      // sunset. 3–6 PM local, a fixed-hour approximation. One-line
      // flippable.
      timeWindow: { startHour: 15, endHour: 18 }
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Catch the sunset." },
      Advanced: { points: 150, description: "Sun down before five." },
      Certified: { points: 175, description: "Sunset and streetlights, same frame." }
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
    theAsk: "Capture photo evidence of wrapping paper chaos — mid-tear or the aftermath.",
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
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Find the mess." },
      Advanced: { points: 150, description: "Mid-tear, paper flying." },
      Certified: { points: 175, description: "The aftermath — every box open." }
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
    theAsk: "Capture photo evidence of Thanksgiving and winter decor in the same frame.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 150,
    tags: ["mashup", "holidays", "table", "decorations", "family"],
    proofRequirements: {
      requiredSubjects: ["table", "decorations", "turkey", "tree", "menorah"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 150, description: "Two holidays, one frame." },
      Advanced: { points: 175, description: "Turkey and menorah, same table." },
      Certified: { points: 200, description: "Three holidays, one table." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "holiday-13",
    deckId: "gobble-and-glow",
    title: "Hot Drink Hands",
    shortPrompt: "Warm hands around a hot drink.",
    description: "Cocoa, cider, coffee — steam in the cold air, hands wrapped around the mug. The drink has to be steaming.",
    mission: "“Photograph hands holding a steaming hot drink.”",
    theAsk: "Capture photo evidence of hands holding a steaming hot drink.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["drink", "cocoa", "winter", "cold", "cozy"],
    proofRequirements: {
      requiredSubjects: ["mug", "steam", "drink", "hands", "cocoa"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 100, description: "Find the steam." },
      Advanced: { points: 125, description: "Steam in the cold air." },
      Certified: { points: 150, description: "Two mugs, two pairs of hands." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "holiday-14",
    deckId: "gobble-and-glow",
    title: "Pumpkin Aftermath",
    shortPrompt: "Find the pumpkin after Halloween.",
    description: "The jack-o'-lantern still on the porch in November, caving in on itself. The last pumpkin standing wins.",
    mission: "“Photograph a Halloween pumpkin still out after Halloween.”",
    theAsk: "Capture photo evidence of a Halloween pumpkin still out after Halloween.",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["pumpkin", "halloween", "fall", "porch", "funny"],
    proofRequirements: {
      requiredSubjects: ["pumpkin", "jack-o-lantern", "porch", "fall", "halloween"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true
    },
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 125, description: "Find the pumpkin." },
      Advanced: { points: 150, description: "Still on the porch in November." },
      Certified: { points: 175, description: "The last pumpkin standing." }
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
    theAsk: "Capture photo evidence of three generations of one family together.",
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
    proofNeeded: "Photo evidence or field note.",
    levels: {
      Standard: { points: 150, description: "Three generations, one frame." },
      Advanced: { points: 175, description: "All three, mid-laugh." },
      Certified: { points: 200, description: "Three generations, everyone in the frame." }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
];
