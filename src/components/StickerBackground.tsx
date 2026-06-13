import React from 'react';
import { MARKER_STICKERS } from '../data/markers';
import { cn } from '../lib/utils';

interface StickerBackgroundProps {
  density?: number;
  variant?: 'general' | 'vault' | 'field';
  className?: string;
  seed?: string;
}

// Simple deterministic pseudo-random generator
function seededRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const StickerBackground: React.FC<StickerBackgroundProps> = ({
  density = 5,
  variant = 'general',
  className,
  seed = 'sticker-seed'
}) => {
  const nextRand = seededRandom(seed);
  const stickers = [];

  for (let i = 0; i < density; i++) {
    const stickerIndex = Math.floor(nextRand() * MARKER_STICKERS.length);
    const sticker = MARKER_STICKERS[stickerIndex] || MARKER_STICKERS[0];
    
    const top = `${10 + nextRand() * 80}%`;
    const left = `${10 + nextRand() * 80}%`;
    const rotation = `${Math.floor(nextRand() * 40 - 20)}deg`;
    const scale = `${0.8 + nextRand() * 0.4}`;

    stickers.push({
      id: `${seed}-${i}`,
      sticker,
      style: {
        top,
        left,
        transform: `rotate(${rotation}) scale(${scale})`,
        position: 'absolute' as const,
      }
    });
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none select-none overflow-hidden -z-20", className)}>
      {stickers.map((item) => (
        <div
          key={item.id}
          style={item.style}
          className="flex flex-col items-center bg-white border-2 border-on-surface p-2 shadow-[2px_2px_0px_black] rotate-2"
        >
          <span className="text-2xl sm:text-3xl filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]">{item.sticker.emoji}</span>
          <span className="text-[6px] font-mono font-black uppercase text-on-surface/30 mt-1 tracking-widest">{item.sticker.label}</span>
        </div>
      ))}
    </div>
  );
};
