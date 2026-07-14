import { ChallengeCard, TripType } from '../types/challenges';

export const ERRAND_DECK_ID = 'errand-deck';
export const ERRAND_DECK_NAME = 'The Errand Deck';
export const ERRAND_DECK_SUBTITLE = 'A Fieldtrip Deck for Quick Stops, Side Quests, and Bags of Consequences';
export const ERRAND_DECK_SEASON = 'Evergreen';
export const ERRAND_DECK_SAFETY_NOTE = 'Faces optional. Consent required. Avoid photographing strangers directly. Avoid showing license plates, addresses, payment details, or private information.';

type ErrandCardType = 'Signal' | 'Proof' | 'Crew' | 'Receipt' | 'Lore';

interface ErrandCardDefinition {
  id: string;
  cardType: ErrandCardType;
  title: string;
  trevorLine: string;
  mission: string;
  proofRequired: string;
  allowedProof: string[];
  fieldNotePrompt: string;
  bonusPrompt: string;
  baseXp: number;
  bonusXp: number;
  tags: string[];
}

const CARD_DEFINITIONS: ErrandCardDefinition[] = [
  {
    id: 'errand-deck-01',
    cardType: 'Signal',
    title: 'Aisle Oracle',
    trevorLine: 'The shelf has spoken, and unfortunately it has opinions.',
    mission: 'Find something in an aisle, display, shelf, rack, counter, bin, or menu that feels like it is giving advice.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['object', 'shelf', 'display', 'sign', 'menu', 'counter', 'cart', 'basket', 'scene'],
    fieldNotePrompt: 'The oracle says...',
    bonusPrompt: 'Explain whether you trust the message.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['errand', 'signal', 'aisle', 'object', 'anywhere'],
  },
  {
    id: 'errand-deck-02',
    cardType: 'Signal',
    title: 'Parking Lot Ecology',
    trevorLine: 'The wild shopping cart returns to its natural habitat.',
    mission: 'Capture a parking lot, curb, entrance, cart corral, sidewalk, bike rack, bench, or outside detail that proves errands have their own ecosystem.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['parking-lot', 'cart', 'curb', 'entrance', 'sidewalk', 'bench', 'sign', 'scene', 'aftermath'],
    fieldNotePrompt: 'The local ecosystem includes...',
    bonusPrompt: 'Name the dominant species.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['errand', 'signal', 'parking-lot', 'outside'],
  },
  {
    id: 'errand-deck-03',
    cardType: 'Signal',
    title: 'Impulse Portal',
    trevorLine: 'You were not supposed to look directly at it.',
    mission: 'Find the thing clearly designed to make someone buy, grab, snack, upgrade, browse, or make a tiny mistake.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['object', 'display', 'snack', 'sign', 'counter', 'rack', 'checkout', 'menu', 'cart'],
    fieldNotePrompt: 'The portal tried to tempt me with...',
    bonusPrompt: 'Confess whether it worked.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['errand', 'signal', 'impulse', 'receipt'],
  },
  {
    id: 'errand-deck-04',
    cardType: 'Proof',
    title: 'Errand Goblin Sighting',
    trevorLine: 'The creature has entered the automatic doors.',
    mission: 'Capture proof that you personally entered the errand zone.',
    proofRequired: 'Submit one photo. Face optional.',
    allowedProof: ['self', 'shoes', 'hand', 'shadow', 'reflection', 'outfit', 'bag', 'cart', 'basket', 'receipt', 'drink'],
    fieldNotePrompt: 'The goblin was last seen...',
    bonusPrompt: 'Describe your current errand form.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['proof', 'self', 'errand', 'presence'],
  },
  {
    id: 'errand-deck-05',
    cardType: 'Proof',
    title: 'One Thing, Allegedly',
    trevorLine: 'A beautiful lie told by brave fools everywhere.',
    mission: 'Capture proof of the thing you came for, the thing you got instead, or the moment the mission started mutating.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['object', 'cart', 'basket', 'receipt', 'bag', 'shelf', 'self', 'crew', 'aftermath'],
    fieldNotePrompt: 'I came for one thing, allegedly...',
    bonusPrompt: 'Reveal the first betrayal.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['proof', 'errand', 'one-thing', 'receipt'],
  },
  {
    id: 'errand-deck-06',
    cardType: 'Proof',
    title: 'Checkout Face, Optional',
    trevorLine: 'This is the face of someone meeting consequences.',
    mission: 'Capture the checkout, counter, line, receipt, bag, payment moment, waiting moment, or emotional aftermath of completing the errand.',
    proofRequired: 'Submit one photo. Face optional.',
    allowedProof: ['receipt', 'bag', 'counter', 'line', 'checkout', 'hand', 'self', 'crew', 'waiting', 'aftermath'],
    fieldNotePrompt: 'At checkout, I realized...',
    bonusPrompt: 'Add the final total emotionally, not financially.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['proof', 'checkout', 'receipt', 'errand'],
  },
  {
    id: 'errand-deck-07',
    cardType: 'Crew',
    title: 'Errand Chaperone',
    trevorLine: 'Someone came along and made this less normal.',
    mission: 'Capture the friend, pet, partner, sibling, parent, kid, plush, drink, bag, or unofficial mascot accompanying the errand.',
    proofRequired: 'Submit one photo. Faces optional.',
    allowedProof: ['crew', 'pet', 'friend', 'family', 'hands', 'shoes', 'shadow', 'reflection', 'bag', 'drink', 'mascot'],
    fieldNotePrompt: "Today's chaperone brought...",
    bonusPrompt: 'Assign them an official errand title.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['crew', 'companion', 'errand', 'pet'],
  },
  {
    id: 'errand-deck-08',
    cardType: 'Crew',
    title: 'Cart Council',
    trevorLine: 'The council will now debate snacks, budgets, and nonsense.',
    mission: 'Capture the group decision-making moment: cart, basket, shelf debate, menu debate, receipt review, snack choice, or someone silently judging.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['crew', 'cart', 'basket', 'shelf', 'menu', 'snack', 'receipt', 'hands', 'table', 'aftermath'],
    fieldNotePrompt: 'The council decided...',
    bonusPrompt: 'Record the dissenting opinion.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['crew', 'cart', 'decision', 'errand'],
  },
  {
    id: 'errand-deck-09',
    cardType: 'Crew',
    title: 'Waiting Area Weather',
    trevorLine: 'Everyone is fine, except spiritually.',
    mission: 'Capture the emotional climate of waiting: line, bench, car, pickup spot, pharmacy chair, counter, laundromat, lobby, or parking lot pause.',
    proofRequired: 'Submit one photo. Faces optional.',
    allowedProof: ['crew', 'line', 'bench', 'car', 'waiting-area', 'chair', 'counter', 'lobby', 'parking-lot', 'self'],
    fieldNotePrompt: 'Current waiting conditions: ___.',
    bonusPrompt: 'Add a fake advisory.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['crew', 'waiting', 'errand', 'mood'],
  },
  {
    id: 'errand-deck-10',
    cardType: 'Receipt',
    title: 'Bag of Consequences',
    trevorLine: "You bought it. Or carried it. Or enabled it. Either way, there's a bag now.",
    mission: 'Capture proof of something acquired, carried, packed, hauled, returned, exchanged, or regretted.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['shopping-bag', 'tote', 'backpack', 'purse', 'basket', 'box', 'leftovers', 'return', 'receipt', 'cart'],
    fieldNotePrompt: 'Inside this bag is...',
    bonusPrompt: "Rate the bag's dramatic weight.",
    baseXp: 100,
    bonusXp: 25,
    tags: ['receipt', 'bag', 'errand', 'proof'],
  },
  {
    id: 'errand-deck-11',
    cardType: 'Receipt',
    title: 'Receipt Archaeology',
    trevorLine: 'A thin paper scroll containing your recent choices.',
    mission: 'Capture a receipt, order screen, pickup label, bag label, ticket, tag, list, or proof of transaction without exposing private information.',
    proofRequired: 'Submit one photo. Hide personal/payment details.',
    allowedProof: ['receipt', 'label', 'ticket', 'tag', 'list', 'order', 'bag', 'pickup', 'screen'],
    fieldNotePrompt: 'The artifact reveals...',
    bonusPrompt: 'Translate the receipt into a life lesson.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['receipt', 'transaction', 'errand', 'proof'],
  },
  {
    id: 'errand-deck-12',
    cardType: 'Receipt',
    title: 'Emotional Support Beverage',
    trevorLine: 'Some errands require hydration with a personality.',
    mission: 'Capture the drink helping someone complete, survive, avoid, or recover from the errand.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['drink', 'cup', 'bottle', 'straw', 'coffee', 'smoothie', 'water', 'fountain-drink', 'cooler', 'car-cupholder'],
    fieldNotePrompt: 'This beverage is currently providing...',
    bonusPrompt: "Name the beverage's job title.",
    baseXp: 100,
    bonusXp: 25,
    tags: ['receipt', 'drink', 'errand', 'support'],
  },
  {
    id: 'errand-deck-13',
    cardType: 'Receipt',
    title: 'The Second Stop',
    trevorLine: 'One errand has become a franchise.',
    mission: 'Capture proof that this errand grew another errand.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['car', 'parking-lot', 'bag', 'receipt', 'sign', 'snack', 'map', 'crew', 'pet', 'second-location'],
    fieldNotePrompt: 'Then we also had to...',
    bonusPrompt: 'Explain who caused the sequel.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['receipt', 'second-stop', 'side-quest', 'errand'],
  },
  {
    id: 'errand-deck-14',
    cardType: 'Lore',
    title: 'The Errand Fought Back',
    trevorLine: 'Some tasks do not go quietly.',
    mission: 'Capture proof that the errand became harder, stranger, longer, funnier, more expensive, or more dramatic than expected.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['line', 'sign', 'closed-door', 'receipt', 'cart', 'bag', 'detour', 'crew', 'pet', 'aftermath'],
    fieldNotePrompt: 'The errand fought back when...',
    bonusPrompt: 'Name the battle.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['lore', 'chaos', 'errand', 'story'],
  },
  {
    id: 'errand-deck-15',
    cardType: 'Lore',
    title: 'Add It to the Errand Lore',
    trevorLine: 'Not all legends happen in forests. Some happen near a return counter.',
    mission: 'Capture anything from this errand that future-you or the group chat would want remembered.',
    proofRequired: 'Submit one photo.',
    allowedProof: ['person', 'pet', 'object', 'place', 'food', 'sign', 'scene', 'outfit', 'receipt', 'view', 'shadow', 'aftermath'],
    fieldNotePrompt: 'This belongs in the errand lore because...',
    bonusPrompt: 'Name the chapter.',
    baseXp: 100,
    bonusXp: 25,
    tags: ['lore', 'memory', 'errand', 'chapter'],
  },
];

function getTripType(cardType: ErrandCardType): TripType {
  if (cardType === 'Crew') return 'Crew Challenge';
  if (cardType === 'Proof' || cardType === 'Receipt') return 'Evidence Challenge';
  return 'Field Challenge';
}

export const ERRAND_DECK_CHALLENGE_BANK: Partial<ChallengeCard>[] = CARD_DEFINITIONS.map(card => {
  const type = getTripType(card.cardType);

  return {
    ...card,
    missionId: card.id,
    challengeId: card.id,
    deckId: ERRAND_DECK_ID,
    deckName: ERRAND_DECK_NAME,
    deckSubtitle: ERRAND_DECK_SUBTITLE,
    season: ERRAND_DECK_SEASON,
    safetyNote: ERRAND_DECK_SAFETY_NOTE,
    isActive: true,
    category: type,
    type,
    lane: 'core',
    description: card.mission,
    theAsk: card.mission,
    difficulty: card.cardType === 'Lore' ? 'medium' : 'easy',
    estimatedTimeMinutes: 10,
    baseXP: card.baseXp,
    basePoints: card.baseXp,
    proofType: ['photo'],
    requiredProof: ['photo'],
    active: true,
    status: 'approved',
    mode: 'flexible',
    isCrewCompatible: true,
    seasonAvailability: [ERRAND_DECK_ID],
    findingTypes: [...card.allowedProof],
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    levels: {
      Standard: { points: card.baseXp, description: card.proofRequired },
      Advanced: { points: card.baseXp + card.bonusXp, description: card.bonusPrompt },
      Certified: { points: card.baseXp + card.bonusXp * 2, description: 'Trevor stamp of approval.' },
    },
    safetyRules: [ERRAND_DECK_SAFETY_NOTE],
  };
});
