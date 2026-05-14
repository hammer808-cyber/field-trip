export interface AvatarData {
  baseId: string;
  hairId: string;
  outfitId: string;
  accessoryId: string;
  backgroundId: string;
  badgeId: string;
}

export interface AvatarOption {
  id: string;
  name: string;
  path: string;
}

export interface AvatarAssetManifest {
  bases: AvatarOption[];
  hairs: AvatarOption[];
  outfits: AvatarOption[];
  accessories: AvatarOption[];
  backgrounds: AvatarOption[];
  badges: AvatarOption[];
}
