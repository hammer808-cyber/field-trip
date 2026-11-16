export type StickerArchetype =
  | 'captainClipboard'
  | 'mallRat'
  | 'mascota'
  | 'elondra'
  | 'lostCamper'
  | 'bigfoot';

export type StickerRarity =
  | 'common'
  | 'rare'
  | 'legendary';

export type StickerAwardTrigger =
  | 'starter_pack'
  | 'first_submission'
  | 'first_approval'
  | 'field_note_added'
  | 'photo_proof_added'
  | 'challenge_approved'
  | 'weekly_vote_cast'
  | 'weekly_winner'
  | 'crew_joined'
  | 'crew_created'
  | 'zine_page_added'
  | 'archetype_milestone'
  | 'season_milestone'
  | 'mission_count_milestone'
  | 'admin_grant';

export type StickerCollection =
  | 'adventure'
  | 'achievement'
  | 'chaos'
  | 'social'
  | 'explorer'
  | 'limited_edition';

/**
 * Shelf order in the Dex (Stage 3, Scheme A). Explorer first because a new
 * player owns 3 Explorer stickers immediately — the first shelf is never empty.
 */
export const COLLECTION_SHELF_ORDER: readonly StickerCollection[] = [
  'explorer',
  'adventure',
  'achievement',
  'social',
  'chaos',
  'limited_edition'
];

export interface StickerCollectionMeta {
  label: string;
  tagline: string;
  emptyState: string;
}

export const COLLECTION_META: Readonly<Record<StickerCollection, StickerCollectionMeta>> = {
  explorer: {
    label: 'Explorer',
    tagline: 'Who you are in the field.',
    emptyState: 'No Explorer stickers yet — finish the quiz to claim your starter pack.'
  },
  adventure: {
    label: 'Adventure',
    tagline: 'Firsts in the field.',
    emptyState: 'No Adventure stickers yet — submit your first proof.'
  },
  achievement: {
    label: 'Achievement',
    tagline: 'Milestones and wins.',
    emptyState: 'No Achievement stickers yet — get a proof approved.'
  },
  social: {
    label: 'Social',
    tagline: 'Other people.',
    emptyState: 'No Social stickers yet — join or create a crew.'
  },
  chaos: {
    label: 'Chaos',
    tagline: 'Documented disorder.',
    emptyState: 'No stickers here yet — first drops land with Stage 6.'
  },
  limited_edition: {
    label: 'Limited Edition',
    tagline: 'Here for a season, gone after.',
    emptyState: 'No stickers here yet — first drops land with Stage 6.'
  }
};

export interface StickerDefinition {
  id: string;
  name: string;
  /** Optional: a sticker with no archetype is a cross-pack sticker (Stage 6). */
  archetype?: StickerArchetype;
  /** Exactly one collection per sticker (Stage 3, Scheme A). */
  collection: StickerCollection;
  imageUrl: string;
  rarity: StickerRarity;
  awardTrigger: StickerAwardTrigger;
  unlockReason: string;
  tags: string[];
  /** Shelf order inside the collection. */
  displayOrder?: number;
  /** Hide name + how-to-earn until earned (Stage 6 use). */
  secret?: boolean;
  /** ISO date, window start (Stage 6 use). */
  availableFrom?: string;
  /** ISO date, window end (Stage 6 use). */
  availableUntil?: string;
}

export const STICKER_DEFINITIONS: readonly StickerDefinition[] = [
  // Captain Clipboard
  {
    id: 'captain_clipboard_clipboard_character',
    name: 'Captain Clipboard',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 1,
    imageUrl: '/assets/stickers/captainClipboard/clipboard-character.png',
    rarity: 'rare',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Captain Clipboard starter pack.',
    tags: ['captain-clipboard', 'character', 'clipboard', 'starter-pack']
  },
  {
    id: 'captain_clipboard_checklist_badge',
    name: 'Checklist Badge',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 2,
    imageUrl: '/assets/stickers/captainClipboard/checklist-badge.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Captain Clipboard starter pack.',
    tags: ['captain-clipboard', 'checklist', 'badge', 'starter-pack']
  },
  {
    id: 'captain_clipboard_checkmark_seal',
    name: 'Checkmark Seal',
    archetype: 'captainClipboard',
    collection: 'achievement',
    displayOrder: 1,
    imageUrl: '/assets/stickers/captainClipboard/checkmark-seal.png',
    rarity: 'common',
    awardTrigger: 'first_approval',
    unlockReason: 'Earned when your first proof is approved.',
    tags: ['captain-clipboard', 'checkmark', 'approval', 'seal']
  },
  {
    id: 'captain_clipboard_pen_sparkle',
    name: 'Pen Sparkle',
    archetype: 'captainClipboard',
    collection: 'adventure',
    displayOrder: 3,
    imageUrl: '/assets/stickers/captainClipboard/pen-sparkle.png',
    rarity: 'common',
    awardTrigger: 'field_note_added',
    unlockReason: 'Earned by adding a field note to a proof.',
    tags: ['captain-clipboard', 'pen', 'field-note', 'sparkle']
  },
  {
    id: 'captain_clipboard_flying_papers',
    name: 'Flying Papers',
    archetype: 'captainClipboard',
    collection: 'adventure',
    displayOrder: 7,
    imageUrl: '/assets/stickers/captainClipboard/flying-papers.png',
    rarity: 'rare',
    awardTrigger: 'zine_page_added',
    unlockReason: 'Earned when one of your receipts is added to a zine page.',
    tags: ['captain-clipboard', 'papers', 'zine', 'field-records']
  },
  {
    id: 'captain_clipboard_whistle_lanyard',
    name: 'Whistle Lanyard',
    archetype: 'captainClipboard',
    collection: 'social',
    displayOrder: 2,
    imageUrl: '/assets/stickers/captainClipboard/whistle-lanyard.png',
    rarity: 'legendary',
    awardTrigger: 'crew_created',
    unlockReason: 'Earned by creating a Fieldtrip crew.',
    tags: ['captain-clipboard', 'whistle', 'leadership', 'crew']
  },
  {
    id: 'captain_clipboard_field_notes',
    name: 'Field Notes',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 3,
    imageUrl: '/assets/stickers/captainClipboard/field-notes.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Captain Clipboard starter pack.',
    tags: ['captain-clipboard', 'notes', 'writing', 'starter-pack']
  },

  // Mall Rat
  {
    id: 'mall_rat_shopping_bags',
    name: 'Shopping Bags',
    archetype: 'mallRat',
    collection: 'explorer',
    displayOrder: 4,
    imageUrl: '/assets/stickers/mallRat/shopping-bags.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Mall Rat starter pack.',
    tags: ['mall-rat', 'shopping', 'bags', 'starter-pack']
  },
  {
    id: 'mall_rat_receipt_curl',
    name: 'Receipt Curl',
    archetype: 'mallRat',
    collection: 'adventure',
    displayOrder: 1,
    imageUrl: '/assets/stickers/mallRat/receipt-curl.png',
    rarity: 'common',
    awardTrigger: 'first_submission',
    unlockReason: 'Earned when you submit your first receipt.',
    tags: ['mall-rat', 'receipt', 'submission', 'paper']
  },
  {
    id: 'mall_rat_sunglasses',
    name: 'Mall Rat Sunglasses',
    archetype: 'mallRat',
    collection: 'achievement',
    displayOrder: 9,
    imageUrl: '/assets/stickers/mallRat/sunglasses.png',
    rarity: 'rare',
    awardTrigger: 'archetype_milestone',
    unlockReason: 'Earned by reaching a Mall Rat archetype milestone.',
    tags: ['mall-rat', 'sunglasses', 'style', 'milestone']
  },
  {
    id: 'mall_rat_food_court_tray',
    name: 'Food Court Tray',
    archetype: 'mallRat',
    collection: 'adventure',
    displayOrder: 5,
    imageUrl: '/assets/stickers/mallRat/food-court-tray.png',
    rarity: 'common',
    awardTrigger: 'photo_proof_added',
    unlockReason: 'Earned by adding photo proof to a submission.',
    tags: ['mall-rat', 'food-court', 'photo-proof', 'snack']
  },
  {
    id: 'mall_rat_escalator_pose',
    name: 'Escalator Pose',
    archetype: 'mallRat',
    collection: 'achievement',
    displayOrder: 11,
    imageUrl: '/assets/stickers/mallRat/escalator-pose.png',
    rarity: 'rare',
    awardTrigger: 'season_milestone',
    unlockReason: 'Earned by reaching a seasonal Fieldtrip milestone.',
    tags: ['mall-rat', 'escalator', 'pose', 'season']
  },
  {
    id: 'mall_rat_soda_cup',
    name: 'Soda Cup',
    archetype: 'mallRat',
    collection: 'explorer',
    displayOrder: 5,
    imageUrl: '/assets/stickers/mallRat/soda-cup.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Mall Rat starter pack.',
    tags: ['mall-rat', 'soda', 'food-court', 'starter-pack']
  },
  {
    id: 'mall_rat_mall_map',
    name: 'Mall Map',
    archetype: 'mallRat',
    collection: 'explorer',
    displayOrder: 6,
    imageUrl: '/assets/stickers/mallRat/mall-map.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Mall Rat starter pack.',
    tags: ['mall-rat', 'map', 'directory', 'starter-pack']
  },

  // Mascota
  {
    id: 'mascota_mascot_jump',
    name: 'Mascot Jump',
    archetype: 'mascota',
    collection: 'achievement',
    displayOrder: 4,
    imageUrl: '/assets/stickers/mascota/mascot-jump.png',
    rarity: 'rare',
    awardTrigger: 'challenge_approved',
    unlockReason: 'Earned when an eligible challenge is approved.',
    tags: ['mascota', 'mascot', 'jump', 'approval']
  },
  {
    id: 'mascota_pom_poms',
    name: 'Pom-Poms',
    archetype: 'mascota',
    collection: 'explorer',
    displayOrder: 7,
    imageUrl: '/assets/stickers/mascota/pom-poms.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Mascota starter pack.',
    tags: ['mascota', 'pom-poms', 'cheer', 'starter-pack']
  },
  {
    id: 'mascota_foam_finger',
    name: 'Foam Finger',
    archetype: 'mascota',
    collection: 'social',
    displayOrder: 1,
    imageUrl: '/assets/stickers/mascota/foam-finger.png',
    rarity: 'common',
    awardTrigger: 'weekly_vote_cast',
    unlockReason: 'Earned by casting an eligible weekly vote.',
    tags: ['mascota', 'foam-finger', 'voting', 'weekly']
  },
  {
    id: 'mascota_confetti_burst',
    name: 'Confetti Burst',
    archetype: 'mascota',
    collection: 'achievement',
    displayOrder: 7,
    imageUrl: '/assets/stickers/mascota/confetti-burst.png',
    rarity: 'rare',
    awardTrigger: 'weekly_winner',
    unlockReason: 'Earned when your eligible proof wins a weekly ballot.',
    tags: ['mascota', 'confetti', 'winner', 'weekly']
  },
  {
    id: 'mascota_megaphone',
    name: 'Megaphone',
    archetype: 'mascota',
    collection: 'explorer',
    displayOrder: 8,
    imageUrl: '/assets/stickers/mascota/megaphone.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Mascota starter pack.',
    tags: ['mascota', 'megaphone', 'cheer', 'starter-pack']
  },
  {
    id: 'mascota_mascot_face',
    name: 'Mascot Face',
    archetype: 'mascota',
    collection: 'explorer',
    displayOrder: 9,
    imageUrl: '/assets/stickers/mascota/mascot-face.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Mascota starter pack.',
    tags: ['mascota', 'mascot', 'face', 'starter-pack']
  },
  {
    id: 'mascota_victory_flag',
    name: 'Victory Flag',
    archetype: 'mascota',
    collection: 'achievement',
    displayOrder: 8,
    imageUrl: '/assets/stickers/mascota/victory-flag.png',
    rarity: 'legendary',
    awardTrigger: 'weekly_winner',
    unlockReason: 'Earned for a landmark weekly Fieldtrip win.',
    tags: ['mascota', 'victory', 'flag', 'weekly-winner']
  },

  // Elondra
  {
    id: 'elondra_crown',
    name: 'Elondra Crown',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 10,
    imageUrl: '/assets/stickers/elondra/crown.png',
    rarity: 'rare',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Elondra starter pack.',
    tags: ['elondra', 'crown', 'glam', 'starter-pack']
  },
  {
    id: 'elondra_compact_mirror',
    name: 'Compact Mirror',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 11,
    imageUrl: '/assets/stickers/elondra/compact-mirror.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Elondra starter pack.',
    tags: ['elondra', 'mirror', 'compact', 'starter-pack']
  },
  {
    id: 'elondra_sparkle_burst',
    name: 'Sparkle Burst',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 12,
    imageUrl: '/assets/stickers/elondra/sparkle-burst.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Elondra starter pack.',
    tags: ['elondra', 'sparkle', 'glam', 'starter-pack']
  },
  {
    id: 'elondra_glam_pose',
    name: 'Glam Pose',
    archetype: 'elondra',
    collection: 'achievement',
    displayOrder: 2,
    imageUrl: '/assets/stickers/elondra/glam-pose.png',
    rarity: 'common',
    awardTrigger: 'first_approval',
    unlockReason: 'Earned when your first proof is approved.',
    tags: ['elondra', 'glam', 'pose', 'approval']
  },
  {
    id: 'elondra_glam_shoe',
    name: 'Glam Shoe',
    archetype: 'elondra',
    collection: 'achievement',
    displayOrder: 5,
    imageUrl: '/assets/stickers/elondra/glam-shoe.png',
    rarity: 'rare',
    awardTrigger: 'challenge_approved',
    unlockReason: 'Earned when an eligible challenge is approved.',
    tags: ['elondra', 'shoe', 'glam', 'challenge']
  },
  {
    id: 'elondra_purse',
    name: 'Elondra Purse',
    archetype: 'elondra',
    collection: 'adventure',
    displayOrder: 8,
    imageUrl: '/assets/stickers/elondra/purse.png',
    rarity: 'common',
    awardTrigger: 'zine_page_added',
    unlockReason: 'Earned when one of your receipts is added to a zine page.',
    tags: ['elondra', 'purse', 'zine', 'style']
  },
  {
    id: 'elondra_arrival_pose',
    name: 'Arrival Pose',
    archetype: 'elondra',
    collection: 'achievement',
    displayOrder: 12,
    imageUrl: '/assets/stickers/elondra/arrival-pose.png',
    rarity: 'legendary',
    awardTrigger: 'season_milestone',
    unlockReason: 'Earned by reaching a seasonal Fieldtrip milestone.',
    tags: ['elondra', 'arrival', 'pose', 'season']
  },

  // Lost Camper
  {
    id: 'lost_camper_map',
    name: 'Lost Camper Map',
    archetype: 'lostCamper',
    collection: 'explorer',
    displayOrder: 13,
    imageUrl: '/assets/stickers/lostCamper/map.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Lost Camper starter pack.',
    tags: ['lost-camper', 'map', 'trail', 'starter-pack']
  },
  {
    id: 'lost_camper_flashlight',
    name: 'Flashlight',
    archetype: 'lostCamper',
    collection: 'explorer',
    displayOrder: 14,
    imageUrl: '/assets/stickers/lostCamper/flashlight.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Lost Camper starter pack.',
    tags: ['lost-camper', 'flashlight', 'gear', 'starter-pack']
  },
  {
    id: 'lost_camper_backpack',
    name: 'Lost Camper Backpack',
    archetype: 'lostCamper',
    collection: 'explorer',
    displayOrder: 15,
    imageUrl: '/assets/stickers/lostCamper/backpack.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Lost Camper starter pack.',
    tags: ['lost-camper', 'backpack', 'gear', 'starter-pack']
  },
  {
    id: 'lost_camper_compass',
    name: 'Compass',
    archetype: 'lostCamper',
    collection: 'achievement',
    displayOrder: 6,
    imageUrl: '/assets/stickers/lostCamper/compass.png',
    rarity: 'common',
    awardTrigger: 'challenge_approved',
    unlockReason: 'Earned when an eligible challenge is approved.',
    tags: ['lost-camper', 'compass', 'navigation', 'challenge']
  },
  {
    id: 'lost_camper_bandage',
    name: 'Trail Bandage',
    archetype: 'lostCamper',
    collection: 'achievement',
    displayOrder: 3,
    imageUrl: '/assets/stickers/lostCamper/bandage.png',
    rarity: 'common',
    awardTrigger: 'first_approval',
    unlockReason: 'Earned when your first proof is approved.',
    tags: ['lost-camper', 'bandage', 'trail', 'approval']
  },
  {
    id: 'lost_camper_trail_sign',
    name: 'Trail Sign',
    archetype: 'lostCamper',
    collection: 'social',
    displayOrder: 3,
    imageUrl: '/assets/stickers/lostCamper/trail-sign.png',
    rarity: 'rare',
    awardTrigger: 'crew_joined',
    unlockReason: 'Earned when you join a Fieldtrip crew.',
    tags: ['lost-camper', 'trail-sign', 'crew', 'direction']
  },
  {
    id: 'lost_camper_nervous_camper',
    name: 'Nervous Camper',
    archetype: 'lostCamper',
    collection: 'adventure',
    displayOrder: 2,
    imageUrl: '/assets/stickers/lostCamper/nervous-camper.png',
    rarity: 'rare',
    awardTrigger: 'first_submission',
    unlockReason: 'Earned when you submit your first receipt.',
    tags: ['lost-camper', 'character', 'camper', 'submission']
  },

  // Bigfoot
  {
    id: 'bigfoot_footprint',
    name: 'Bigfoot Footprint',
    archetype: 'bigfoot',
    collection: 'explorer',
    displayOrder: 16,
    imageUrl: '/assets/stickers/bigfoot/footprint.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Bigfoot starter pack.',
    tags: ['bigfoot', 'footprint', 'cryptid', 'starter-pack']
  },
  {
    id: 'bigfoot_tree_hideout',
    name: 'Tree Hideout',
    archetype: 'bigfoot',
    collection: 'achievement',
    displayOrder: 10,
    imageUrl: '/assets/stickers/bigfoot/tree-hideout.png',
    rarity: 'rare',
    awardTrigger: 'archetype_milestone',
    unlockReason: 'Earned by reaching a Bigfoot archetype milestone.',
    tags: ['bigfoot', 'tree', 'hideout', 'milestone']
  },
  {
    id: 'bigfoot_blurry_polaroid',
    name: 'Blurry Polaroid',
    archetype: 'bigfoot',
    collection: 'adventure',
    displayOrder: 6,
    imageUrl: '/assets/stickers/bigfoot/blurry-polaroid.png',
    rarity: 'common',
    awardTrigger: 'photo_proof_added',
    unlockReason: 'Earned by adding photo proof to a submission.',
    tags: ['bigfoot', 'polaroid', 'photo-proof', 'cryptid']
  },
  {
    id: 'bigfoot_pine_trees',
    name: 'Pine Trees',
    archetype: 'bigfoot',
    collection: 'explorer',
    displayOrder: 17,
    imageUrl: '/assets/stickers/bigfoot/pine-trees.png',
    rarity: 'common',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Bigfoot starter pack.',
    tags: ['bigfoot', 'pine-trees', 'forest', 'starter-pack']
  },
  {
    id: 'bigfoot_peace_sign',
    name: 'Bigfoot Peace Sign',
    archetype: 'bigfoot',
    collection: 'social',
    displayOrder: 4,
    imageUrl: '/assets/stickers/bigfoot/peace-sign.png',
    rarity: 'common',
    awardTrigger: 'crew_joined',
    unlockReason: 'Earned when you join a Fieldtrip crew.',
    tags: ['bigfoot', 'peace-sign', 'crew', 'character']
  },
  {
    id: 'bigfoot_campfire_snack',
    name: 'Campfire Snack',
    archetype: 'bigfoot',
    collection: 'adventure',
    displayOrder: 4,
    imageUrl: '/assets/stickers/bigfoot/campfire-snack.png',
    rarity: 'rare',
    awardTrigger: 'field_note_added',
    unlockReason: 'Earned by adding a field note to a proof.',
    tags: ['bigfoot', 'campfire', 'snack', 'field-note']
  },
  {
    id: 'bigfoot_night_silhouette',
    name: 'Night Silhouette',
    archetype: 'bigfoot',
    collection: 'explorer',
    displayOrder: 18,
    imageUrl: '/assets/stickers/bigfoot/night-silhouette.png',
    rarity: 'rare',
    awardTrigger: 'starter_pack',
    unlockReason: 'Included in the Bigfoot starter pack.',
    tags: ['bigfoot', 'night', 'silhouette', 'starter-pack']
  }
];

const STARTER_PACK_STICKER_IDS: Readonly<Record<StickerArchetype, readonly string[]>> = {
  captainClipboard: [
    'captain_clipboard_clipboard_character',
    'captain_clipboard_checklist_badge',
    'captain_clipboard_field_notes'
  ],
  mallRat: [
    'mall_rat_shopping_bags',
    'mall_rat_soda_cup',
    'mall_rat_mall_map'
  ],
  mascota: [
    'mascota_mascot_face',
    'mascota_pom_poms',
    'mascota_megaphone'
  ],
  elondra: [
    'elondra_crown',
    'elondra_compact_mirror',
    'elondra_sparkle_burst'
  ],
  lostCamper: [
    'lost_camper_map',
    'lost_camper_flashlight',
    'lost_camper_backpack'
  ],
  bigfoot: [
    'bigfoot_footprint',
    'bigfoot_pine_trees',
    'bigfoot_night_silhouette'
  ]
};

const stickersById = new Map(STICKER_DEFINITIONS.map(sticker => [sticker.id, sticker]));

export function getStickerById(id: string): StickerDefinition | undefined {
  return stickersById.get(id);
}

export function getStickersByArchetype(archetype: StickerArchetype): StickerDefinition[] {
  return STICKER_DEFINITIONS.filter(sticker => sticker.archetype === archetype);
}

export function getStickersByCollection(collection: StickerCollection): StickerDefinition[] {
  return STICKER_DEFINITIONS
    .filter(sticker => sticker.collection === collection)
    .sort((left, right) => (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER));
}

export function getStickersByTrigger(trigger: StickerAwardTrigger): StickerDefinition[] {
  return STICKER_DEFINITIONS.filter(sticker => sticker.awardTrigger === trigger);
}

export function getStarterPackForArchetype(archetype: StickerArchetype): StickerDefinition[] {
  return STARTER_PACK_STICKER_IDS[archetype].map(id => {
    const sticker = stickersById.get(id);
    if (!sticker) {
      throw new Error(`Starter pack references unknown sticker: ${id}`);
    }
    return sticker;
  });
}

export function getAllStickers(): StickerDefinition[] {
  return [...STICKER_DEFINITIONS];
}
