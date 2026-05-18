import React from 'react';
import { AvatarData } from '../types/avatar';
import { AVATAR_MANIFEST } from '../constants/avatarAssets';
import { cn } from '../lib/utils';

interface AvatarPreviewProps {
  avatar?: AvatarData;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBackground?: boolean;
}

export const AvatarPreview: React.FC<AvatarPreviewProps> = ({ 
  avatar, 
  size = 'md', 
  className,
  showBackground = true
}) => {
  if (!avatar) return null;

  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  const getPath = (category: keyof typeof AVATAR_MANIFEST, id: string) => {
    const list = AVATAR_MANIFEST[category] as any[];
    return list.find(item => item.id === id)?.path || '';
  };

  const layers = [
    { id: 'bg', path: getPath('backgrounds', avatar.backgroundId), zIndex: 0 },
    { id: 'base', path: getPath('bases', avatar.baseId), zIndex: 10 },
    { id: 'outfit', path: getPath('outfits', avatar.outfitId), zIndex: 20 },
    { id: 'hair', path: getPath('hairs', avatar.hairId), zIndex: 30 },
    { id: 'accessory', path: getPath('accessories', avatar.accessoryId), zIndex: 40 },
    { id: 'badge', path: getPath('badges', avatar.badgeId), zIndex: 50 },
  ];

  return (
    <div className={cn(
      "relative overflow-hidden border-2 border-on-surface bg-white shadow-[4px_4px_0px_black] group",
      sizeClasses[size],
      className
    )}>
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
      
      {/* Fallback visual state if no assets actually load */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 z-0">
        <div className="w-1/2 h-1/2 rounded-full bg-brand-orange blur-xl" />
      </div>
      
      {/* Lens Overlay */}
      <div className="absolute inset-0 border border-white/10 pointer-events-none z-[60]" />
    </div>
  );
};
