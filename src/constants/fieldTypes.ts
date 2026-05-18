export type FieldTypeId = 'captainClipboard' | 'mallRat' | 'mascota' | 'elondra' | 'lostCamper' | 'bigfoot';

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
  snag: string;
  snagDesc: string;
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
  'homecomingQueen': 'elondra',
  'Homecoming Queen': 'elondra',
  'theMascot': 'mascota',
  'the-mascot': 'mascota',
  'mascot': 'mascota',
  'Mascot': 'mascota',
  'The Mascot': 'mascota',
  'scout': 'lostCamper',
  'explorer': 'lostCamper',
  'persona': 'lostCamper', // Fallback
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
    perk: 'Double Check',
    perkDesc: 'Review points are doubled for perfectly documented entries.',
    snag: 'Documentation Duty',
    snagDesc: 'Must fill out extra field notes or points are withheld.',
    stamp: 'CLIPBOARD_CERTIFIED',
    badgeLabel: 'Taskmaster',
    emptyState: 'The clipboard is empty. This is unacceptable.',
    recommendedChallengeTags: ['organization', 'rules', 'timed', 'checklist'],
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800',
    avatarPath: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800',
    resultImagePath: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800',
    cardImagePath: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800',
    fullImagePath: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800',
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
    perk: 'AC Comfort',
    perkDesc: 'Bonus points for indoor urban locations or conditioned spaces.',
    snag: 'Vibe Shift',
    snagDesc: 'Outdoor missions during peak heat or rain earn fewer points.',
    stamp: 'MALL_CERTIFIED',
    badgeLabel: 'Aisle Oracle',
    emptyState: 'No activity. Are we at the arcade?',
    recommendedChallengeTags: ['social', 'public', 'crew', 'location', 'urban'],
    image: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?q=80&w=800',
    avatarPath: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?q=80&w=800',
    resultImagePath: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?q=80&w=800',
    cardImagePath: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?q=80&w=800',
    fullImagePath: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?q=80&w=800',
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
    perk: 'Spirit Boost',
    perkDesc: 'Bonus points for photos using props, costumes, or dynamic poses.',
    snag: 'Costume Failure',
    snagDesc: 'Points withheld if documentation lacks "flair" or visual drama.',
    stamp: 'MASCOT_APPROVED',
    badgeLabel: 'Hype Beast',
    emptyState: 'The stage is empty. Bring the energy.',
    recommendedChallengeTags: ['performance', 'aesthetic', 'social', 'bold'],
    image: 'https://images.unsplash.com/photo-1521017432531-fbd92d744264?q=80&w=800',
    avatarPath: 'https://images.unsplash.com/photo-1521017432531-fbd92d744264?q=80&w=800',
    resultImagePath: 'https://images.unsplash.com/photo-1521017432531-fbd92d744264?q=80&w=800',
    cardImagePath: 'https://images.unsplash.com/photo-1521017432531-fbd92d744264?q=80&w=800',
    fullImagePath: 'https://images.unsplash.com/photo-1521017432531-fbd92d744264?q=80&w=800',
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
    perk: 'Final Word',
    perkDesc: 'Extra points for detailed, witty field notes that tell a story.',
    snag: 'High Maintenance',
    snagDesc: 'Penalties for sub-par lighting or "basic" documentation.',
    stamp: 'DIVA_DIRECTIVE',
    badgeLabel: 'Dramaturg',
    emptyState: 'The script is unwritten. Start the drama.',
    recommendedChallengeTags: ['aesthetic', 'narrative', 'social', 'detailed'],
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=800',
    avatarPath: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=800',
    resultImagePath: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=800',
    cardImagePath: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=800',
    fullImagePath: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=800',
    fieldStrength: 'Narrative Authority',
    fieldRisk: 'Scathing Reviews',
    howToPlay: 'Own the narrative. Make every entry feel like a headline.',
    narration: 'TREVOR: "The dramatic pauses in your report are technically unscripted. Continue with caution."'
  },
  'lostCamper': {
    id: 'lostCamper',
    name: 'Lost Camper',
    shortLabel: 'Sightseer',
    campRole: 'The Detour Director',
    coreInstinct: 'Wander / Discover',
    description: 'You have mastered the art of the intentional wrong turn. Serendipity is your only authorized compass, and you find the best metadata where the map ends.',
    vibe: 'Curious, Confused, Lucky',
    perk: 'Happy Accident',
    perkDesc: 'Random chance to discover hidden artifacts or bonus points.',
    snag: 'Wrong Turn',
    snagDesc: 'Verification takes longer due to your "unconventional" paths.',
    stamp: 'SUCCESSFULLY_LOST',
    badgeLabel: 'Sightseer',
    emptyState: 'Map is upside down. Exactly where I want to be.',
    recommendedChallengeTags: ['exploration', 'solo', 'location', 'strange'],
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800',
    avatarPath: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800',
    resultImagePath: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800',
    cardImagePath: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800',
    fullImagePath: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800',
    fieldStrength: 'Uncanny Luck',
    fieldRisk: 'Getting actually lost',
    howToPlay: 'Embrace the detour. The best finds are rarely on the map.',
    narration: 'TREVOR: "You are currently 400 meters off-protocol. I trust you are finding something worth the bureaucratic effort."'
  },
  'bigfoot': {
    id: 'bigfoot',
    name: 'Bigfoot',
    shortLabel: 'Cryptid',
    campRole: 'The Perimeter Ghost',
    coreInstinct: 'Hide / Document',
    description: 'Silent, elusive, and perfectly framed in the shadows. You document the fringes of reality so the team doesn\'t have to look directly at them.',
    vibe: 'Solo, Elusive, Nature-First',
    perk: 'Ghost Signal',
    perkDesc: 'Bonus points for remote locations and avoiding other players.',
    snag: 'Blurry Evidence',
    snagDesc: 'Entries must be exceptionally clear or they risk being "unconfirmed."',
    stamp: 'SIGHTING_LOGGED',
    badgeLabel: 'Cryptid',
    emptyState: 'Undetected. Good.',
    recommendedChallengeTags: ['observation', 'photo', 'strange', 'fieldNotes', 'solo'],
    image: 'https://images.unsplash.com/photo-1448375033038-3f2517148d80?q=80&w=800',
    avatarPath: 'https://images.unsplash.com/photo-1448375033038-3f2517148d80?q=80&w=800',
    resultImagePath: 'https://images.unsplash.com/photo-1448375033038-3f2517148d80?q=80&w=800',
    cardImagePath: 'https://images.unsplash.com/photo-1448375033038-3f2517148d80?q=80&w=800',
    fullImagePath: 'https://images.unsplash.com/photo-1448375033038-3f2517148d80?q=80&w=800',
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
    snag: 'No Signature',
    snagDesc: 'Lacks specialized field advantages.',
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

export function normalizeFieldType(type: string | null | undefined): FieldTypeId {
  if (!type) return 'lostCamper'; // Default fallback
  
  if (FIELD_TYPES[type as FieldTypeId]) return type as FieldTypeId;
  
  if (FIELD_TYPE_ALIASES[type]) return FIELD_TYPE_ALIASES[type];
  
  // Try case-insensitive and hyphen normalization
  const normalized = type.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('clipboard')) return 'captainClipboard';
  if (normalized.includes('mallrat')) return 'mallRat';
  if (normalized.includes('mascot')) return 'mascota';
  if (normalized.includes('elondra') || normalized.includes('queen')) return 'elondra';
  if (normalized.includes('camper')) return 'lostCamper';
  if (normalized.includes('bigfoot')) return 'bigfoot';
  
  return 'lostCamper';
}
