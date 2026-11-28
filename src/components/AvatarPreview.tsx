import React from 'react';
import { AvatarData } from '../types/avatar';
import { AVATAR_MANIFEST } from '../constants/avatarAssets';
import { FIELD_TYPES, normalizeFieldType } from '../constants/fieldTypes';
import { cn } from '../lib/utils';

interface AvatarPreviewProps {
  avatar?: AvatarData;
  /** The player's real photo when the snapshot has one — shown first. */
  photoURL?: string | null;
  /** Persona id or display name — resolves to the character art. */
  fieldType?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBackground?: boolean;
}

export const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  avatar,
  photoURL,
  fieldType,
  size = 'md',
  className,
  showBackground = true
}) => {
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  // The layered-avatar SVGs (AVATAR_MANIFEST) were never shipped —
  // public/assets/avatars/ does not exist in the repo or on the live
  // build, so the layered images 404 and hide themselves, leaving a
  // blank white box. The box is never blank now: a real photo wins,
  // otherwise the persona character art for the player's field type
  // (all seven exist, unclassified included) renders underneath the
  // layers. If the assets ever ship, the layers paint over it.
  const character = FIELD_TYPES[normalizeFieldType(fieldType)] || FIELD_TYPES.unclassified;
  const fallbackSrc = photoURL || character.avatarPath;

  const getPath = (category: keyof typeof AVATAR_MANIFEST, id: string) => {
    const list = AVATAR_MANIFEST[category] as any[];
    return list.find(item => item.id === id)?.path || '';
  };

  const layers = avatar ? [
    { id: 'bg', path: getPath('backgrounds', avatar.backgroundId), zIndex: 0 },
    { id: 'base', path: getPath('bases', avatar.baseId), zIndex: 10 },
    { id: 'outfit', path: getPath('outfits', avatar.outfitId), zIndex: 20 },
    { id: 'hair', path: getPath('hairs', avatar.hairId), zIndex: 30 },
    { id: 'accessory', path: getPath('accessories', avatar.accessoryId), zIndex: 40 },
    { id: 'badge', path: getPath('badges', avatar.badgeId), zIndex: 50 },
  ] : [];

  return (
    <div className={cn(
      "relative overflow-hidden border-2 border-on-surface bg-white shadow-[4px_4px_0px_black] group",
      sizeClasses[size],
      className
    )}>
      {/* Fallback portrait: photo, else persona character art. Sits
          under the layers; visible whenever they 404 away. */}
      <img
        src={fallbackSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        onError={(e) => {
          // A dead photo URL falls back to the persona art, once.
          const img = e.target as HTMLImageElement;
          if (!img.dataset.fallback && img.src !== character.avatarPath) {
            img.dataset.fallback = '1';
            img.src = character.avatarPath;
          }
        }}
      />
      {layers.map(layer => {
        if (!layer.path) return null;
        if (layer.id === 'bg' && !showBackground) return null;

        return (
          <img
            key={layer.id}
            src={layer.path}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-500"
            style={{ zIndex: layer.zIndex }}
            onError={(e) => {
              // Hide broken images in the UI if they don't exist yet
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        );
      })}

      {/* Decorative Shimmer Edge */}
      <div className="absolute top-0 right-0 w-1 h-full bg-brand-lime opacity-50 z-[100]" />

      {/* Lens Overlay */}
      <div className="absolute inset-0 border border-white/10 pointer-events-none z-[60]" />
    </div>
  );
};
