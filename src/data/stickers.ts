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
  | 'level_up'
  | 'repair_approved'
  | 'admin_grant'
  | 'first_draw'
  | 'location_verified'
  | 'late_night_submission'
  | 'desert_state_approval'
  | 'approval_streak'
  | 'crew_survived_week';

export type StickerCollection =
  | 'adventure'
  | 'side_quests'
  | 'achievement'
  | 'chaos'
  | 'social'
  | 'explorer'
  | 'limited_edition'
  | 'texas_yall';

/**
 * Shelf order in the Dex (Stage 3, Scheme A). Explorer first because a new
 * player owns 3 Explorer stickers immediately — the first shelf is never empty.
 */
export const COLLECTION_SHELF_ORDER: readonly StickerCollection[] = [
  'explorer',
  'adventure',
  'side_quests',
  'achievement',
  'social',
  'chaos',
  'limited_edition',
  'texas_yall'
];

export interface StickerCollectionMeta {
  label: string;
  tagline: string;
  emptyState: string;
  /**
   * Deck collections render under the "Deck Collections" grouping in the
   * Dex (Texas Y'all pack, Nov 20, 2026) instead of as a top-level shelf.
   * Future deck packs set this and land in the same group automatically.
   */
  isDeckCollection?: boolean;
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
  side_quests: {
    label: 'Side Quests',
    tagline: 'Detours, hidden gems, and roadside weirdness.',
    emptyState: 'No Side Quests stickers yet — take the detour.'
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
  },
  texas_yall: {
    label: 'Texas Y\'all',
    tagline: 'Fifteen missions, ten stickers, one big state.',
    emptyState: 'No Texas Y\'all stickers yet — get a Texas proof approved.',
    isDeckCollection: true
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
  /**
   * Deck this sticker belongs to (deck packs, Texas Y'all Nov 20, 2026).
   * A sticker with a deckId only matches events from that deck — see the
   * deck-scoped rules in `src/logic/stickerEvaluator.ts`. A sticker with
   * no deckId is deck-agnostic and follows the existing trigger logic.
   */
  deckId?: string;
  /**
   * The specific mission (challenge) that earns this sticker, within its
   * deck. Only meaningful alongside `deckId`; a deck sticker with no
   * missionId matches any approval from its deck.
   */
  missionId?: string;
  /**
   * Local-hour window [start, end) this sticker matches, for the
   * `late_night_submission` trigger (earn-audit fix #3, Nov 20, 2026).
   * Night Owl is [21, 24), After Hours [0, 5). Only meaningful alongside
   * that trigger; the evaluator filters by the submitting device's local
   * hour. A late-night sticker with no window matches any hour.
   */
  hourWindow?: readonly [number, number];
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

  // Mall Rat sticker pack (Nov 18, 2026; Zach's call: REPLACE 03 + 09,
  // ADD the rest as new). The pack ZIP (mall_rat_stickers_01-10_transparent_45_5ubn.zip)
  // held 10 PNGs in the batch-1 style: 6 brand-new scenes + 4 same-theme
  // re-renders of existing concepts. 03_escalator_cruise and 09_mall_directory
  // REPLACE the art on mall_rat_escalator_pose and mall_rat_mall_map (same ids,
  // triggers, collections, orders — file bytes only; the old art is preserved
  // in public/assets/stickers/mallRat/alternates/). The replacement fixes two
  // assets that didn't match their names: escalator-pose.png was a human girl
  // with pink hair, not the raccoon, and mall-map.png was a tiny receipt-like
  // slip, not a map. The other 8 land below as new entries, all trigger-pending
  // (admin_grant): no existing event fits them. Do NOT give new entries
  // awardTrigger 'starter_pack' — the server awards the whole starter pack at quiz
  // time (POST /api/stickers/evaluate, starter_pack) with no backfill for existing players.
  {
    id: 'mall_rat_mascot',
    name: 'Mall Rat Mascot',
    archetype: 'mallRat',
    collection: 'explorer',
    displayOrder: 19,
    imageUrl: '/assets/stickers/mallRat/01_mall_rat_mascot.png',
    rarity: 'rare',
    // Trigger PENDING (Nov 18, 2026): no existing event fits a mascot
    // portrait. Registered as admin_grant so it is visible and grantable,
    // never mis-awarded by a guessed event.
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for showing up as the Mall Rat, full mascot.',
    tags: ['mall-rat', 'mascot', 'raccoon', 'trigger-pending']
  },
  {
    id: 'mall_rat_bag_lounge',
    name: 'Bag Lounge',
    archetype: 'mallRat',
    collection: 'explorer',
    displayOrder: 20,
    imageUrl: '/assets/stickers/mallRat/02_shopping_bag_lounge.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for lounging on the haul.',
    tags: ['mall-rat', 'shopping', 'bags', 'lounge', 'trigger-pending']
  },
  {
    id: 'mall_rat_food_court_feast',
    name: 'Food Court Feast',
    archetype: 'mallRat',
    collection: 'adventure',
    displayOrder: 9,
    imageUrl: '/assets/stickers/mallRat/04_food_court_feast.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for feasting at the food court.',
    tags: ['mall-rat', 'food-court', 'feast', 'pretzel', 'trigger-pending']
  },
  {
    id: 'mall_rat_shopping_cart_haul',
    name: 'Shopping Cart Haul',
    archetype: 'mallRat',
    collection: 'adventure',
    displayOrder: 10,
    imageUrl: '/assets/stickers/mallRat/05_shopping_cart_haul.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for filling the cart.',
    tags: ['mall-rat', 'shopping', 'cart', 'haul', 'trigger-pending']
  },
  {
    id: 'mall_rat_chunky_sneaker',
    name: 'Chunky Sneaker',
    archetype: 'mallRat',
    collection: 'adventure',
    displayOrder: 11,
    imageUrl: '/assets/stickers/mallRat/06_chunky_sneaker.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for stepping out in the chunky sneakers.',
    tags: ['mall-rat', 'sneaker', 'style', 'trigger-pending']
  },
  {
    id: 'mall_rat_mirror_selfie',
    name: 'Mirror Selfie',
    archetype: 'mallRat',
    collection: 'adventure',
    displayOrder: 12,
    imageUrl: '/assets/stickers/mallRat/07_mirror_selfie.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for the mirror selfie.',
    tags: ['mall-rat', 'selfie', 'mirror', 'trigger-pending']
  },
  {
    id: 'mall_rat_mall_arcade',
    name: 'Mall Arcade',
    archetype: 'mallRat',
    collection: 'adventure',
    displayOrder: 13,
    imageUrl: '/assets/stickers/mallRat/08_mall_arcade.png',
    rarity: 'rare',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for beating the claw machine.',
    tags: ['mall-rat', 'arcade', 'claw-machine', 'trigger-pending']
  },
  {
    id: 'mall_rat_pretzel_and_iced_coffee',
    name: 'Pretzel and Iced Coffee',
    archetype: 'mallRat',
    collection: 'adventure',
    displayOrder: 14,
    imageUrl: '/assets/stickers/mallRat/10_pretzel_and_iced_coffee.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for the pretzel and iced coffee.',
    tags: ['mall-rat', 'pretzel', 'iced-coffee', 'snack', 'trigger-pending']
  },
  // Challenge-approved variant (Nov 20, 2026 — earn-audit fix #4, shape A):
  // generated in-house, not from a ZIP — Mall Rat had no challenge_approved
  // sticker, so its first non-starter approval earned nothing.
  {
    id: 'mall_rat_shopping_spree',
    name: 'Shopping Spree',
    archetype: 'mallRat',
    collection: 'achievement',
    displayOrder: 27,
    imageUrl: '/assets/stickers/mallRat/shopping-spree.png',
    rarity: 'rare',
    awardTrigger: 'challenge_approved',
    unlockReason: 'Earned when an eligible challenge is approved.',
    tags: ['mall-rat', 'shopping', 'spree', 'challenge']
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
  // Milestone variant (Nov 20, 2026 — earn-audit fix #2b): generated
  // in-house, not from a ZIP — Mascota had no archetype_milestone sticker.
  {
    id: 'mascota_mascot_trophy',
    name: 'Mascot Trophy',
    archetype: 'mascota',
    collection: 'achievement',
    displayOrder: 22,
    imageUrl: '/assets/stickers/mascota/mascot-trophy.png',
    rarity: 'rare',
    awardTrigger: 'archetype_milestone',
    unlockReason: 'Earned by reaching a Mascota archetype milestone.',
    tags: ['mascota', 'trophy', 'milestone']
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

  // Elondra pack (Nov 18, 2026 — Zach's call: add all ten as new). Neon
  // desert-glam object art, shipped as a ZIP with no metadata. All ten land
  // as new entries (no replacements — the existing 7 all match their names,
  // so there is no defect to fix; 05/09 sit alongside their same-theme
  // counterparts as distinct stickers: loafers vs the stiletto pump,
  // a full vanity kit vs the single compact). All trigger-pending
  // (admin_grant): no existing event fits them. Do NOT give new entries
  // awardTrigger 'starter_pack' — the server awards the whole starter pack at quiz
  // time (POST /api/stickers/evaluate, starter_pack) with no backfill for existing players.
  // Files were 1.2–2.2 MB each (1254x1254, 01 portrait 1024x1536); shrunk
  // to ~400px max dimension with PIL (LANCZOS, RGBA, transparency kept)
  // before import — 01 stays portrait (267x400) and letterboxes on the
  // square shelf. Originals live in the ZIP
  // Elondra_10_Transparent_Stickers_65_4g50.zip, not in the repo.
  {
    id: 'elondra_neon_cactus_cooler',
    name: 'Neon Cactus Cooler',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 21,
    imageUrl: '/assets/stickers/elondra/01_neon_cactus_cooler.png',
    rarity: 'common',
    // Trigger PENDING (Nov 18, 2026): no existing event fits a frozen
    // drink. Registered as admin_grant so it is visible and grantable,
    // never mis-awarded by a guessed event.
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for cooling off in style.',
    tags: ['elondra', 'cactus', 'cooler', 'drink', 'trigger-pending']
  },
  {
    id: 'elondra_starstruck_sunglasses',
    name: 'Starstruck Sunglasses',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 22,
    imageUrl: '/assets/stickers/elondra/02_starstruck_sunglasses.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for seeing stars everywhere.',
    tags: ['elondra', 'sunglasses', 'stars', 'glam', 'trigger-pending']
  },
  {
    id: 'elondra_bedazzled_phone',
    name: 'Bedazzled Phone',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 23,
    imageUrl: '/assets/stickers/elondra/03_bedazzled_phone.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for calling it in, bedazzled.',
    tags: ['elondra', 'phone', 'rhinestone', 'glam', 'trigger-pending']
  },
  {
    id: 'elondra_art_kit',
    name: 'Art Kit',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 24,
    imageUrl: '/assets/stickers/elondra/04_art_kit.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for sketching the scene.',
    tags: ['elondra', 'art', 'sketchbook', 'paint', 'trigger-pending']
  },
  {
    id: 'elondra_platform_loafers',
    name: 'Platform Loafers',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 25,
    imageUrl: '/assets/stickers/elondra/05_platform_loafers.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for walking tall on the platform.',
    tags: ['elondra', 'loafers', 'shoes', 'platform', 'trigger-pending']
  },
  {
    id: 'elondra_cosmic_charm_bracelet',
    name: 'Cosmic Charm Bracelet',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 26,
    imageUrl: '/assets/stickers/elondra/06_cosmic_charm_bracelet.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for collecting the whole sky.',
    tags: ['elondra', 'bracelet', 'charms', 'cosmic', 'trigger-pending']
  },
  {
    id: 'elondra_center_stage_microphone',
    name: 'Center Stage Microphone',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 27,
    imageUrl: '/assets/stickers/elondra/07_center_stage_microphone.png',
    rarity: 'rare',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for taking center stage.',
    tags: ['elondra', 'microphone', 'stage', 'theater', 'trigger-pending']
  },
  {
    id: 'elondra_desert_alien_encounter',
    name: 'Desert Alien Encounter',
    archetype: 'elondra',
    collection: 'adventure',
    displayOrder: 15,
    imageUrl: '/assets/stickers/elondra/08_desert_alien_encounter.png',
    rarity: 'rare',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q10): add a
    // desert-state tag and a rule. New `desert_state_approval` trigger —
    // fires from the approval bundle when the approved mission is tagged
    // to a desert state (AZ, NV, NM, UT; see DESERT_STATES in
    // `src/logic/locationTags.ts`). No mission carries such a tag yet, so
    // the rule cannot fire until one does — the rule is built, the path
    // is not live.
    awardTrigger: 'desert_state_approval',
    unlockReason: 'Earned when your first proof on a desert-state mission (AZ, NV, NM, UT) is approved.',
    tags: ['elondra', 'ufo', 'alien', 'desert']
  },
  {
    id: 'elondra_glamour_kit',
    name: 'Glamour Kit',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 28,
    imageUrl: '/assets/stickers/elondra/09_glamour_kit.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for the full glamour treatment.',
    tags: ['elondra', 'vanity', 'makeup', 'glam', 'trigger-pending']
  },
  {
    id: 'elondra_cosmic_shopping_bags',
    name: 'Cosmic Shopping Bags',
    archetype: 'elondra',
    collection: 'explorer',
    displayOrder: 29,
    imageUrl: '/assets/stickers/elondra/10_cosmic_shopping_bags.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for hauling the cosmos home.',
    tags: ['elondra', 'shopping', 'bags', 'cosmic', 'trigger-pending']
  },
  // Milestone variant (Nov 20, 2026 — earn-audit fix #2b): generated
  // in-house, not from a ZIP — Elondra had no archetype_milestone sticker.
  {
    id: 'elondra_tiara',
    name: 'Elondra Tiara',
    archetype: 'elondra',
    collection: 'achievement',
    displayOrder: 23,
    imageUrl: '/assets/stickers/elondra/tiara.png',
    rarity: 'rare',
    awardTrigger: 'archetype_milestone',
    unlockReason: 'Earned by reaching an Elondra archetype milestone.',
    tags: ['elondra', 'tiara', 'milestone']
  },

  // Captain Clipboard pack (Nov 19, 2026 — Zach's call: add all ten as
  // new, 02 + 03 rare). Flat-vector burgundy + gold + cream badge-backing
  // art (circle / shield / starburst / rounded square), shipped as a ZIP
  // with no metadata. All ten land as new entries — no replacements, no
  // re-renders, no byte-identical matches: the existing 7 all match their
  // names, so there is no defect to fix; 09 sits alongside the Checkmark
  // Seal as a distinct sticker (stamp tool + prohibition vs green seal +
  // checkmark). All trigger-pending (admin_grant): no existing event fits
  // them. Do NOT give new entries awardTrigger 'starter_pack' —
  // the server awards the whole starter pack at quiz
  // time (POST /api/stickers/evaluate, starter_pack) with no backfill for existing players. Files are 1024x1024,
  // 104–156 KB each — batch-1 size class, imported as-is, no shrink
  // needed. Originals live in the ZIP
  // captain_clipboard_10_unique_stickers_68_wdru.zip, not in the repo.
  {
    id: 'captain_clipboard_cat_eye_glasses',
    name: 'Cat Eye Glasses',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 30,
    imageUrl: '/assets/stickers/captainClipboard/01_cat_eye_glasses.png',
    rarity: 'common',
    // Trigger PENDING (Nov 19, 2026): no existing event fits cat-eye
    // sunglasses. Registered as admin_grant so it is visible and
    // grantable, never mis-awarded by a guessed event.
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for seeing the rules in style.',
    tags: ['captain-clipboard', 'glasses', 'cat-eye', 'sunglasses', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_rule_enforcer_gavel',
    name: 'Rule Enforcer Gavel',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 31,
    imageUrl: '/assets/stickers/captainClipboard/02_rule_enforcer_gavel.png',
    rarity: 'rare',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for laying down the law.',
    tags: ['captain-clipboard', 'gavel', 'rules', 'authority', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_chess_queen',
    name: 'Chess Queen',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 32,
    imageUrl: '/assets/stickers/captainClipboard/03_chess_queen.png',
    rarity: 'rare',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for playing the long game.',
    tags: ['captain-clipboard', 'chess', 'queen', 'strategy', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_sideline_megaphone',
    name: 'Sideline Megaphone',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 33,
    imageUrl: '/assets/stickers/captainClipboard/04_sideline_megaphone.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for calling it from the sidelines.',
    tags: ['captain-clipboard', 'megaphone', 'sideline', 'cheer', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_color_coded_organizer',
    name: 'Color Coded Organizer',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 34,
    imageUrl: '/assets/stickers/captainClipboard/05_color_coded_organizer.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for filing everything in its place.',
    tags: ['captain-clipboard', 'organizer', 'color-coded', 'files', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_velvet_rope_checkpoint',
    name: 'Velvet Rope Checkpoint',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 35,
    imageUrl: '/assets/stickers/captainClipboard/06_velvet_rope_checkpoint.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for holding the line.',
    tags: ['captain-clipboard', 'velvet-rope', 'checkpoint', 'stanchion', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_perfect_lunchbox',
    name: 'Perfect Lunchbox',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 36,
    imageUrl: '/assets/stickers/captainClipboard/07_perfect_lunchbox.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for packing it perfectly.',
    tags: ['captain-clipboard', 'lunchbox', 'bento', 'fuel', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_minivan_keychain',
    name: 'Minivan Keychain',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 37,
    imageUrl: '/assets/stickers/captainClipboard/08_minivan_keychain.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for keeping the keys to the kingdom.',
    tags: ['captain-clipboard', 'keychain', 'minivan', 'keys', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_rules_stamp',
    name: 'Rules Stamp',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 38,
    imageUrl: '/assets/stickers/captainClipboard/09_rules_stamp.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for stamping the rules.',
    tags: ['captain-clipboard', 'stamp', 'rules', 'prohibition', 'trigger-pending']
  },
  {
    id: 'captain_clipboard_precision_measuring_tape',
    name: 'Precision Measuring Tape',
    archetype: 'captainClipboard',
    collection: 'explorer',
    displayOrder: 39,
    imageUrl: '/assets/stickers/captainClipboard/10_precision_measuring_tape.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for measuring twice.',
    tags: ['captain-clipboard', 'measuring-tape', 'precision', 'tape', 'trigger-pending']
  },
  // Milestone variant (Nov 20, 2026 — earn-audit fix #2b): generated
  // in-house, not from a ZIP — Captain Clipboard had no archetype_milestone sticker.
  {
    id: 'captain_clipboard_golden_clipboard',
    name: 'Golden Clipboard',
    archetype: 'captainClipboard',
    collection: 'achievement',
    displayOrder: 24,
    imageUrl: '/assets/stickers/captainClipboard/golden-clipboard.png',
    rarity: 'rare',
    awardTrigger: 'archetype_milestone',
    unlockReason: 'Earned by reaching a Captain Clipboard archetype milestone.',
    tags: ['captain-clipboard', 'clipboard', 'gold', 'milestone']
  },
  // Challenge-approved variant (Nov 20, 2026 — earn-audit fix #4, shape A):
  // generated in-house, not from a ZIP — Captain Clipboard had no
  // challenge_approved sticker, so its first non-starter approval earned
  // nothing. Rarity mirrors the existing set (two rare, one common).
  {
    id: 'captain_clipboard_gold_star',
    name: 'Gold Star',
    archetype: 'captainClipboard',
    collection: 'achievement',
    displayOrder: 26,
    imageUrl: '/assets/stickers/captainClipboard/gold-star.png',
    rarity: 'rare',
    awardTrigger: 'challenge_approved',
    unlockReason: 'Earned when an eligible challenge is approved.',
    tags: ['captain-clipboard', 'gold-star', 'approval', 'challenge']
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
  // Milestone variant (Nov 20, 2026 — earn-audit fix #2b): generated
  // in-house, not from a ZIP — Lost Camper had no archetype_milestone
  // sticker. Gobbler-persona players earn this one: the field-type map
  // sends theGobbler to the lostCamper sticker archetype.
  {
    id: 'lost_camper_starry_tent',
    name: 'Starry Tent',
    archetype: 'lostCamper',
    collection: 'achievement',
    displayOrder: 25,
    imageUrl: '/assets/stickers/lostCamper/starry-tent.png',
    rarity: 'rare',
    awardTrigger: 'archetype_milestone',
    unlockReason: 'Earned by reaching a Lost Camper archetype milestone.',
    tags: ['lost-camper', 'tent', 'stars', 'milestone']
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
  // Challenge-approved variant (Nov 20, 2026 — earn-audit fix #4, shape A):
  // generated in-house, not from a ZIP — Bigfoot had no challenge_approved
  // sticker, so its first non-starter approval earned nothing. Common, to
  // mirror the existing set's two-rare-one-common split (Compass is the
  // other common one — the wild archetypes earn common, the rest rare).
  {
    id: 'bigfoot_tracks',
    name: 'Bigfoot Tracks',
    archetype: 'bigfoot',
    collection: 'achievement',
    displayOrder: 28,
    imageUrl: '/assets/stickers/bigfoot/tracks.png',
    rarity: 'common',
    awardTrigger: 'challenge_approved',
    unlockReason: 'Earned when an eligible challenge is approved.',
    tags: ['bigfoot', 'tracks', 'footprints', 'challenge']
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
  },

  // FIRST OFFENSES — starter achievement series (Nov 17, 2026). Cross-pack:
  // no archetype, so every player can earn them. 9 of 12 land here; the
  // remaining 3 arrive separately — do not generate replacements. Series
  // art: public/assets/stickers/achievement/ (original filenames kept).
  {
    id: 'first_offenses_fresh_meat',
    name: 'Fresh Meat',
    collection: 'achievement',
    displayOrder: 13,
    imageUrl: '/assets/stickers/achievement/01_fresh_meat.png',
    rarity: 'common',
    awardTrigger: 'first_submission',
    unlockReason: 'Earned when you submit your first receipt.',
    tags: ['first-offenses', 'achievement', 'first-submission', 'receipt']
  },
  {
    id: 'first_offenses_scene_starter',
    name: 'Scene Starter',
    collection: 'achievement',
    displayOrder: 14,
    imageUrl: '/assets/stickers/achievement/02_scene_starter.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q2): a separate
    // first-draw moment, not stacked on first_submission. New `first_draw`
    // event, evaluated at the draw-time call site.
    awardTrigger: 'first_draw',
    unlockReason: 'Earned when you start your first mission.',
    tags: ['first-offenses', 'achievement', 'first-mission']
  },
  {
    id: 'first_offenses_the_instigator',
    name: 'The Instigator',
    collection: 'achievement',
    displayOrder: 15,
    imageUrl: '/assets/stickers/achievement/03_the_instigator.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q3): `crew_created`,
    // stacking with Whistle Lanyard on creating a crew.
    awardTrigger: 'crew_created',
    unlockReason: 'Earned when you kick off your first mission or group action.',
    tags: ['first-offenses', 'achievement', 'initiated']
  },
  {
    id: 'first_offenses_democracy_is_messy',
    name: 'Democracy Is Messy',
    collection: 'achievement',
    displayOrder: 16,
    imageUrl: '/assets/stickers/achievement/04_democracy_is_messy.png',
    rarity: 'common',
    awardTrigger: 'weekly_vote_cast',
    unlockReason: 'Earned by casting your first weekly vote.',
    tags: ['first-offenses', 'achievement', 'voting', 'weekly-vote']
  },
  {
    id: 'first_offenses_accomplice',
    name: 'Accomplice',
    collection: 'achievement',
    displayOrder: 17,
    imageUrl: '/assets/stickers/achievement/05_accomplice.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q11): the join alone
    // no longer earns it. The bar is the crew still existing a week after
    // it was created, so the award comes from the crew-membership check
    // in `src/services/crewService.ts` (reconciliation + join paths),
    // not the join event. Joining a crew that is already a week old
    // qualifies on the next check; a new crew qualifies once it ages
    // into a week. The codebase's only cron schedule is disabled (see
    // server.ts), so there is no server job for this — the lazy check
    // is the mechanism, and the unlock dedupes re-checks.
    awardTrigger: 'crew_survived_week',
    unlockReason: 'Earned when a crew you joined is still going a week later.',
    tags: ['first-offenses', 'achievement', 'crew', 'collaboration']
  },
  {
    id: 'first_offenses_outside_person',
    name: 'Outside Person',
    collection: 'achievement',
    displayOrder: 18,
    imageUrl: '/assets/stickers/achievement/06_outside_person.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q4): `location_verified`
    // — first approved proof on a location-tagged mission only (not any
    // captured GPS). Fires from the approval bundle; see the evaluator.
    // Today only the Texas deck carries location tags, so in practice the
    // first Texas approval earns this alongside Roadside Weird and the
    // Texas Y'all 01 — the stacking the game already does elsewhere.
    awardTrigger: 'location_verified',
    unlockReason: 'Earned when you complete your first location-based adventure.',
    tags: ['first-offenses', 'achievement', 'location']
  },
  {
    id: 'first_offenses_repeat_offender',
    name: 'Repeat Offender',
    collection: 'achievement',
    displayOrder: 19,
    imageUrl: '/assets/stickers/achievement/07_repeat_offender.png',
    rarity: 'rare',
    awardTrigger: 'mission_count_milestone',
    unlockReason: 'Earned when your third proof is approved.',
    tags: ['first-offenses', 'achievement', 'milestone', 'third-proof']
  },
  {
    id: 'first_offenses_level_up',
    name: 'Level Up',
    collection: 'achievement',
    displayOrder: 20,
    imageUrl: '/assets/stickers/achievement/08_level_up.png',
    rarity: 'common',
    awardTrigger: 'level_up',
    unlockReason: 'Earned when you reach a new level for the first time.',
    tags: ['first-offenses', 'achievement', 'level', 'promotion']
  },
  {
    id: 'first_offenses_certified_menace',
    name: 'Certified Menace',
    collection: 'achievement',
    displayOrder: 21,
    imageUrl: '/assets/stickers/achievement/09_certified_menace.png',
    rarity: 'rare',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q5): "Chaos" in play
    // is a Chaos-collection sticker, and the 10 Chaos stickers stay
    // admin-grant by design (each with a written grant moment — see the
    // Chaos block). So this fires automatically the first time ANY Chaos
    // sticker is granted: the grant endpoint awards it alongside the
    // granted sticker (see `src/server/stickerGrants.ts`). It stays
    // `admin_grant` because the grant flow is its award path — an admin
    // can also grant it directly. A player who already holds a Chaos
    // sticker earns it on their next Chaos grant (catch-up, same pattern
    // as the milestone rules).
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for your first Chaos achievement.',
    tags: ['first-offenses', 'achievement', 'chaos']
  },

  // ---------------------------------------------------------------------------
  // MILESTONE / CHAOS — batch 2 (Nov 18, 2026)
  // ---------------------------------------------------------------------------
  // The milestone ZIP (fieldtrip_milestone_stickers_26_64ju.zip) held five
  // PNGs, but four of them name stickers that ALREADY exist from the FIRST
  // OFFENSES batch (commit 27b43ba): Outside Person, Repeat Offender,
  // Level Up, Certified Menace. The batch-2 files are different renders of
  // the same art — higher resolution, with the sticker name baked in as a
  // title banner (and edge slivers of neighbouring stickers where they
  // were cropped from a sheet). They REPLACED the batch-1 art at the same
  // paths on Zach's call, Nov 17 (commit 1890150; batch-1 preserved under
  // stickers/achievement/alternates/). Only the genuinely new sticker
  // lands here. Nov 20: Zach sent final renders for three of the four
  // (Level Up, On a Roll, Certified Menace), which replaced the batch-2
  // art at the same paths; Outside Person and Repeat Offender stay
  // batch-2. See milestoneStickers.test.ts, which pins the live files.
  {
    id: 'chaos_on_a_roll',
    name: 'On a Roll',
    collection: 'chaos',
    displayOrder: 1,
    imageUrl: '/assets/stickers/chaos/on_a_roll.png',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q1): five approved
    // proofs on five consecutive days, rarity common → rare. The streak
    // is maintained server-side on the profile (`approvalStreakDays`, UTC
    // calendar days) because the snapshot carries no approval history;
    // the evaluator fires `approval_streak` at >= 5 (catch-up rule).
    rarity: 'rare',
    awardTrigger: 'approval_streak',
    unlockReason: 'Earned for five approved proofs on five days in a row.',
    tags: ['milestone', 'chaos', 'streak']
  },

  // ---------------------------------------------------------------------------
  // CHAOS PACK — 10 new entries (Nov 19, 2026; Zach's call)
  // ---------------------------------------------------------------------------
  // The chaos ZIP (FIELDTRIP_Chaos_Stickers_10_Transparent_PNG_70_g0xa.zip)
  // held 10 PNGs numbered 01–10 — all entirely new scenes, none a re-render
  // of On a Roll. Same neon pop-art style as On a Roll (faces on inanimate
  // objects, lightning shades, tongue out). Chaos goes from 1 lonely sticker
  // to a real shelf of 11.
  //
  // Files were 1254x1254, 1.5–2.3 MB each (~19.6 MB total) — shrunk with
  // PIL LANCZOS to 400x400 RGBA before import (Elondra precedent), total
  // ~2.7 MB. chaosPack.test.ts pins the post-shrink md5s.
  //
  // 01 + 10 ship AS-IS with their own art slightly clipped at the top edge
  // (~30–35 px of the white die-cut border interrupted — 01's popcorn puff,
  // 10's alarm-ray tip). A clean crop would cut the art, so no crop without
  // Zach's call. 04's top-left corner alpha is 1 (one pixel) — negligible.
  //
  // All 10 stay admin_grant by design (earn-audit fix #3, Nov 20, 2026 —
  // Zach's call, Q5 + Chaos suggestion): Chaos is earned by random/crazy
  // actions in real life, and no mechanical reading of "melting down in
  // the best way" is honest — forcing one would be worse than the grant.
  // Each unlockReason below names the grant moment, so granting is not
  // arbitrary: Zach awards the sticker when the moment happens. Granting
  // any Chaos sticker also awards Certified Menace automatically (first
  // Chaos achievement) — see `src/server/stickerGrants.ts`. Rarity is
  // Zach's call: 04 Vending Machine and 06 Disco Explosion are rare; the
  // other eight are common.
  {
    id: 'chaos_runaway_cart',
    name: 'Runaway Cart',
    collection: 'chaos',
    displayOrder: 2,
    imageUrl: '/assets/stickers/chaos/chaos_01_runaway_cart.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for letting the cart run away with you.',
    tags: ['chaos', 'cart', 'runaway', 'trigger-pending']
  },
  {
    id: 'chaos_roller_skate',
    name: 'Roller Skate',
    collection: 'chaos',
    displayOrder: 3,
    imageUrl: '/assets/stickers/chaos/chaos_02_roller_skate.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for skating straight into the chaos.',
    tags: ['chaos', 'roller-skate', 'skate', 'trigger-pending']
  },
  {
    id: 'chaos_backpack_heist',
    name: 'Backpack Heist',
    collection: 'chaos',
    displayOrder: 4,
    imageUrl: '/assets/stickers/chaos/chaos_03_backpack_heist.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for pulling off the heist — in, out, and gone before anyone notices.',
    tags: ['chaos', 'backpack', 'heist', 'trigger-pending']
  },
  {
    id: 'chaos_vending_machine',
    name: 'Vending Machine',
    collection: 'chaos',
    displayOrder: 5,
    imageUrl: '/assets/stickers/chaos/chaos_04_vending_machine.png',
    rarity: 'rare',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for shaking the vending machine until it gave up the goods.',
    tags: ['chaos', 'vending-machine', 'trigger-pending']
  },
  {
    id: 'chaos_melting_cone',
    name: 'Melting Cone',
    collection: 'chaos',
    displayOrder: 6,
    imageUrl: '/assets/stickers/chaos/chaos_05_melting_cone.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for melting down in the best way.',
    tags: ['chaos', 'traffic-cone', 'cone', 'trigger-pending']
  },
  {
    id: 'chaos_disco_explosion',
    name: 'Disco Explosion',
    collection: 'chaos',
    displayOrder: 7,
    imageUrl: '/assets/stickers/chaos/chaos_06_disco_explosion.png',
    rarity: 'rare',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for blowing the disco ball wide open.',
    tags: ['chaos', 'disco', 'explosion', 'trigger-pending']
  },
  {
    id: 'chaos_crayon_campfire',
    name: 'Crayon Campfire',
    collection: 'chaos',
    displayOrder: 8,
    imageUrl: '/assets/stickers/chaos/chaos_07_crayon_campfire.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for burning the crayons and roasting the marshmallow anyway.',
    tags: ['chaos', 'crayon', 'campfire', 'trigger-pending']
  },
  {
    id: 'chaos_punk_moon',
    name: 'Punk Moon',
    collection: 'chaos',
    displayOrder: 9,
    imageUrl: '/assets/stickers/chaos/chaos_08_punk_moon.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for howling at the punk moon.',
    tags: ['chaos', 'moon', 'punk', 'trigger-pending']
  },
  {
    id: 'chaos_confused_signpost',
    name: 'Confused Signpost',
    collection: 'chaos',
    displayOrder: 10,
    imageUrl: '/assets/stickers/chaos/chaos_09_confused_signpost.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for following the signpost that points everywhere at once.',
    tags: ['chaos', 'signpost', 'confused', 'trigger-pending']
  },
  {
    id: 'chaos_cosmic_payphone',
    name: 'Cosmic Payphone',
    collection: 'chaos',
    displayOrder: 11,
    imageUrl: '/assets/stickers/chaos/chaos_10_cosmic_payphone.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for answering the cosmic payphone.',
    tags: ['chaos', 'payphone', 'cosmic', 'trigger-pending']
  },

  // ---------------------------------------------------------------------------
  // SIDE QUESTS — new collection (Nov 18, 2026; Zach's call)
  // ---------------------------------------------------------------------------
  // The side-quests ZIP (fieldtrip_side_quests_12_transparent_png_44_9l2i.zip)
  // held 12 PNGs numbered 13–24 — a SEPARATE set, not the 3 missing FIRST
  // OFFENSES (those would be 10, 11, 12 and are still outstanding). 11 of
  // the 12 land here under a new Side Quests collection (Zach's pick over
  // mixing them into Adventure/Chaos/Social). 18_mall_rat is LEFT OUT by
  // Zach's call: it collides three ways (Mall Rat is an Explorer persona,
  // a 7-entry mall_rat_* series already exists, and the art is the
  // Escalator Pose + Shopping Bags stickers combined). It is not in the
  // registry, not in any folder, not in alternates/.
  //
  // All 11 are trigger-pending (admin_grant): no existing event fits a
  // side quest — detours, hidden gems, roadside weirdness, after-hours.
  // Zach's call on what earns each one. Rarity is Zach's call too:
  // Hidden Gem, Full Send, Plot Twist, and Sasquatch Sighting are rare;
  // the other seven are common.
  //
  // 21_full_send ships AS-IS with a non-transparent top-right corner (a
  // flame touches the edge) — same class of edge artifact the batch-2
  // swap carried. Do not crop or regenerate without Zach's call.
  {
    id: 'side_quests_retail_therapy',
    name: 'Retail Therapy',
    archetype: 'mallRat',
    collection: 'side_quests',
    displayOrder: 1,
    imageUrl: '/assets/stickers/sideQuests/13_retail_therapy.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026): the Mall Rat first-approval
    // variant. Mall Rat had none, so its first approval fell back to the
    // Checkmark Seal default; now it earns Retail Therapy instead.
    awardTrigger: 'first_approval',
    unlockReason: 'Earned when your first proof is approved as the Mall Rat.',
    tags: ['side-quests', 'shopping', 'raccoon']
  },
  {
    id: 'side_quests_snack_attack',
    name: 'Snack Attack',
    collection: 'side_quests',
    displayOrder: 2,
    imageUrl: '/assets/stickers/sideQuests/14_snack_attack.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned when a snack stop becomes the adventure.',
    tags: ['side-quests', 'snack', 'skateboard', 'trigger-pending']
  },
  {
    id: 'side_quests_detour',
    name: 'Detour',
    collection: 'side_quests',
    displayOrder: 3,
    imageUrl: '/assets/stickers/sideQuests/15_detour.png',
    rarity: 'common',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for taking the detour instead of the highway.',
    tags: ['side-quests', 'detour', 'signpost', 'trigger-pending']
  },
  {
    id: 'side_quests_night_owl',
    name: 'Night Owl',
    collection: 'side_quests',
    displayOrder: 4,
    imageUrl: '/assets/stickers/sideQuests/16_night_owl.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q6): `late_night_submission`,
    // hour window 9 PM–midnight local (the submitting device's hour).
    awardTrigger: 'late_night_submission',
    hourWindow: [21, 24],
    unlockReason: 'Earned for submitting a proof between 9 PM and midnight.',
    tags: ['side-quests', 'night', 'owl', 'moon']
  },
  {
    id: 'side_quests_hidden_gem',
    name: 'Hidden Gem',
    collection: 'side_quests',
    displayOrder: 5,
    imageUrl: '/assets/stickers/sideQuests/17_hidden_gem.png',
    rarity: 'rare',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for finding a hidden gem off the main road.',
    tags: ['side-quests', 'hidden-gem', 'geode', 'trigger-pending']
  },
  {
    id: 'side_quests_good_company',
    name: 'Good Company',
    collection: 'side_quests',
    displayOrder: 6,
    imageUrl: '/assets/stickers/sideQuests/19_good_company.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026): crew_joined, alongside Accomplice.
    // Cross-pack, so it rides along on every crew join.
    awardTrigger: 'crew_joined',
    unlockReason: 'Earned when you join a Fieldtrip crew.',
    tags: ['side-quests', 'company', 'campfire']
  },
  {
    id: 'side_quests_roadside_weird',
    name: 'Roadside Weird',
    collection: 'side_quests',
    displayOrder: 7,
    imageUrl: '/assets/stickers/sideQuests/20_roadside_weird.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q7): `first_approval`
    // deck-scoped to Texas (the road-trip deck). Stacks with Texas Y'all
    // 01 on the first Texas approval — the stacking the game already does
    // elsewhere. Uses the Texas pack's deck-scoping (see the evaluator).
    awardTrigger: 'first_approval',
    deckId: 'texas-get-it-yall',
    unlockReason: "Earned when your first Texas Y'all proof is approved.",
    tags: ['side-quests', 'roadside', 'ufo', 'motel']
  },
  {
    id: 'side_quests_full_send',
    name: 'Full Send',
    collection: 'side_quests',
    displayOrder: 8,
    imageUrl: '/assets/stickers/sideQuests/21_full_send.png',
    rarity: 'rare',
    awardTrigger: 'admin_grant',
    unlockReason: 'Earned for going full send.',
    tags: ['side-quests', 'full-send', 'cart', 'trigger-pending']
  },
  {
    id: 'side_quests_after_hours',
    name: 'After Hours',
    collection: 'side_quests',
    displayOrder: 9,
    imageUrl: '/assets/stickers/sideQuests/22_after_hours.png',
    rarity: 'common',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q6): `late_night_submission`,
    // hour window midnight–5 AM local (the submitting device's hour).
    awardTrigger: 'late_night_submission',
    hourWindow: [0, 5],
    unlockReason: 'Earned for submitting a proof between midnight and 5 AM.',
    tags: ['side-quests', 'after-hours', 'neon', 'night']
  },
  {
    id: 'side_quests_plot_twist',
    name: 'Plot Twist',
    collection: 'side_quests',
    displayOrder: 10,
    imageUrl: '/assets/stickers/sideQuests/23_plot_twist.png',
    rarity: 'rare',
    // Earn-audit fix #3 (Nov 20, 2026): new `repair_approved` trigger.
    // Fires when an approval is a repair — the mission was sent back for
    // more proof and came back approved. See the server `wasRepair` computation in
    // `src/server/stickerEvaluate.ts`.
    awardTrigger: 'repair_approved',
    unlockReason: 'Earned when a proof sent back for more evidence comes back and gets approved.',
    tags: ['side-quests', 'plot-twist', 'map', 'ufo']
  },
  {
    id: 'side_quests_sasquatch_sighting',
    name: 'Sasquatch Sighting',
    collection: 'side_quests',
    displayOrder: 11,
    imageUrl: '/assets/stickers/sideQuests/24_sasquatch_sighting.png',
    rarity: 'rare',
    // Earn-audit fix #3 (Nov 20, 2026 — Zach's call, Q8): Bigfoot's
    // `first_approval` variant. Bigfoot's first approval used to fall
    // back to the Checkmark Seal default; now it earns this instead.
    archetype: 'bigfoot',
    awardTrigger: 'first_approval',
    unlockReason: 'Earned when your first proof is approved as Bigfoot.',
    tags: ['side-quests', 'sasquatch', 'bigfoot', 'skateboard', 'ufo']
  },

  // ---------------------------------------------------------------------------
  // TEXAS Y'ALL PACK — 10 new entries (Nov 20, 2026; design approved)
  // ---------------------------------------------------------------------------
  // The first deck-specific pack, and the pattern for future deck packs:
  // every entry carries deckId 'texas-get-it-yall' (deck FT-06, "Get It,
  // Y'all", 15 missions texas-01..texas-15). The evaluator deck-scopes
  // them (see src/logic/stickerEvaluator.ts): 01 fires on the first
  // approved Texas proof, 02/03/04/05/07/08/09/10 on approval of one
  // specific Texas mission each, 06 on completing the whole Texas deck.
  // No new trigger values — first_approval / challenge_approved /
  // season_milestone, deck-scoped. Rarity: 6 common / 3 rare / 1
  // legendary (Texas Gold, deck completion only).
  //
  // Art: the ZIP (fieldtrip_texas_yall_10_transparent_pngs_71_sgor.zip)
  // held 10 RGBA PNGs with neighboring-sheet bleed at the edges. Trimmed
  // by connected-component analysis (see docs/sticker-texas-yall-design.md
  // §9): foreign slivers removed, sticker art untouched. Trimmed files
  // live in public/assets/stickers/texas_yall/; texasYallPack.test.ts
  // pins their md5s.
  {
    id: 'texas_yall_01',
    name: 'Texas Y\'all',
    collection: 'texas_yall',
    displayOrder: 1,
    imageUrl: '/assets/stickers/texas_yall/01_texas_yall_sign.png',
    rarity: 'common',
    awardTrigger: 'first_approval',
    deckId: 'texas-get-it-yall',
    unlockReason: 'Earned when your first Texas Y\'all proof is approved. You showed up. Texas said y\'all come back now.',
    tags: ['texas-yall', 'texas', 'sign', 'first-approval']
  },
  {
    id: 'texas_yall_02',
    name: 'Big Mood Longhorn',
    collection: 'texas_yall',
    displayOrder: 2,
    imageUrl: '/assets/stickers/texas_yall/02_big_mood_longhorn.png',
    rarity: 'rare',
    awardTrigger: 'challenge_approved',
    deckId: 'texas-get-it-yall',
    missionId: 'texas-08',
    unlockReason: 'Earned by getting Longhorn Lookout approved. Spotted the big mood himself, horns and all.',
    tags: ['texas-yall', 'longhorn', 'texas-08']
  },
  {
    id: 'texas_yall_03',
    name: 'These Boots',
    collection: 'texas_yall',
    displayOrder: 3,
    imageUrl: '/assets/stickers/texas_yall/03_these_boots.png',
    rarity: 'common',
    awardTrigger: 'challenge_approved',
    deckId: 'texas-get-it-yall',
    missionId: 'texas-03',
    unlockReason: 'Earned by getting Boots on the Ground approved. Made for walking Texas ground.',
    tags: ['texas-yall', 'boots', 'texas-03']
  },
  {
    id: 'texas_yall_04',
    name: 'Prickly Personality',
    collection: 'texas_yall',
    displayOrder: 4,
    imageUrl: '/assets/stickers/texas_yall/04_prickly_personality.png',
    rarity: 'rare',
    awardTrigger: 'challenge_approved',
    deckId: 'texas-get-it-yall',
    missionId: 'texas-13',
    unlockReason: 'Earned by getting Big Bend Blues approved. Big Bend tough. Prickly, but make it charming.',
    tags: ['texas-yall', 'cactus', 'big-bend', 'texas-13']
  },
  {
    id: 'texas_yall_05',
    name: 'Lone Star State',
    collection: 'texas_yall',
    displayOrder: 5,
    imageUrl: '/assets/stickers/texas_yall/05_lone_star_state.png',
    rarity: 'common',
    awardTrigger: 'challenge_approved',
    deckId: 'texas-get-it-yall',
    missionId: 'texas-10',
    unlockReason: 'Earned by getting Lone Star Flag approved. One star, flown right.',
    tags: ['texas-yall', 'lone-star', 'flag', 'texas-10']
  },
  {
    id: 'texas_yall_06',
    name: 'Texas Gold',
    collection: 'texas_yall',
    displayOrder: 6,
    imageUrl: '/assets/stickers/texas_yall/06_texas_gold.png',
    rarity: 'legendary',
    awardTrigger: 'season_milestone',
    deckId: 'texas-get-it-yall',
    unlockReason: 'Earned by completing the Texas Y\'all deck, all fifteen missions approved. The whole deck, struck gold.',
    tags: ['texas-yall', 'texas-gold', 'deck-complete']
  },
  {
    id: 'texas_yall_07',
    name: 'Smoke Show',
    collection: 'texas_yall',
    displayOrder: 7,
    imageUrl: '/assets/stickers/texas_yall/07_smoke_show.png',
    rarity: 'common',
    awardTrigger: 'challenge_approved',
    deckId: 'texas-get-it-yall',
    missionId: 'texas-06',
    unlockReason: 'Earned by getting Brisket Smoke approved. Brisket smoke, certified show-stealer.',
    tags: ['texas-yall', 'brisket', 'smoke', 'texas-06']
  },
  {
    id: 'texas_yall_08',
    name: 'Taco Detour',
    collection: 'texas_yall',
    displayOrder: 8,
    imageUrl: '/assets/stickers/texas_yall/08_taco_detour.png',
    rarity: 'common',
    awardTrigger: 'challenge_approved',
    deckId: 'texas-get-it-yall',
    missionId: 'texas-02',
    unlockReason: 'Earned by getting Taco Truck Stop approved. Every great Texas trip takes a taco detour.',
    tags: ['texas-yall', 'taco', 'texas-02']
  },
  {
    id: 'texas_yall_09',
    name: 'Armadillo After Hours',
    collection: 'texas_yall',
    displayOrder: 9,
    imageUrl: '/assets/stickers/texas_yall/09_armadillo_after_hours.png',
    rarity: 'rare',
    awardTrigger: 'challenge_approved',
    deckId: 'texas-get-it-yall',
    missionId: 'texas-12',
    unlockReason: 'Earned by getting Friday Night Lights approved. Friday night lights, armadillo approved.',
    tags: ['texas-yall', 'armadillo', 'friday-night-lights', 'texas-12']
  },
  {
    id: 'texas_yall_10',
    name: 'Lone Star Refreshment',
    collection: 'texas_yall',
    displayOrder: 10,
    imageUrl: '/assets/stickers/texas_yall/10_lone_star_refreshment.png',
    rarity: 'common',
    awardTrigger: 'challenge_approved',
    deckId: 'texas-get-it-yall',
    missionId: 'texas-11',
    unlockReason: 'Earned by getting Swimming Hole approved. Cooled off Texas-style.',
    tags: ['texas-yall', 'swimming-hole', 'refreshment', 'texas-11']
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
