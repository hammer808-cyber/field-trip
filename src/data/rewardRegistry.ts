
export type RewardType = 'sticker' | 'badge';
export type RewardRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface RewardMetadata {
  id: string;
  type: RewardType;
  label: string;
  description: string;
  rarity?: RewardRarity;
  assetPath?: string;
  fallbackIcon?: string;
  fallbackEmoji?: string;
  betaCritical?: boolean;
  category?: string;
  unlockCondition?: string;
  name?: string;
}

export const REWARD_REGISTRY: Record<string, RewardMetadata> = {
  /**
   * Note: assetPath should only be added for files that physically exist in /public/assets/rewards/
   * Proposed paths:
   * stickers: /assets/rewards/stickers/sticker_name.png
   * badges: /assets/rewards/badges/badge_name.png
   */
  // Stickers
  sticker_photo_proof: {
    id: 'sticker_photo_proof',
    type: 'sticker',
    label: 'Photo Proof',
    description: 'Captured your first visual evidence.',
    rarity: 'common',
    // assetPath: '/assets/rewards/stickers/sticker_photo_proof.png'
  },
  sticker_field_note: {
    id: 'sticker_field_note',
    type: 'sticker',
    label: 'Field Note',
    description: 'Logged a written observation.',
    rarity: 'common',
    // assetPath: '/assets/rewards/stickers/sticker_field_note.png'
  },
  sticker_weird_find: {
    id: 'sticker_weird_find',
    type: 'sticker',
    label: 'Weird Find',
    description: 'Spotted something worth documenting.',
    rarity: 'common',
    // assetPath: '/assets/rewards/stickers/sticker_weird_find.png'
  },
  'first-field-note': {
    id: 'first-field-note',
    type: 'sticker',
    label: 'First Field Note',
    description: 'Saved your first custom written field observation.',
    rarity: 'common',
    fallbackEmoji: '📝',
    betaCritical: true
  },
  'heatwave-starter': {
    id: 'heatwave-starter',
    type: 'sticker',
    label: 'Heatwave Starter',
    description: 'Began the seasonal expedition.',
    rarity: 'common',
    fallbackEmoji: '☀️',
    betaCritical: true
  },
  'persona-captain-clipboard': {
    id: 'persona-captain-clipboard',
    type: 'sticker',
    label: 'Captain Clipboard',
    description: 'Unlock trait: Extremely organized.',
    rarity: 'uncommon',
    fallbackEmoji: '📋',
    betaCritical: true
  },
  'persona-mall-rat': {
    id: 'persona-mall-rat',
    type: 'sticker',
    label: 'Mall Rat',
    description: 'Unlock trait: Indoor specialist.',
    rarity: 'uncommon',
    fallbackEmoji: '🐀',
    betaCritical: true
  },
  'persona-homecoming-queen': {
    id: 'persona-homecoming-queen',
    type: 'sticker',
    label: 'Homecoming Queen',
    description: 'Unlock trait: Social catalyst.',
    rarity: 'uncommon',
    fallbackEmoji: '👑',
    betaCritical: true
  },
  'persona-the-gobbler': {
    id: 'persona-the-gobbler',
    type: 'sticker',
    label: 'The Gobbler',
    description: 'Unlock trait: Insatiable hoarder.',
    rarity: 'uncommon',
    fallbackEmoji: '👾',
    betaCritical: true
  },
  'persona-bigfoot': {
    id: 'persona-bigfoot',
    type: 'sticker',
    label: 'Bigfoot',
    description: 'Unlock trait: Legendary isolationist.',
    rarity: 'rare',
    fallbackEmoji: '👣',
    betaCritical: true
  },
  // Discovery Stickers
  camera_ready: { id: 'camera_ready', type: 'sticker', label: 'Camera Ready', description: 'Opened the viewfinder or submitted your first photo proof.', rarity: 'common' },
  first_field_note: { id: 'first_field_note', type: 'sticker', label: 'First Field Note', description: 'Submitted your first written field note.', rarity: 'common' },
  starter_signal_1: { id: 'starter_signal_1', type: 'sticker', label: 'Starter Signal 1', description: 'Your first Starter Signal was approved.', rarity: 'common' },
  starter_signal_3_complete: { id: 'starter_signal_3_complete', type: 'sticker', label: 'Starter Signals Complete', description: 'All 3 Starter Signals are approved.', rarity: 'uncommon' },
  dex_discovered: { id: 'dex_discovered', type: 'sticker', label: 'Dex Discovered', description: 'Opened the Dex for the first time.', rarity: 'common' },
  first_vote: { id: 'first_vote', type: 'sticker', label: 'First Vote', description: 'Cast your first successful vote.', rarity: 'common' },
  proof_returned: { id: 'proof_returned', type: 'sticker', label: 'Proof Returned', description: 'A proof was returned for more evidence.', rarity: 'common' },
  receipt_approved: { id: 'receipt_approved', type: 'sticker', label: 'Receipt Approved', description: 'Received your first approved submission.', rarity: 'common' },
  crew_unlocked: { id: 'crew_unlocked', type: 'sticker', label: 'Crew Unlocked', description: 'Crew access unlocked after completing Starter Signals.', rarity: 'uncommon' },
  memories_unlocked: { id: 'memories_unlocked', type: 'sticker', label: 'Memories Unlocked', description: 'Crew Memories unlocked after completing Starter Signals.', rarity: 'uncommon' },
  'basecamp-found': { id: 'basecamp-found', type: 'sticker', label: 'Basecamp Found', description: 'You found the heart of the operation.', rarity: 'common' },
  'rival-spotted': { id: 'rival-spotted', type: 'sticker', label: 'Rival Spotted', description: "You checked who's just ahead and who's sneaking up behind you.", rarity: 'common' },
  'signal-reader': { id: 'signal-reader', type: 'sticker', label: 'Signal Reader', description: "You found this week's hidden scoring weather.", rarity: 'common' },
  'first-draw': { id: 'first-draw', type: 'sticker', label: 'First Draw', description: 'You pulled your first mission. The shelf has officially noticed you.', rarity: 'common' },
  'camera-ready': { id: 'camera-ready', type: 'sticker', label: 'Camera Ready', description: "The viewfinder is live. Time to catch proof in the wild.", rarity: 'common' },
  'proof-pirate': { id: 'proof-pirate', type: 'sticker', label: 'Proof Pirate', description: "You found it, it didn’t find you! A photo plus field note makes stronger proof, adds lore, and could enhance your end-of-season zine.", rarity: 'uncommon' },
  'signal-fragment-missing': { id: 'signal-fragment-missing', type: 'sticker', label: 'Signal Fragment Missing', description: 'Almost full. Some signals have a final piece hiding in the static.', rarity: 'rare' },
  'scoreboard-goblin': { id: 'scoreboard-goblin', type: 'sticker', label: 'Scoreboard Goblin', description: 'Checking the standings?', rarity: 'common' },
  'public-evidence': { id: 'public-evidence', type: 'sticker', label: 'Public Evidence', description: 'Reviewed field recordings.', rarity: 'common' },
  'stat-rat': { id: 'stat-rat', type: 'sticker', label: 'Stat Rat', description: 'Diving deep into the efficiency metrics.', rarity: 'uncommon' },
  'ballot-gremlin': { id: 'ballot-gremlin', type: 'sticker', label: 'Ballot Gremlin', description: 'Your voice is heard.', rarity: 'common' },
  'jury-duty': { id: 'jury-duty', type: 'sticker', label: 'Jury Duty', description: 'Found where disputed proof goes.', rarity: 'common' },
  'field-judge': { id: 'field-judge', type: 'sticker', label: 'Field Judge', description: 'Cast a deciding vote.', rarity: 'uncommon' },
  'verdict-viewer': { id: 'verdict-viewer', type: 'sticker', label: 'Verdict Viewer', description: 'Checking the final calls.', rarity: 'common' },
  'votinghub-found': { id: 'votinghub-found', type: 'sticker', label: 'Ballot Box Discovered', description: 'Found the center of field consensus.', rarity: 'common' },
  'tiny-applause': { id: 'tiny-applause', type: 'sticker', label: 'Tiny Applause', description: 'Gave another explorer a little signal.', rarity: 'common' },
  'red-string-energy': { id: 'red-string-energy', type: 'sticker', label: 'Red String Energy', description: 'Diving into the details.', rarity: 'common' },
  'challenge-flag': { id: 'challenge-flag', type: 'sticker', label: 'Challenge Flag', description: 'Called out a suspected signal error.', rarity: 'rare' },
  'first-flip': { id: 'first-flip', type: 'sticker', label: 'First Flip', description: 'Found it! Choose a mission from the shelf and start documenting.', rarity: 'common' },
  'binder-goblin': { id: 'binder-goblin', type: 'sticker', label: 'Binder Goblin', description: 'You found the sticker binder. Everything you earn lands here.', rarity: 'common' },
  'photo-witness': { id: 'photo-witness', type: 'sticker', label: 'Photo Witness', description: 'Captured first visual evidence.', rarity: 'common' },
  'ink-witness': { id: 'ink-witness', type: 'sticker', label: 'Ink Witness', description: 'Logged first written field report.', rarity: 'common' },
  'empty-slot-syndrome': { id: 'empty-slot-syndrome', type: 'sticker', label: 'Empty Slot Syndrome', description: 'A blank spot with opinions. Some stickers only reveal themselves after the right move.', rarity: 'legendary' },
  // Badges
  badge_first_mission: {
    id: 'badge_first_mission',
    type: 'badge',
    label: 'First Mission',
    description: 'Completed your first Field Trip mission.',
    rarity: 'common',
    // assetPath: '/assets/rewards/badges/badge_first_mission.png'
  },
  'first-approved-mission': {
    id: 'first-approved-mission',
    type: 'badge',
    label: 'First Approved Mission',
    description: 'Your first mission submission was approved by analysts.',
    rarity: 'common',
    fallbackEmoji: '🏆',
    betaCritical: true
  },
  badge_evidence_collector: {
    id: 'badge_evidence_collector',
    type: 'badge',
    label: 'Evidence Collector',
    description: 'Secured multiple types of mission evidence.',
    rarity: 'uncommon',
    // assetPath: '/assets/rewards/badges/badge_evidence_collector.png'
  },
  badge_field_notes: {
    id: 'badge_field_notes',
    type: 'badge',
    label: 'Field Notes',
    description: 'Showed commitment to written observations.',
    rarity: 'uncommon',
    // assetPath: '/assets/rewards/badges/badge_field_notes.png'
  }
};

/**
 * Returns metadata for a specific reward ID.
 * Falls back to a generated label if metadata is missing.
 */
export function getRewardMetadata(id: string): RewardMetadata {
  const metadata = REWARD_REGISTRY[id];
  if (metadata) return metadata;

  // Fallback for unknown IDs
  const isSticker = id.startsWith('sticker_');
  return {
    id,
    type: isSticker ? 'sticker' : 'badge',
    label: id.replace(/^sticker_|^badge_/, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    description: 'A newly discovered Field Trip reward.',
    rarity: 'common'
  };
}

/**
 * Returns all rewards of a specific type.
 */
export function getRewardsByType(type: RewardType): RewardMetadata[] {
  return Object.values(REWARD_REGISTRY).filter(r => r.type === type);
}
