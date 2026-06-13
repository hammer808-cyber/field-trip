import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { getStickerById, STICKER_REGISTRY, StickerMetadata } from '../data/stickerRegistry';
import { normalizeEntryStatus } from '../logic/entryLogic';

interface StickerDecalProps {
  id?: string;
  stickerData?: StickerMetadata;
  className?: string;
  rotation?: number; // Custom rotation overrides, e.g. -5
  scale?: number; // Custom scale factor
  opacity?: number;
  animate?: boolean;
  interactive?: boolean; // If interactive, has subtle hover bounce and clicks
  zIndex?: string; // defaults to z-10
  style?: React.CSSProperties;
}

/**
 * StickerDecal: Renders a decorative sticker.
 * Falls back dynamically to an ultra-detailed, vintage physical-looking paper badge
 * if the PNG asset path fails to load or does not exist.
 */
export const StickerDecal: React.FC<StickerDecalProps> = ({
  id,
  stickerData,
  className,
  rotation,
  scale = 1,
  opacity = 0.9,
  animate = true,
  interactive = false,
  zIndex = 'z-10',
  style
}) => {
  // Resolve sticker data from registry if ID is provided
  const meta: StickerMetadata | undefined = stickerData || (id ? getStickerById(id) : undefined);
  const [imgError, setImgError] = useState(false);

  if (!meta) {
    return null;
  }

  // Calculate random-like but deterministic transformation if not custom overridden
  // Use a hash of the id for stability
  const charSum = meta.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const derivedRotation = rotation !== undefined ? rotation : (charSum % 16) - 8; // -8 to +8 degrees
  
  const rotationStyle = `rotate-[${derivedRotation}deg]`;
  const transformStyle = {
    transform: `rotate(${derivedRotation}deg) scale(${scale})`,
    opacity,
    ...style
  };

  const isDecorative = !interactive;

  const content = (
    <div 
      className={cn(
        "relative rounded-xl select-none",
        isDecorative ? "pointer-events-none" : "cursor-pointer"
      )}
    >
      {!imgError && meta.src ? (
        <img
          src={meta.src}
          alt={meta.alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain filter drop-shadow-[2px_3px_2px_rgba(0,0,0,0.25)]"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      ) : (
        // High fidelity Fallback Paper/Vintage Stamp look!
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-3 text-center border-4 border-on-surface bg-[#FFFDF5] rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:to-transparent before:pointer-events-none"
          )}
        >
          {/* Outer circle layout */}
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-on-surface/80 shadow-inner", meta.color)}>
            <span className="filter drop-shadow-[0_1.5px_1px_rgba(0,0,0,0.2)]">{meta.emoji}</span>
          </div>
          <span className={cn("text-[8px] font-sans font-black tracking-widest uppercase mt-2 select-none border-t border-on-surface/20 pt-1 leading-none w-full truncate", meta.textColor)}>
            {meta.label}
          </span>
          {/* Corner diagonal "peel" line detail */}
          <div className="absolute top-0 right-0 w-3 h-3 bg-on-surface/10 border-b border-l border-on-surface/40 transform rotate-0 rounded-bl" />
        </div>
      )}
    </div>
  );

  const containerClasses = cn(
    "absolute select-none pointer-events-none sm:pointer-events-auto",
    // Hide or shrink decorative stickers on mobile
    isDecorative ? "hidden sm:block" : "",
    zIndex,
    className
  );

  if (animate) {
    return (
      <motion.div
        className={containerClasses}
        style={transformStyle}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: scale, opacity: opacity }}
        whileHover={interactive ? { scale: scale * 1.05, y: -2, rotate: derivedRotation + 2 } : {}}
        whileTap={interactive ? { scale: scale * 0.95 } : {}}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className={containerClasses} style={transformStyle}>
      {content}
    </div>
  );
};

interface StickerCornerProps {
  id?: string;
  stickerData?: StickerMetadata;
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  scale?: number;
  className?: string;
  zIndex?: string;
}

/**
 * StickerCorner: Decorates a relative parent card's corners with overlapping stickers.
 */
export const StickerCorner: React.FC<StickerCornerProps> = ({
  id,
  stickerData,
  corner,
  scale = 0.85,
  className,
  zIndex = 'z-10'
}) => {
  const meta = stickerData || (id ? getStickerById(id) : STICKER_REGISTRY[0]);

  if (!meta) return null;

  // Determine standard positioning based on the requested corner
  let positionClasses = '';
  let rotateOffset = 0;

  switch (corner) {
    case 'top-left':
      positionClasses = '-top-4 -left-4';
      rotateOffset = -12;
      break;
    case 'top-right':
      positionClasses = '-top-4 -right-4';
      rotateOffset = 12;
      break;
    case 'bottom-left':
      positionClasses = '-bottom-4 -left-4';
      rotateOffset = -8;
      break;
    case 'bottom-right':
      positionClasses = '-bottom-4 -right-4';
      rotateOffset = 8;
      break;
  }

  return (
    <StickerDecal
      stickerData={meta}
      className={cn(positionClasses, className)}
      rotation={rotateOffset}
      scale={scale}
      zIndex={zIndex}
      animate={true}
    />
  );
};

interface StickerScatterProps {
  category?: StickerMetadata['category'];
  deckId?: string;
  limit?: number;
  className?: string;
  seed?: string;
}

/**
 * StickerScatter: Scatters small randomized stickers in the background of a relative container or card.
 */
export const StickerScatter: React.FC<StickerScatterProps> = ({
  category,
  deckId,
  limit = 2,
  className,
  seed = 'scatter-seed'
}) => {
  // Simple deterministic pseudo-random helper
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Filter stickers based on category or deck
  let pool: StickerMetadata[] = STICKER_REGISTRY;
  if (deckId) {
    pool = STICKER_REGISTRY.filter(s => s.deckId === deckId);
  } else if (category) {
    pool = STICKER_REGISTRY.filter(s => s.category === category);
  }

  if (pool.length === 0) {
    pool = STICKER_REGISTRY; // fallback to general
  }

  const matches: StickerMetadata[] = [];
  for (let i = 0; i < limit; i++) {
    const idx = (hash + i * 7) % pool.length;
    matches.push(pool[idx]);
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none -z-0 select-none", className)}>
      {matches.map((meta, idx) => {
        // Compute staggered positions
        const topRatio = 10 + ((hash + idx * 31) % 75); // 10% to 85%
        const leftRatio = 10 + ((hash + idx * 53) % 75); // 10% to 85%
        const rot = ((hash + idx * 19) % 20) - 10; // -10 to 10
        const itemScale = 0.65 + ((hash + idx * 9) % 4) * 0.05; // 0.65 to 0.85

        return (
          <StickerDecal
            key={`${meta.id}-${idx}`}
            stickerData={meta}
            rotation={rot}
            scale={itemScale}
            opacity={0.8}
            className="hidden md:block" // hide entirely on mobile for clean screen
            zIndex="z-[2]"
            animate={false}
            style={{
              top: `${topRatio}%`,
              left: `${leftRatio}%`
            } as any}
          />
        );
      })}
    </div>
  );
};

interface DeckStickerProps {
  deckId: string;
  className?: string;
  scale?: number;
  interactive?: boolean;
}

/**
 * DeckSticker: Specialized sticker for Field Deck representation on cards.
 */
export const DeckSticker: React.FC<DeckStickerProps> = ({
  deckId,
  className,
  scale = 1.0,
  interactive = false
}) => {
  // Find matching deck sticker
  const sticker = STICKER_REGISTRY.find(s => s.deckId === deckId && s.category === 'deck') 
    || STICKER_REGISTRY.find(s => s.id === 'heatwave-starter' && deckId === 'heatwave-receipts')
    || STICKER_REGISTRY[0];

  return (
    <StickerDecal
      stickerData={sticker}
      scale={scale}
      className={className}
      interactive={interactive}
      zIndex="z-10"
    />
  );
};

// StatusSticker removed - migrated to FieldBadge system
