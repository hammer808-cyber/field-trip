export type FieldTypeId = 'captainClipboard' | 'mallRat' | 'mascota' | 'elondra' | 'theGobbler' | 'bigfoot' | 'unclassified';

export interface FieldType {
  id: FieldTypeId;
  name: string;
  shortLabel: string;
  campRole: string;
  coreInstinct: string;
  description: string;
  vibe: string;
  perk: string;
  perkDesc: string;
  blindSpot: string;
  blindSpotDesc: string;
  stamp: string;
  badgeLabel: string;
  emptyState: string;
  recommendedChallengeTags: string[];
  image: string; // Legacy field for existing code
  avatarPath: string;
  resultImagePath: string;
  cardImagePath: string;
  fullImagePath: string;
  fieldStrength: string;
  fieldRisk: string;
  howToPlay: string;
  narration: string;
  firstTripId?: string;
}

export const FIELD_TYPE_ALIASES: Record<string, FieldTypeId> = {
  'theaterDropout': 'elondra',
  'theMascot': 'mascota',
  'the-mascot': 'mascota',
  'organzied': 'captainClipboard',
  'strict': 'captainClipboard',
  'homecomingQueen': 'elondra',
  'observe': 'mallRat',
  'explorer': 'bigfoot',
  'aloof': 'bigfoot', // Fallback
  'lostCamper': 'bigfoot',
  'evidenceGoblin': 'theGobbler',
};

export const FIELD_TYPES: Record<FieldTypeId | 'unclassified', FieldType> = {
  'captainClipboard': {
    id: 'captainClipboard',
    name: 'Captain Clipboard',
    shortLabel: 'Taskmaster',
    campRole: 'The Routine Architect',
    coreInstinct: 'Organize / Standardize',
    description: 'The primary curator of the Fieldtrip rulebook. Every mission is a masterpiece of documentation and every deviation is a note-in-waiting.',
    vibe: 'Organized, Methodical, Authoritative',
    perk: 'Receipts Department',
    perkDesc: 'Earn +25 when your entry is detailed, organized, ranked, reviewed, compared, audited, list-style, or rule-based.',
    blindSpot: 'Dislikes Vague Evidence',
    blindSpotDesc: 'Short, chaotic, or unclear entries do not trigger your Field Type Bonus unless you add structure, details, or a clear observation.',
    stamp: 'CLIPBOARD_CERTIFIED',
    badgeLabel: 'Taskmaster',
    emptyState: 'The clipboard is empty. This is unacceptable.',
    recommendedChallengeTags: ['organization', 'rules', 'timed', 'checklist'],
    image: '/assets/characters/captainClipboard/results.png',
    avatarPath: '/assets/characters/captainClipboard/avatar.png',
    resultImagePath: '/assets/characters/captainClipboard/results.png',
    cardImagePath: '/assets/characters/captainClipboard/card.png',
    fullImagePath: '/assets/characters/captainClipboard/full.png',
    fieldStrength: 'High Fidelity Documentation',
    fieldRisk: 'Analysis Paralysis',
    howToPlay: 'Stick to the rules. Document the flow, not just the results.',
    narration: 'TREVOR: "Your filing speed is 12% above group average. Do not let the efficiency go to your head."'
  },
  'mallRat': {
    id: 'mallRat',
    name: 'Mall Rat',
    shortLabel: 'Aisle Oracle',
    campRole: 'The Plaza Prophet',
    coreInstinct: 'Loiter / Observe',
    description: 'You decode the sacred geometry of the shopping mall. You are a local oracle, finding high-signal metadata in the echo of the food court.',
    vibe: 'Social, Chill, Consumer-Adjacent',
    perk: 'Found Culture Radar',
    perkDesc: 'Earn +25 when your entry captures social scenes, public weirdness, overheard moments, shopping-center lore, crowd energy, or local culture.',
    blindSpot: 'Needs a Scene',
    blindSpotDesc: 'Generic solo, nature, or object posts do not trigger your Field Type Bonus unless you explain the social context.',
    stamp: 'MALL_CERTIFIED',
    badgeLabel: 'Aisle Oracle',
    emptyState: 'No activity. Are we at the arcade?',
    recommendedChallengeTags: ['social', 'public', 'crew', 'location', 'urban'],
    image: '/assets/characters/mallRat/results.png',
    avatarPath: '/assets/characters/mallRat/avatar.png',
    resultImagePath: '/assets/characters/mallRat/results.png',
    cardImagePath: '/assets/characters/mallRat/card.png',
    fullImagePath: '/assets/characters/mallRat/full.png',
    fieldStrength: 'Urban Camouflage',
    fieldRisk: 'Distraction by Snacks',
    howToPlay: 'Find the scene. If there is a food court nearby, you are winning.',
    narration: 'TREVOR: "The smell of soft pretzels is not technically a field signal, but I will allow it for now."'
  },
  'mascota': {
    id: 'mascota',
    name: 'Mascota',
    shortLabel: 'Hype Beast',
    campRole: 'The Spirit Specialist',
    coreInstinct: 'Hype / Perform',
    description: 'You are the living, breathing hype-machine of the sector. You don\'t just complete missions—you perform them with maximum kitsch and unshakeable shimmer.',
    vibe: 'Performative, Energetic, Kitschy',
    perk: 'Hype Engine',
    perkDesc: 'Earn +25 when your entry captures groups, events, performances, celebrations, team energy, hype, or big public moments.',
    blindSpot: 'Needs Momentum',
    blindSpotDesc: 'Quiet, static, or low-context entries do not trigger your Field Type Bonus unless your note explains why the moment matters.',
    stamp: 'MASCOT_APPROVED',
    badgeLabel: 'Hype Beast',
    emptyState: 'The stage is empty. Bring the energy.',
    recommendedChallengeTags: ['performance', 'aesthetic', 'social', 'bold'],
    image: '/assets/characters/mascota/results.png',
    avatarPath: '/assets/characters/mascota/avatar.png',
    resultImagePath: '/assets/characters/mascota/results.png',
    cardImagePath: '/assets/characters/mascota/card.png',
    fullImagePath: '/assets/characters/mascota/full.png',
    fieldStrength: 'Unshakeable Morale',
    fieldRisk: 'Over-the-top antics',
    howToPlay: 'Be the main character. Every photo is a performance.',
    narration: 'TREVOR: "Your energy levels are alarming the local pigeons. Try to maintain a professional shimmer."'
  },
  'elondra': {
    id: 'elondra',
    name: 'Elondra',
    shortLabel: 'Dramaturg',
    campRole: 'The Narrative Lead',
    coreInstinct: 'Drama / Narrate',
    description: 'A main character by design and a critic by calling. You lead with a sharp eye and even sharper field notes, turning every audit into a dramatic event.',
    vibe: 'Sophisticated, Dramatic, Sharp',
    perk: 'Main Character Lens',
    perkDesc: 'Earn +25 when your entry has strong aesthetics, drama, fashion, nightlife, glam, composition, mood, or visual attitude.',
    blindSpot: 'No Vibe, No Crown',
    blindSpotDesc: 'Plain documentation or low-effort snapshots do not trigger your Field Type Bonus unless you add a strong mood, visual choice, or dramatic framing.',
    stamp: 'DIVA_DIRECTIVE',
    badgeLabel: 'Dramaturg',
    emptyState: 'The script is unwritten. Start the drama.',
    recommendedChallengeTags: ['aesthetic', 'narrative', 'social', 'detailed'],
    image: '/assets/characters/elondra/results.png',
    avatarPath: '/assets/characters/elondra/avatar.png',
    resultImagePath: '/assets/characters/elondra/results.png',
    cardImagePath: '/assets/characters/elondra/card.png',
    fullImagePath: '/assets/characters/elondra/full.png',
    fieldStrength: 'Narrative Authority',
    fieldRisk: 'Scathing Reviews',
    howToPlay: 'Own the narrative. Make every entry feel like a headline.',
    narration: 'TREVOR: "The dramatic pauses in your report are technically unscripted. Continue with caution."'
  },
  'theGobbler': {
    id: 'theGobbler',
    name: 'The Gobbler',
    shortLabel: 'Proof Fiend',
    campRole: 'The Material Harvester',
    coreInstinct: 'Gobble / Hoard',
    description: 'Driven by an insatiable hunger for raw evidence. You swallow missions whole, hoarding proofs like glittering gems in your digital lair.',
    vibe: 'Voracious, Relentless, Chaotic',
    perk: 'Insatiable Index',
    perkDesc: 'Earn +25 when your entry contains multiple proofs, extra details, hidden findings, or chaotic energy that others ignore.',
    blindSpot: 'Overconsumption',
    blindSpotDesc: 'Plain, low-context, or half-hearted entries do not trigger your Field Type Bonus unless you add some real vigor and deep description.',
    stamp: 'GOBBLER_CONQUERED',
    badgeLabel: 'The Gobbler',
    emptyState: 'A hollow silence reigns. Time to consume some challenges.',
    recommendedChallengeTags: ['exploration', 'photo', 'strange', 'bold'],
    image: '/assets/characters/theGobbler/results.png',
    avatarPath: '/assets/characters/theGobbler/avatar.png',
    resultImagePath: '/assets/characters/theGobbler/results.png',
    cardImagePath: '/assets/characters/theGobbler/card.png',
    fullImagePath: '/assets/characters/theGobbler/full.png',
    fieldStrength: 'Chaotic Volition',
    fieldRisk: 'Hoarding Junk Data',
    howToPlay: 'Consume everything. No detail is too small, no proof too strange.',
    narration: 'TREVOR: "Your download speed is impressive, but your digital digestion is absolutely terrifying."'
  },
  'bigfoot': {
    id: 'bigfoot',
    name: 'Bigfoot',
    shortLabel: 'Cryptid',
    campRole: 'The Perimeter Ghost',
    coreInstinct: 'Hide / Document',
    description: 'Silent, elusive, and perfectly framed in the shadows. You document the fringes of reality so the team doesn\'t have to look directly at them.',
    vibe: 'Solo, Elusive, Nature-First',
    perk: 'Off-Trail Evidence',
    perkDesc: 'Earn +25 when your entry captures exploration, outdoor finds, hidden places, trails, strange locations, wandering, or nature evidence.',
    blindSpot: 'Hates the Obvious',
    blindSpotDesc: 'Basic indoor, staged, selfie-style, or overly obvious entries do not trigger your Field Type Bonus unless they reveal something hidden or overlooked.',
    stamp: 'SIGHTING_LOGGED',
    badgeLabel: 'Cryptid',
    emptyState: 'Undetected. Good.',
    recommendedChallengeTags: ['observation', 'photo', 'strange', 'fieldNotes', 'solo'],
    image: '/assets/characters/bigfoot/results.png',
    avatarPath: '/assets/characters/bigfoot/avatar.png',
    resultImagePath: '/assets/characters/bigfoot/results.png',
    cardImagePath: '/assets/characters/bigfoot/card.png',
    fullImagePath: '/assets/characters/bigfoot/full.png',
    fieldStrength: 'Stealth Documentation',
    fieldRisk: 'Total Isolation',
    howToPlay: 'Stay in the shadows. Document the things others are too busy talking to see.',
    narration: 'TREVOR: "I can barely see you on the satellite feed. Excellent work. Stay undetected."'
  },
  'unclassified': {
    id: 'unclassified' as any,
    name: 'Unclassified',
    shortLabel: 'Recruit',
    campRole: 'Field Talent',
    coreInstinct: 'Adapt',
    description: 'Awaiting classification. HQ is still processing your behavioral profile.',
    vibe: 'Neutral, observing, flexible',
    perk: 'Base Method',
    perkDesc: 'Standard Fieldtrip rewards and rules apply.',
    blindSpot: 'No Signature',
    blindSpotDesc: 'Lacks specialized field advantages.',
    stamp: 'Pending Classification',
    badgeLabel: 'New Recruit',
    emptyState: 'Mission queue empty. Draw a card to begin.',
    recommendedChallengeTags: ['starter', 'basics'],
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=800',
    avatarPath: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=800',
    resultImagePath: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=800',
    cardImagePath: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=800',
    fullImagePath: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=800',
    fieldStrength: 'Flexibility',
    fieldRisk: 'Lack of Identity',
    howToPlay: 'Complete the classification quiz to unlock your field potential.',
    narration: 'TREVOR: "Your identity is still being processed. Please wait in the designated lounge area."'
  }
};

export function normalizePersonaKey(personaKey: string | null | undefined): FieldTypeId {
  if (!personaKey) return 'unclassified';
  
  if (personaKey === 'lostCamper') return 'bigfoot';
  if (personaKey === 'evidenceGoblin') return 'theGobbler';
  if (personaKey === 'mallRat') return 'mallRat';
  if (personaKey === 'mascota') return 'mascota';
  if (personaKey === 'bigfoot') return 'bigfoot';
  if (personaKey === 'captainClipboard') return 'captainClipboard';
  if (personaKey === 'elondra') return 'elondra';
  if (personaKey === 'theGobbler') return 'theGobbler';

  return normalizeFieldType(personaKey);
}

export function normalizeFieldType(type: string | null | undefined): FieldTypeId {
  if (!type) return 'unclassified'; // Default fallback
  
  // Safe legacy mapping layer
  if (type === 'lostCamper') return 'bigfoot';
  if (type === 'evidenceGoblin') return 'theGobbler';
  
  if (FIELD_TYPES[type as FieldTypeId]) return type as FieldTypeId;
  
  if (FIELD_TYPE_ALIASES[type]) return FIELD_TYPE_ALIASES[type];
  
  // Try case-insensitive and hyphen normalization
  const normalized = type.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('clipboard')) return 'captainClipboard';
  if (normalized.includes('mallrat')) return 'mallRat';
  if (normalized.includes('mascot')) return 'mascota';
  if (normalized.includes('elondra') || normalized.includes('queen')) return 'elondra';
  if (normalized.includes('camper')) return 'bigfoot';
  if (normalized.includes('gobbler') || normalized.includes('goblin')) return 'theGobbler';
  if (normalized.includes('bigfoot')) return 'bigfoot';
  
  return 'unclassified';
}
