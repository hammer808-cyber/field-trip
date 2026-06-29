import React from 'react';
import { DeckPack } from '../types/deckPacks';
import { BASE_DECK_PLACEHOLDER, getDeckCoverImage } from '../lib/deckUtils';
import { cn } from '../lib/utils';

interface DeckArtworkProps {
  pack: DeckPack | null | undefined;
  alt?: string;
  className?: string;
  imageClassName?: string;
  grayscale?: string;
}

export function DeckArtwork({
  pack,
  alt,
  className,
  imageClassName,
  grayscale = 'grayscale-[10%]'
}: DeckArtworkProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      <img
        src={getDeckCoverImage(pack)}
        alt={alt || `${pack?.title || pack?.packName || 'Deck'} cover`}
        className={cn(
          'absolute inset-0 m-0 h-full w-full border-0 p-0 object-cover transition-transform duration-500',
          grayscale,
          imageClassName
        )}
        style={{ objectPosition: pack?.artPosition || 'center' }}
        referrerPolicy="no-referrer"
        onError={(event) => {
          event.currentTarget.src = BASE_DECK_PLACEHOLDER;
        }}
      />
    </div>
  );
}
