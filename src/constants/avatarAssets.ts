import { AvatarAssetManifest, AvatarData } from '../types/avatar';

export const AVATAR_MANIFEST: AvatarAssetManifest = {
  bases: [
    { id: 'base-01', name: 'Archive Ivory', path: '/assets/avatars/base/base_ivory.svg' },
    { id: 'base-02', name: 'Field Ochre', path: '/assets/avatars/base/base_ochre.svg' },
    { id: 'base-03', name: 'Certified Obsidian', path: '/assets/avatars/base/base_obsidian.svg' },
    { id: 'base-04', name: 'Field Olive', path: '/assets/avatars/base/base_olive.svg' },
  ],
  hairs: [
    { id: 'hair-none', name: 'Buzz Cut', path: '/assets/avatars/hair/hair_none.svg' },
    { id: 'hair-01', name: 'Field Fringe', path: '/assets/avatars/hair/hair_01.svg' },
    { id: 'hair-02', name: 'RECON Top', path: '/assets/avatars/hair/hair_02.svg' },
    { id: 'hair-03', name: 'Baja Bun', path: '/assets/avatars/hair/hair_03.svg' },
    { id: 'hair-04', name: 'Urban Fade', path: '/assets/avatars/hair/hair_04.svg' },
  ],
  outfits: [
    { id: 'outfit-01', name: 'Bureau Uniform', path: '/assets/avatars/outfit/outfit_01.svg' },
    { id: 'outfit-02', name: 'Issue Poncho', path: '/assets/avatars/outfit/outfit_02.svg' },
    { id: 'outfit-03', name: 'Certified Parka', path: '/assets/avatars/outfit/outfit_03.svg' },
    { id: 'outfit-04', name: 'Field Jumpsuit', path: '/assets/avatars/outfit/outfit_04.svg' },
  ],
  accessories: [
    { id: 'acc-none', name: 'None', path: '' },
    { id: 'acc-01', name: 'Bureau Specs', path: '/assets/avatars/acc/acc_01.svg' },
    { id: 'acc-02', name: 'Field Lens', path: '/assets/avatars/acc/acc_02.svg' },
    { id: 'acc-03', name: 'RECON Hat', path: '/assets/avatars/acc/acc_03.svg' },
    { id: 'acc-04', name: 'Comms Headset', path: '/assets/avatars/acc/acc_04.svg' },
  ],
  backgrounds: [
    { id: 'bg-01', name: 'The Grid', path: '/assets/avatars/bg/bg_01.svg' },
    { id: 'bg-02', name: 'Post-Digital Sun', path: '/assets/avatars/bg/bg_02.svg' },
    { id: 'bg-03', name: 'Static Fog', path: '/assets/avatars/bg/bg_03.svg' },
    { id: 'bg-04', name: 'Bureau Vault', path: '/assets/avatars/bg/bg_04.svg' },
  ],
  badges: [
    { id: 'badge-none', name: 'Unassigned', path: '' },
    { id: 'badge-01', name: 'Standard Rank', path: '/assets/avatars/badge/badge_01.svg' },
    { id: 'badge-02', name: 'Advanced Rank', path: '/assets/avatars/badge/badge_02.svg' },
    { id: 'badge-03', name: 'Certified Rank', path: '/assets/avatars/badge/badge_03.svg' },
    { id: 'badge-04', name: 'Chaos Pilot', path: '/assets/avatars/badge/badge_04.svg' },
  ]
};

export const DEFAULT_AVATAR: AvatarData = {
  baseId: 'base-01',
  hairId: 'hair-none',
  outfitId: 'outfit-01',
  accessoryId: 'acc-none',
  backgroundId: 'bg-01',
  badgeId: 'badge-none'
};

export const PERSONA_AVATAR_PRESETS: Record<string, AvatarData> = {
  captainClipboard: {
    baseId: 'base-01',
    hairId: 'hair-none',
    outfitId: 'outfit-01',
    accessoryId: 'acc-01',
    backgroundId: 'bg-04',
    badgeId: 'badge-none'
  },
  mallRat: {
    baseId: 'base-02',
    hairId: 'hair-04',
    outfitId: 'outfit-04',
    accessoryId: 'acc-04',
    backgroundId: 'bg-02',
    badgeId: 'badge-none'
  },
  mascota: {
    baseId: 'base-03',
    hairId: 'hair-04',
    outfitId: 'outfit-04',
    accessoryId: 'acc-03',
    backgroundId: 'bg-01',
    badgeId: 'badge-04'
  },
  elondra: {
    baseId: 'base-03',
    hairId: 'hair-03',
    outfitId: 'outfit-03',
    accessoryId: 'acc-none',
    backgroundId: 'bg-01',
    badgeId: 'badge-none'
  },
  lostCamper: {
    baseId: 'base-04',
    hairId: 'hair-01',
    outfitId: 'outfit-02',
    accessoryId: 'acc-02',
    backgroundId: 'bg-03',
    badgeId: 'badge-none'
  },
  bigfoot: {
    baseId: 'base-03',
    hairId: 'hair-02',
    outfitId: 'outfit-02',
    accessoryId: 'acc-03',
    backgroundId: 'bg-03',
    badgeId: 'badge-none'
  }
};
