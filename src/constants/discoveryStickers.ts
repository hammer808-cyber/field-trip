import { LucideIcon } from 'lucide-react';

export type StickerRarity = 'common' | 'uncommon' | 'rare' | 'secret';
export type StickerUnlockType = 'discovery' | 'achievement' | 'seasonal' | 'tribunal' | 'deck';

export interface DiscoverySticker {
  id: string;
  name: string;
  description: string;
  iconName: string; // Lucide icon name
  rarity: StickerRarity;
  unlockType: StickerUnlockType;
  discoveryKey: string;
}

export const DISCOVERY_STICKERS: DiscoverySticker[] = [
  // Basecamp / Dashboard
  {
    id: 'basecamp-found',
    name: 'Basecamp Found',
    description: 'You found the heart of the operation.',
    iconName: 'Home',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'basecamp_visit'
  },
  {
    id: 'rival-spotted',
    name: 'Rival Spotted',
    description: "You checked who's just ahead and who's sneaking up behind you.",
    iconName: 'Eye',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'rank_radar_open'
  },
  {
    id: 'signal-reader',
    name: 'Signal Reader',
    description: "You found this week's hidden scoring weather.",
    iconName: 'BookOpen',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'weekly_catalyst_read'
  },
  
  // Missions
  {
    id: 'first-draw',
    name: 'First Draw',
    description: 'You pulled your first mission. The shelf has officially noticed you.',
    iconName: 'Zap',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'mission_draw'
  },
  {
    id: 'camera-ready',
    name: 'Camera Ready',
    description: 'The viewfinder is live. Time to catch proof in the wild.',
    iconName: 'Camera',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'capture_start'
  },
  {
    id: 'proof-pirate',
    name: 'Proof Pirate',
    description: 'You found it, it didn’t find you! A photo plus field note makes stronger proof, adds lore, and could enhance your end-of-season zine.',
    iconName: 'Ship',
    rarity: 'uncommon',
    unlockType: 'discovery',
    discoveryKey: 'proof_pirate'
  },
  {
    id: 'signal-fragment-missing',
    name: 'Signal Fragment Missing',
    description: 'Almost full. Some signals have a final piece hiding in the static.',
    iconName: 'Lock',
    rarity: 'rare',
    unlockType: 'discovery',
    discoveryKey: 'evidence_meter_bonus_seen'
  },

  // Big Board
  {
    id: 'scoreboard-goblin',
    name: 'Scoreboard Goblin',
    description: 'Checking the standings? You really want that top spot.',
    iconName: 'BarChart3',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'standings_open'
  },
  {
    id: 'public-evidence',
    name: 'Public Evidence',
    description: 'You reviewed the field recordings of your fellow explorers.',
    iconName: 'Image',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'proofs_tab_open'
  },
  {
    id: 'stat-rat',
    name: 'Stat Rat',
    description: 'Diving deep into the efficiency metrics. Knowledge is power.',
    iconName: 'Activity',
    rarity: 'uncommon',
    unlockType: 'discovery',
    discoveryKey: 'stats_open'
  },

  // Voting Hub
  {
    id: 'ballot-gremlin',
    name: 'Ballot Gremlin',
    description: 'Your voice is heard. The weekly weights shift.',
    iconName: 'Vote',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'weekly_vote_cast'
  },
  {
    id: 'jury-duty',
    name: 'Jury Duty',
    description: 'You found where disputed proof goes to face the field.',
    iconName: 'Gavel',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'tribunal_open'
  },
  {
    id: 'field-judge',
    name: 'Field Judge',
    description: 'You cast a deciding vote on a disputed transmission.',
    iconName: 'Scale',
    rarity: 'uncommon',
    unlockType: 'discovery',
    discoveryKey: 'tribunal_vote_cast'
  },
  {
    id: 'verdict-viewer',
    name: 'Verdict Viewer',
    description: 'Checking the final calls. Justice is served (or not).',
    iconName: 'CheckCircle2',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'results_open'
  },
  {
    id: 'votinghub-found',
    name: 'Ballot Box Discovered',
    description: 'You found the center of field consensus.',
    iconName: 'Inbox',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'votinghub_open'
  },

  // Social Actions
  {
    id: 'tiny-applause',
    name: 'Tiny Applause',
    description: 'You gave another explorer a little field signal.',
    iconName: 'Heart',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'proof_like'
  },
  {
    id: 'red-string-energy',
    name: 'Red String Energy',
    description: 'Diving into the details. Connected the dots.',
    iconName: 'Link',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'proof_detail_open'
  },
  {
    id: 'challenge-flag',
    name: 'Challenge Flag',
    description: 'You called out a suspected signal error. Vigilance is rewarded.',
    iconName: 'Flag',
    rarity: 'rare',
    unlockType: 'discovery',
    discoveryKey: 'call_it_out_use'
  },

  // Dex
  {
    id: 'first-flip',
    name: 'First Flip',
    description: 'Found it! Choose a mission from the shelf and start documenting.',
    iconName: 'Book',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'dex_open'
  },
  {
    id: 'binder-goblin',
    name: 'Binder Goblin',
    description: 'You found the sticker binder. Everything you earn lands here.',
    iconName: 'LayoutGrid',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'sticker_collection_view'
  },
  {
    id: 'photo-witness',
    name: 'Photo Witness',
    description: 'You captured your first visual evidence.',
    iconName: 'Camera',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'first_photo_submitted'
  },
  {
    id: 'ink-witness',
    name: 'Ink Witness',
    description: 'You logged your first written field report.',
    iconName: 'PenLine',
    rarity: 'common',
    unlockType: 'discovery',
    discoveryKey: 'first_note_submitted'
  },
  {
    id: 'empty-slot-syndrome',
    name: 'Empty Slot Syndrome',
    description: 'A blank spot with opinions. Some stickers only reveal themselves after the right move.',
    iconName: 'QuestionMark',
    rarity: 'secret',
    unlockType: 'discovery',
    discoveryKey: 'locked_sticker_tap'
  }
];
