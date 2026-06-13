export interface StickerMetadata {
  id: string;
  src: string;
  alt: string;
  category: 'mission' | 'reward' | 'persona' | 'utility' | 'seasonal' | 'weekly' | 'deck' | 'status';
  theme: 'retro' | 'military' | 'summer' | 'neon' | 'classic' | 'cyber';
  recommendedPlacement: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center' | 'corner';
  deckId?: string;
  personaId?: string;
  emoji: string;
  color: string; // Tailwind bg color class for fallback
  textColor: string; // Tailwind text color class
  label: string;
}

export const STICKER_REGISTRY: StickerMetadata[] = [
  {
    id: 'sticker_photo_proof',
    src: '/assets/rewards/stickers/sticker_photo_proof.png',
    alt: 'Photo Evidence Certified Sticker',
    category: 'mission',
    theme: 'classic',
    recommendedPlacement: 'top-right',
    emoji: '📸',
    color: 'bg-brand-lime',
    textColor: 'text-black',
    label: 'PHOTO CERTIFIED'
  },
  {
    id: 'sticker_field_note',
    src: '/assets/rewards/stickers/sticker_field_note.png',
    alt: 'Field Notebook Certified Sticker',
    category: 'mission',
    theme: 'classic',
    recommendedPlacement: 'bottom-left',
    emoji: '📝',
    color: 'bg-yellow-100',
    textColor: 'text-yellow-900',
    label: 'FIELD NOTE'
  },
  {
    id: 'sticker_weird_find',
    src: '/assets/rewards/stickers/sticker_weird_find.png',
    alt: 'Weird Finding Anomalous Sticker',
    category: 'mission',
    theme: 'retro',
    recommendedPlacement: 'top-left',
    emoji: '👽',
    color: 'bg-[#9333EA]',
    textColor: 'text-white',
    label: 'WEIRD FIND'
  },
  {
    id: 'first-field-note',
    src: '/assets/rewards/stickers/first_field_note.png',
    alt: 'First Field Record Logged Sticker',
    category: 'mission',
    theme: 'classic',
    recommendedPlacement: 'bottom-right',
    emoji: '🎒',
    color: 'bg-[#FED7AA]',
    textColor: 'text-[#7C2D12]',
    label: 'FIRST RECORD'
  },
  {
    id: 'heatwave-starter',
    src: '/assets/rewards/stickers/summer_starter.png',
    alt: 'Heatwave Expedition Starter Sticker',
    category: 'seasonal',
    theme: 'summer',
    recommendedPlacement: 'top-right',
    deckId: 'heatwave-receipts',
    emoji: '☀️',
    color: 'bg-brand-orange',
    textColor: 'text-white',
    label: 'HEATWAVE RECEIPTS'
  },
  {
    id: 'persona-captain-clipboard',
    src: '/assets/rewards/stickers/captain_clipboard.png',
    alt: 'Captain Clipboard Persona Badge',
    category: 'persona',
    theme: 'military',
    recommendedPlacement: 'bottom-right',
    personaId: 'persona-captain-clipboard',
    emoji: '📋',
    color: 'bg-slate-300',
    textColor: 'text-slate-800',
    label: 'CAPTAIN'
  },
  {
    id: 'persona-mall-rat',
    src: '/assets/rewards/stickers/mall_rat.png',
    alt: 'Mall Rat Explorer Persona Badge',
    category: 'persona',
    theme: 'neon',
    recommendedPlacement: 'bottom-left',
    personaId: 'persona-mall-rat',
    emoji: '🐀',
    color: 'bg-indigo-200',
    textColor: 'text-indigo-900',
    label: 'MALL RAT'
  },
  {
    id: 'persona-homecoming-queen',
    src: '/assets/rewards/stickers/homecoming_queen.png',
    alt: 'Homecoming Queen Catalyst Persona Badge',
    category: 'persona',
    theme: 'retro',
    recommendedPlacement: 'top-right',
    personaId: 'persona-homecoming-queen',
    emoji: '👑',
    color: 'bg-pink-300',
    textColor: 'text-pink-900',
    label: 'H.Q.'
  },
  {
    id: 'persona-the-gobbler',
    src: '/assets/rewards/stickers/the_gobbler.png',
    alt: 'The Gobbler Persona Badge',
    category: 'persona',
    theme: 'classic',
    recommendedPlacement: 'top-left',
    personaId: 'persona-the-gobbler',
    emoji: '👾',
    color: 'bg-brand-orange/20',
    textColor: 'text-brand-orange',
    label: 'THE GOBBLER'
  },
  {
    id: 'persona-bigfoot',
    src: '/assets/rewards/stickers/bigfoot.png',
    alt: 'Bigfoot Lone Cryptid Persona Badge',
    category: 'persona',
    theme: 'classic',
    recommendedPlacement: 'bottom-right',
    personaId: 'persona-bigfoot',
    emoji: '👣',
    color: 'bg-[#1E293B]',
    textColor: 'text-[#FFFDF5]',
    label: 'BIGFOOT'
  },
  {
    id: 'weekly-bonus-booster',
    src: '/assets/rewards/stickers/weekly_booster.png',
    alt: 'Weekly Booster Uplink Active Sticker',
    category: 'weekly',
    theme: 'cyber',
    recommendedPlacement: 'top-right',
    emoji: '📡',
    color: 'bg-brand-cyan',
    textColor: 'text-black',
    label: 'BOOST UPLINK'
  },
  {
    id: 'deck-starter-signals',
    src: '/assets/rewards/stickers/deck_starter_signals.png',
    alt: 'Starter Signals Field Deck Sticker',
    category: 'deck',
    theme: 'classic',
    recommendedPlacement: 'top-left',
    deckId: 'starter-signals',
    emoji: '📟',
    color: 'bg-lime-200',
    textColor: 'text-lime-950',
    label: 'STARTER SIGNALS'
  },
  {
    id: 'deck-urban-recon',
    src: '/assets/rewards/stickers/deck_urban_recon.png',
    alt: 'Urban Recon Field Deck Sticker',
    category: 'deck',
    theme: 'classic',
    recommendedPlacement: 'bottom-right',
    deckId: 'urban-recon',
    emoji: '🏢',
    color: 'bg-sky-200',
    textColor: 'text-sky-950',
    label: 'URBAN RECON'
  },
  // Discovery Fallbacks
  { id: 'basecamp-found', src: '', alt: 'Basecamp', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '🏠', color: 'bg-brand-cyan', textColor: 'text-black', label: 'BASECAMP' },
  { id: 'rival-spotted', src: '', alt: 'Radar', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '👁️', color: 'bg-brand-magenta', textColor: 'text-white', label: 'RADAR' },
  { id: 'signal-reader', src: '', alt: 'Catalyst', category: 'weekly', theme: 'classic', recommendedPlacement: 'center', emoji: '📖', color: 'bg-brand-purple', textColor: 'text-white', label: 'CATALYST' },
  { id: 'first-draw', src: '', alt: 'Draw', category: 'reward', theme: 'classic', recommendedPlacement: 'center', emoji: '⚡', color: 'bg-brand-orange', textColor: 'text-white', label: 'DRAWN' },
  { id: 'camera-ready', src: '', alt: 'Camera', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '📸', color: 'bg-brand-lime', textColor: 'text-black', label: 'READY' },
  { id: 'proof-pirate', src: '', alt: 'Pirate', category: 'reward', theme: 'classic', recommendedPlacement: 'center', emoji: '🏴‍☠️', color: 'bg-brand-orange', textColor: 'text-white', label: 'PROOF PIRATE' },
  { id: 'signal-fragment-missing', src: '', alt: 'Locked', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '🔒', color: 'bg-red-500', textColor: 'text-white', label: 'MISSING' },
  { id: 'scoreboard-goblin', src: '', alt: 'Stats', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '📊', color: 'bg-gray-800', textColor: 'text-white', label: 'STATS' },
  { id: 'public-evidence', src: '', alt: 'Proofs', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '🖼️', color: 'bg-brand-orange', textColor: 'text-white', label: 'PROOFS' },
  { id: 'stat-rat', src: '', alt: 'Efficiency', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '📈', color: 'bg-brand-cyan', textColor: 'text-black', label: 'RATIO' },
  { id: 'ballot-gremlin', src: '', alt: 'Vote', category: 'weekly', theme: 'classic', recommendedPlacement: 'center', emoji: '🗳️', color: 'bg-brand-magenta', textColor: 'text-white', label: 'VOTED' },
  { id: 'jury-duty', src: '', alt: 'Tribunal', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '⚖️', color: 'bg-brand-purple', textColor: 'text-white', label: 'TRIBUNAL' },
  { id: 'field-judge', src: '', alt: 'Judge', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '🔨', color: 'bg-brand-orange', textColor: 'text-white', label: 'JUDGE' },
  { id: 'verdict-viewer', src: '', alt: 'Results', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '✅', color: 'bg-brand-lime', textColor: 'text-black', label: 'VERDICT' },
  { id: 'votinghub-found', src: '', alt: 'Ballot', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '📥', color: 'bg-brand-cyan', textColor: 'text-black', label: 'BALLOT' },
  { id: 'tiny-applause', src: '', alt: 'Like', category: 'reward', theme: 'classic', recommendedPlacement: 'center', emoji: '❤️', color: 'bg-brand-magenta', textColor: 'text-white', label: 'LIKE' },
  { id: 'red-string-energy', src: '', alt: 'Link', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '🔗', color: 'bg-brand-orange', textColor: 'text-white', label: 'REASON' },
  { id: 'challenge-flag', src: '', alt: 'Flag', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '🚩', color: 'bg-red-600', textColor: 'text-white', label: 'FLAGGED' },
  { id: 'first-flip', src: '', alt: 'Dex', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '📒', color: 'bg-brand-cyan', textColor: 'text-black', label: 'DEX' },
  { id: 'binder-goblin', src: '', alt: 'Collection', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '🗂️', color: 'bg-brand-magenta', textColor: 'text-white', label: 'ALBUM' },
  { id: 'photo-witness', src: '', alt: 'Photo', category: 'reward', theme: 'classic', recommendedPlacement: 'center', emoji: '📷', color: 'bg-brand-lime', textColor: 'text-black', label: 'SHOT' },
  { id: 'ink-witness', src: '', alt: 'Note', category: 'reward', theme: 'classic', recommendedPlacement: 'center', emoji: '🖊️', color: 'bg-brand-orange', textColor: 'text-white', label: 'NOTE' },
  { id: 'empty-slot-syndrome', src: '', alt: 'Secret', category: 'utility', theme: 'classic', recommendedPlacement: 'center', emoji: '❓', color: 'bg-black', textColor: 'text-white', label: 'SECRET' }
];

export function getStickerById(id: string): StickerMetadata | undefined {
  return STICKER_REGISTRY.find(s => s.id === id);
}

export function getStickersByCategory(category: StickerMetadata['category']): StickerMetadata[] {
  return STICKER_REGISTRY.filter(s => s.category === category);
}

export function getStickersByDeck(deckId: string): StickerMetadata[] {
  return STICKER_REGISTRY.filter(s => s.deckId === deckId);
}

export function getStickersByPersona(personaId: string): StickerMetadata[] {
  return STICKER_REGISTRY.filter(s => s.personaId === personaId);
}
