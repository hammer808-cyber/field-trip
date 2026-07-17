import type { Entry } from '../constants';

export type LoteriaCardCategory = 'people' | 'place' | 'object' | 'receipt' | 'wildcard';

export type LoteriaCard = {
  id: string;
  code: string;
  title: string;
  prompt: string;
  category: LoteriaCardCategory;
  icon: string;
  deckId: string;
  proofHint: string;
};

export type LoteriaBoard = {
  id: string;
  title: string;
  subtitle: string;
  deckId: string;
  cardCount: number;
  accent: 'orange' | 'lime' | 'cyan' | 'magenta';
  cards: LoteriaCard[];
};

export type LoteriaPlayerPanel = {
  displayName: string;
  fieldTypeLabel: string;
  levelLabel: string;
  xpProgressPercent: number;
};

const starterCards: LoteriaCard[] = [
  {
    id: 'starter-open-sign',
    code: 'LT-001',
    title: 'Open Sign',
    prompt: 'Find a sign that feels like an invitation.',
    category: 'place',
    icon: 'OPEN',
    deckId: 'starter-signals',
    proofHint: 'A photo where the sign is readable and clearly found outside.',
  },
  {
    id: 'starter-tiny-detail',
    code: 'LT-002',
    title: 'Tiny Detail',
    prompt: 'Spot something small that most people would walk past.',
    category: 'object',
    icon: 'EYE',
    deckId: 'starter-signals',
    proofHint: 'A close photo with enough surrounding context to verify it was found in the wild.',
  },
  {
    id: 'starter-color-pop',
    code: 'LT-003',
    title: 'Color Pop',
    prompt: 'Capture the loudest color in your path.',
    category: 'wildcard',
    icon: 'POP',
    deckId: 'starter-signals',
    proofHint: 'A photo where the color is the obvious star of the receipt.',
  },
  {
    id: 'starter-sidewalk-story',
    code: 'LT-004',
    title: 'Sidewalk Story',
    prompt: 'Find a sidewalk clue that hints something happened here.',
    category: 'place',
    icon: 'MAP',
    deckId: 'starter-signals',
    proofHint: 'A photo with a field note explaining the story you think it tells.',
  },
  {
    id: 'starter-weird-texture',
    code: 'LT-005',
    title: 'Weird Texture',
    prompt: 'Find a texture that looks dramatic up close.',
    category: 'object',
    icon: 'GRID',
    deckId: 'starter-signals',
    proofHint: 'A sharp image where the texture fills the frame without losing context.',
  },
  {
    id: 'starter-public-artifact',
    code: 'LT-006',
    title: 'Public Artifact',
    prompt: 'Find an object that clearly belongs to the public world.',
    category: 'receipt',
    icon: 'TAG',
    deckId: 'starter-signals',
    proofHint: 'A photo that shows the artifact and its surroundings.',
  },
  {
    id: 'starter-human-trace',
    code: 'LT-007',
    title: 'Human Trace',
    prompt: 'Find evidence that someone was here before you.',
    category: 'people',
    icon: 'TRACE',
    deckId: 'starter-signals',
    proofHint: 'No faces needed. Show the trace clearly and add a short note.',
  },
  {
    id: 'starter-shadow-play',
    code: 'LT-008',
    title: 'Shadow Play',
    prompt: 'Catch a shadow doing something interesting.',
    category: 'wildcard',
    icon: 'SUN',
    deckId: 'starter-signals',
    proofHint: 'A photo where the shadow shape is visible and intentional.',
  },
  {
    id: 'starter-final-stamp',
    code: 'LT-009',
    title: 'Final Stamp',
    prompt: 'Find one thing that sums up today in a single frame.',
    category: 'receipt',
    icon: 'STAMP',
    deckId: 'starter-signals',
    proofHint: 'A clear photo plus a field note that names the vibe.',
  },
];

const errandCards: LoteriaCard[] = [
  {
    id: 'errand-receipt-curl',
    code: 'LT-101',
    title: 'Receipt Curl',
    prompt: 'Find a receipt, label, or price tag with personality.',
    category: 'receipt',
    icon: 'SALE',
    deckId: 'errand-deck',
    proofHint: 'A readable proof photo. Hide private info before submitting.',
  },
  {
    id: 'errand-cart-corral',
    code: 'LT-102',
    title: 'Cart Corral',
    prompt: 'Capture the most dramatic cart situation nearby.',
    category: 'place',
    icon: 'CART',
    deckId: 'errand-deck',
    proofHint: 'A wide enough shot to show the scene, not just a random wheel.',
  },
  {
    id: 'errand-shelf-chaos',
    code: 'LT-103',
    title: 'Shelf Chaos',
    prompt: 'Find a shelf that has seen things.',
    category: 'object',
    icon: 'STACK',
    deckId: 'errand-deck',
    proofHint: 'Photo must show the shelf and what makes it weird.',
  },
  {
    id: 'errand-line-legend',
    code: 'LT-104',
    title: 'Line Legend',
    prompt: 'Spot a line, queue, or waiting zone with a story.',
    category: 'people',
    icon: 'LINE',
    deckId: 'errand-deck',
    proofHint: 'Avoid identifiable faces. Show the setup and explain the moment.',
  },
  {
    id: 'errand-parking-oracle',
    code: 'LT-105',
    title: 'Parking Oracle',
    prompt: 'Find parking-lot wisdom, confusion, or glory.',
    category: 'place',
    icon: 'PARK',
    deckId: 'errand-deck',
    proofHint: 'A real-world parking scene, sign, cart, cone, or clue.',
  },
  {
    id: 'errand-doorway-drama',
    code: 'LT-106',
    title: 'Doorway Drama',
    prompt: 'Find an entrance doing the most.',
    category: 'place',
    icon: 'DOOR',
    deckId: 'errand-deck',
    proofHint: 'The doorway or entry point should be the focus.',
  },
  {
    id: 'errand-snack-evidence',
    code: 'LT-107',
    title: 'Snack Evidence',
    prompt: 'Capture snack proof from the errand trail.',
    category: 'receipt',
    icon: 'BITE',
    deckId: 'errand-deck',
    proofHint: 'A snack, display, wrapper, or food-court clue with context.',
  },
  {
    id: 'errand-aisle-portal',
    code: 'LT-108',
    title: 'Aisle Portal',
    prompt: 'Find an aisle that feels like a tiny world.',
    category: 'wildcard',
    icon: 'AISLE',
    deckId: 'errand-deck',
    proofHint: 'A photo looking into or across the aisle.',
  },
  {
    id: 'errand-final-bag',
    code: 'LT-109',
    title: 'Final Bag',
    prompt: 'Show the final errand trophy.',
    category: 'object',
    icon: 'BAG',
    deckId: 'errand-deck',
    proofHint: 'A bag, basket, or carry-out moment. Keep personal info hidden.',
  },
];

export const LOTERIA_BOARDS: LoteriaBoard[] = [
  {
    id: 'starter-loteria',
    title: 'Starter Loteria',
    subtitle: 'A 3x3 field board for first signals and small proof hunts.',
    deckId: 'starter-signals',
    cardCount: starterCards.length,
    accent: 'orange',
    cards: starterCards,
  },
  {
    id: 'errand-chaos',
    title: 'Errand Chaos',
    subtitle: 'A quick board for stores, sidewalks, parking lots, and snack trails.',
    deckId: 'errand-deck',
    cardCount: errandCards.length,
    accent: 'lime',
    cards: errandCards,
  },
];

export function getLoteriaBoardById(boardId: string): LoteriaBoard | undefined {
  return LOTERIA_BOARDS.find((board) => board.id === boardId);
}

export function getDefaultLoteriaBoard(): LoteriaBoard {
  return LOTERIA_BOARDS[0];
}

export function getLoteriaCardById(board: LoteriaBoard, cardId: string): LoteriaCard | undefined {
  return board.cards.find((card) => card.id === cardId);
}

export function getCompletedCardIdsForBoard(entries: Entry[], board: LoteriaBoard): Set<string> {
  const completed = new Set<string>();
  const approvedStatuses = new Set(['approved', 'verified']);

  entries.forEach((entry) => {
    const status = String(entry.status || '').toLowerCase();
    if (!approvedStatuses.has(status)) return;
    if (entry.deckId !== board.deckId) return;

    const matchingCard = board.cards.find((card) => {
      const aliases = [
        entry.challengeId,
        entry.missionId,
        entry.tripId,
        entry.missionTitle,
        entry.tripTitle,
      ].filter(Boolean).map((value) => String(value).toLowerCase());

      return aliases.includes(card.id.toLowerCase()) || aliases.includes(card.title.toLowerCase());
    });

    if (matchingCard) completed.add(matchingCard.id);
  });

  return completed;
}

export function buildLoteriaPlayerPanel(input: {
  displayName?: string | null;
  username?: string | null;
  fieldTypeName?: string | null;
  xp?: number | null;
}): LoteriaPlayerPanel {
  const xp = Math.max(0, Number(input.xp || 0));
  const level = Math.max(1, Math.floor(xp / 1000) + 1);
  const xpProgressPercent = Math.min(100, Math.max(0, Math.round(((xp % 1000) / 1000) * 100)));

  return {
    displayName: input.displayName || input.username || 'Field Explorer',
    fieldTypeLabel: input.fieldTypeName || 'Urban Legend',
    levelLabel: `LVL ${level}`,
    xpProgressPercent,
  };
}

export function getRecentLoteriaMemories(entries: Entry[], limit = 4): Entry[] {
  return entries
    .filter((entry) => {
      const status = String(entry.status || '').toLowerCase();
      const hasMedia = Boolean(entry.imageUrl || entry.photoUrl || entry.mediaUrl || entry.storagePath || entry.photoStoragePath || entry.imageStoragePath);
      return (status === 'approved' || status === 'verified') && hasMedia;
    })
    .slice()
    .sort((a, b) => {
      const aTime = getEntryTime(a);
      const bTime = getEntryTime(b);
      return bTime - aTime;
    })
    .slice(0, limit);
}

function getEntryTime(entry: Entry): number {
  const value = entry.reviewedAt || entry.submittedAt || entry.createdAt;
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
