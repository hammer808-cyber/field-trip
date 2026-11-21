import { ChallengeCard } from '../types/challenges';

const MOCK_TIME = new Date().toISOString();

/**
 * Urban Recon — the first location-adaptive deck (SPEC Nov 21, 2026,
 * BUILT Nov 21, 2026).
 *
 * Every card is a skeleton with three parts — Action + Place + Token:
 * the action is the verb, the place is the {place} slot the resolver
 * fills with a real named place near the player at draw time, and the
 * token is the memorable thing the photo/note must show. The place is
 * resolved by the API; the token is found on site. When resolution
 * finds nothing the card renders its genericDefault instead and never
 * blocks.
 *
 * Two cards are unslotted on purpose (no placeQuery): Transit Rush
 * (any stop — Places has no ridership data, so "busiest" is
 * unknowable) and Mural Hunt (find it yourself). They never touch the
 * resolver.
 *
 * No static locationTag: the tag is per-draw, built from the resolved
 * place at capture time (see src/logic/placeResolution.ts). No card
 * art yet — cards carry no `image`, so the SVG illustration fallback
 * covers them, same as Gobble & Glow's badges-by-design.
 *
 * XP follows the house ladder: easy 100, medium 125, hard 175.
 * 10 easy / 7 medium / 3 hard, 20 cards.
 */
export const URBAN_RECON_CHALLENGE_BANK: Partial<ChallengeCard>[] = [
  {
    id: "urban-01",
    deckId: "urban-recon",
    title: "City Hall Steps",
    shortPrompt: "Stand on the steps of {place}.",
    description: "Every city has a front door with its name on it. Find the steps, find the plaque or the lettering, and stand where the city does its official business.",
    mission: "“Stand on the front steps of {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "city-hall", "civic", "steps", "landmark"],
    locationAdaptive: {
      action: "Stand on the steps",
      token: "the plaque or lettering with the building's name",
      genericDefault: "a civic building",
      placeQuery: { googleType: "city_hall" },
    },
    proofRequirements: {
      requiredSubjects: ["city hall", "steps", "plaque", "civic building", "columns"],
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
    id: "urban-02",
    deckId: "urban-recon",
    title: "Lights on a Building",
    shortPrompt: "Photograph the lights on {place}.",
    description: "Somebody went to real trouble with those lights. Find the building doing the most and photograph the brightest single display, not the whole street.",
    mission: "“Photograph the holiday lights on {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "lights", "holiday", "building", "night"],
    locationAdaptive: {
      action: "Photograph the lights",
      token: "the brightest single display",
      genericDefault: "the brightest building nearby",
      placeQuery: { googleType: "tourist_attraction" },
    },
    proofRequirements: {
      requiredSubjects: ["holiday lights", "building", "lights", "decorations"],
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
    id: "urban-03",
    deckId: "urban-recon",
    title: "Market Morning",
    shortPrompt: "Buy one thing at {place}.",
    description: "Markets are the fastest way to learn a neighbourhood. Buy one thing — anything — and photograph what you bought where you bought it.",
    mission: "“Buy one thing at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "market", "food", "morning", "local"],
    locationAdaptive: {
      action: "Buy one thing",
      token: "the thing you bought",
      genericDefault: "a market stall",
      placeQuery: { googleType: "market", keyword: "farmers market" },
    },
    proofRequirements: {
      requiredSubjects: ["market", "stall", "produce", "farmers market"],
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
    id: "urban-04",
    deckId: "urban-recon",
    title: "Library Card",
    shortPrompt: "Hold up the book you picked at {place}.",
    description: "Walk in, pick a book off a shelf — any book — and hold it up at the entrance. The book is the token; the library is the place.",
    mission: "“Hold up the book you picked at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "library", "book", "reading", "civic"],
    locationAdaptive: {
      action: "Hold up the book you picked",
      token: "the book itself",
      genericDefault: "a library",
      placeQuery: { googleType: "library" },
    },
    proofRequirements: {
      requiredSubjects: ["library", "book", "entrance", "shelves"],
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
    id: "urban-05",
    deckId: "urban-recon",
    title: "Transit Rush",
    shortPrompt: "Catch the rush at any transit stop near you.",
    description: "Any stop counts — the rush is the point, not the station. Go at rush hour, catch the crowd at its peak, and get the departure board while it is working the hardest.",
    mission: "“Catch the rush at any transit stop near you.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "transit", "rush-hour", "city"],
    locationAdaptive: {
      action: "Catch the rush",
      token: "the departure board at its peak",
      genericDefault: "a transit stop",
    },
    proofRequirements: {
      requiredSubjects: ["transit stop", "departure board", "train", "bus", "station"],
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
    id: "urban-06",
    deckId: "urban-recon",
    title: "Mural Hunt",
    shortPrompt: "Find the biggest mural near you.",
    description: "No slot, no hints — find it yourself. The biggest mural near you, and the token is the part most people walk past: the artist's signature, or the smallest detail in the whole wall.",
    mission: "“Find the biggest mural near you.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "mural", "street-art", "find-it-yourself"],
    locationAdaptive: {
      action: "Find it yourself",
      token: "the mural's hidden signature or smallest detail",
      genericDefault: "a mural",
    },
    proofRequirements: {
      requiredSubjects: ["mural", "street art", "wall", "painting"],
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
    id: "urban-07",
    deckId: "urban-recon",
    title: "Park Bench View",
    shortPrompt: "Sit and look in {place}.",
    description: "Every park has one bench with the best view in it. Find that bench, sit down, and photograph exactly what it looks out on.",
    mission: "“Sit on the bench with the best view in {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "park", "bench", "view", "nature"],
    locationAdaptive: {
      action: "Sit and look",
      token: "the view from the bench",
      genericDefault: "a park",
      placeQuery: { googleType: "park" },
    },
    proofRequirements: {
      requiredSubjects: ["park", "bench", "view", "trees"],
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
    id: "urban-08",
    deckId: "urban-recon",
    title: "Corner Store Run",
    shortPrompt: "Buy the house specialty at {place}.",
    description: "Every corner store has one thing it sells better than anywhere else. Ask, or just watch what the regulars buy — then buy it yourself.",
    mission: "“Buy the house specialty at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "corner-store", "snack", "local", "shop"],
    locationAdaptive: {
      action: "Buy the house specialty",
      token: "the thing it sells best",
      genericDefault: "a corner store",
      placeQuery: { googleType: "convenience_store" },
    },
    proofRequirements: {
      requiredSubjects: ["corner store", "convenience store", "shop", "snacks"],
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
    id: "urban-09",
    deckId: "urban-recon",
    title: "Waterfront Walk",
    shortPrompt: "Walk to {place} at golden hour.",
    description: "Ocean, river, lake, pier — or a fountain, if that is the water your city has. Get there at golden hour and photograph the light on it.",
    mission: "“Walk to {place} at golden hour.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "waterfront", "golden-hour", "walk", "water"],
    locationAdaptive: {
      action: "Walk to the water at golden hour",
      token: "the light on the water",
      genericDefault: "the nearest waterfront",
      placeQuery: { keyword: "waterfront" },
    },
    proofRequirements: {
      requiredSubjects: ["waterfront", "water", "pier", "river", "fountain"],
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
    id: "urban-10",
    deckId: "urban-recon",
    title: "Crosswalk Rush",
    shortPrompt: "Cross with the crowd at {place}.",
    description: "Find the busiest crossing downtown and cross with the crowd — not alone at a quiet light, in the middle of the rush, when the whole street is moving at once.",
    mission: "“Cross with the crowd at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "easy",
    baseXP: 100,
    tags: ["urban-recon", "crosswalk", "downtown", "rush-hour", "city"],
    locationAdaptive: {
      action: "Cross with the crowd",
      token: "the busiest crossing",
      genericDefault: "a busy downtown crossing",
      placeQuery: { keyword: "downtown" },
    },
    proofRequirements: {
      requiredSubjects: ["crosswalk", "downtown", "street", "pedestrians"],
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
    id: "urban-11",
    deckId: "urban-recon",
    title: "Tallest View",
    shortPrompt: "Get to the top of {place}.",
    description: "Get to the highest publicly accessible point of the highest-rated attraction near you and photograph the view from up there. The token is the highest view you can get, not the building itself.",
    mission: "“Get to the highest view from {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["urban-recon", "view", "skyline", "tallest", "landmark"],
    locationAdaptive: {
      action: "Get to the top",
      token: "the highest view you can get",
      genericDefault: "the tallest building nearby",
      placeQuery: { googleType: "tourist_attraction", preferTopRated: true },
    },
    proofRequirements: {
      requiredSubjects: ["view", "skyline", "tall building", "observation"],
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
    id: "urban-12",
    deckId: "urban-recon",
    title: "Night Market Bite",
    shortPrompt: "Eat one thing after dark at {place}.",
    description: "Crew-friendly: bring people, split things, argue about the best stall. Eat one thing after dark and photograph the dish, not the crowd.",
    mission: "“Eat one thing after dark at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["urban-recon", "night-market", "food", "crew-friendly", "crew", "night"],
    locationAdaptive: {
      action: "Eat one thing after dark",
      token: "the dish",
      genericDefault: "a night market",
      placeQuery: { googleType: "market", keyword: "night market" },
    },
    proofRequirements: {
      requiredSubjects: ["night market", "food", "stall", "street food"],
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
    id: "urban-13",
    deckId: "urban-recon",
    title: "Hidden Staircase",
    shortPrompt: "Climb it in {place}.",
    description: "Parks hide staircases most people walk straight past. Find one, climb it, and photograph what is at the top — that is the token, not the stairs themselves.",
    mission: "“Climb the staircase most people walk past in {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["urban-recon", "staircase", "hidden", "park", "climb"],
    locationAdaptive: {
      action: "Climb it",
      token: "the staircase most people walk past",
      genericDefault: "a park",
      placeQuery: { googleType: "park" },
    },
    proofRequirements: {
      requiredSubjects: ["staircase", "stairs", "park", "steps"],
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
    id: "urban-14",
    deckId: "urban-recon",
    title: "Taco Truck Run",
    shortPrompt: "Grab a specialty drink at {place} with some friends.",
    description: "Crew-friendly: bring friends. Grab a specialty drink at the taco truck — the drink is the token, and the truck's name has to be in the shot.",
    mission: "“Grab a specialty drink at {place} with some friends.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["urban-recon", "taco-truck", "food-truck", "drink", "crew-friendly", "crew"],
    locationAdaptive: {
      action: "Grab a specialty drink, with friends",
      token: "the drink + the truck's name",
      genericDefault: "a food truck",
      placeQuery: { googleType: "restaurant", keyword: "taco truck" },
    },
    proofRequirements: {
      requiredSubjects: ["taco truck", "food truck", "drink", "tacos"],
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
    id: "urban-15",
    deckId: "urban-recon",
    title: "Oldest on the Menu",
    shortPrompt: "Order the oldest dish at {place}.",
    description: "Find the diner, then order the oldest dish on its menu — the one that has been there since the place opened. The dish is the token; ask the staff if you have to.",
    mission: "“Order the oldest dish at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["urban-recon", "diner", "menu", "food", "oldest"],
    locationAdaptive: {
      action: "Order the oldest dish",
      token: "the dish",
      genericDefault: "a diner",
      placeQuery: { googleType: "restaurant", keyword: "diner" },
    },
    proofRequirements: {
      requiredSubjects: ["diner", "restaurant", "menu", "dish", "food"],
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
    id: "urban-16",
    deckId: "urban-recon",
    title: "Postcard Home",
    shortPrompt: "Buy a postcard at {place}.",
    description: "Buy a postcard — a real one, from a rack — and photograph it. The postcard is the token: proof you stood in a shop that sells your city back to you.",
    mission: "“Buy a postcard at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["urban-recon", "postcard", "gift-shop", "souvenir", "shop"],
    locationAdaptive: {
      action: "Buy a postcard",
      token: "the postcard",
      genericDefault: "a gift shop",
      placeQuery: { googleType: "store", keyword: "gift shop" },
    },
    proofRequirements: {
      requiredSubjects: ["postcard", "gift shop", "souvenir", "store"],
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
    id: "urban-17",
    deckId: "urban-recon",
    title: "Busker's Encore",
    shortPrompt: "Tip a street performer at {place}.",
    description: "Find a street performer at the transit plaza, tip them, and stay for the song. The token is the song they played — name it in your field note.",
    mission: "“Tip a street performer at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "medium",
    baseXP: 125,
    tags: ["urban-recon", "busker", "music", "street-performer", "transit"],
    locationAdaptive: {
      action: "Tip a street performer",
      token: "the song they played",
      genericDefault: "a transit station",
      placeQuery: { googleType: "transit_station" },
    },
    proofRequirements: {
      requiredSubjects: ["street performer", "busker", "music", "musician"],
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
    id: "urban-18",
    deckId: "urban-recon",
    title: "Lights After Dark",
    shortPrompt: "Photograph {place} after dark.",
    description: "Same landmark, different city: after dark. This one only opens 6 PM to 6 AM — the lights are the token, and daylight does not count.",
    mission: "“Photograph {place} after dark.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 175,
    tags: ["urban-recon", "lights", "landmark", "night", "time-window"],
    locationAdaptive: {
      action: "Photograph after dark",
      token: "the lights",
      genericDefault: "a landmark",
      placeQuery: { googleType: "tourist_attraction" },
    },
    proofRequirements: {
      requiredSubjects: ["landmark", "lights", "night", "building"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true,
      timeWindow: { startHour: 18, endHour: 6 }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
  {
    id: "urban-19",
    deckId: "urban-recon",
    title: "Postcard Shot",
    shortPrompt: "Frame the shot at {place}.",
    description: "The place your city is most known for. Not the prettiest angle you can find — the shot everyone knows, framed your way. The view is the token.",
    mission: "“Frame the shot at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 175,
    tags: ["urban-recon", "landmark", "attraction", "postcard", "famous"],
    locationAdaptive: {
      action: "Frame the shot",
      token: "the view the city is known for",
      genericDefault: "the city's best-known spot",
      placeQuery: { googleType: "tourist_attraction", preferTopRated: true },
    },
    proofRequirements: {
      requiredSubjects: ["landmark", "attraction", "view", "famous"],
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
    id: "urban-20",
    deckId: "urban-recon",
    title: "Sunrise First Light",
    shortPrompt: "Be there at sunrise at {place}.",
    description: "This one only opens 5 to 8 AM. Be at the landmark or the waterfront when the first light hits it — the light itself is the token, and it does not wait.",
    mission: "“Be there at sunrise at {place}.”",
    proofType: ["photo"],
    lane: "seasonal",
    difficulty: "hard",
    baseXP: 175,
    tags: ["urban-recon", "sunrise", "landmark", "waterfront", "time-window", "morning"],
    locationAdaptive: {
      action: "Be there at sunrise",
      token: "first light hitting it",
      genericDefault: "a landmark",
      placeQuery: { googleType: "tourist_attraction" },
    },
    proofRequirements: {
      requiredSubjects: ["sunrise", "landmark", "morning light", "waterfront"],
      minConfidence: 0.4,
      requireLocation: true,
      requireTimestamp: true,
      timeWindow: { startHour: 5, endHour: 8 }
    },
    active: true,
    status: "approved",
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME
  },
];
