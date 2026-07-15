import { LockKeyhole, Sparkles, Star } from 'lucide-react';
import type { StickerDefinition } from '../../data/stickers';
import type { UserUnlockedSticker } from '../../services/stickerService';
import { cn } from '../../lib/utils';
import { STICKER_ARCHETYPE_LABELS } from './StickerFilterTabs';

interface StickerCardProps {
  sticker: StickerDefinition;
  unlock?: UserUnlockedSticker;
  onOpen: (sticker: StickerDefinition) => void;
}

export function StickerCard({ sticker, unlock, onOpen }: StickerCardProps) {
  const isUnlocked = Boolean(unlock);
  const isNew = isUnlocked && unlock?.seen === false;
  const isFeatured = isUnlocked && unlock?.equipped === true;

  return (
    <button
      type="button"
      onClick={() => onOpen(sticker)}
      className={cn(
        'skin-card group relative flex min-w-0 flex-col overflow-hidden border-2 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 motion-reduce:transition-none',
        !isUnlocked && 'border-dashed'
      )}
      style={{
        borderColor: 'var(--skin-border)',
        borderRadius: 'var(--skin-card-radius, 8px)',
        background: 'var(--skin-surface)',
        color: 'var(--skin-text)',
        boxShadow: isUnlocked ? 'var(--skin-card-shadow, 4px 4px 0 var(--skin-border))' : 'none',
        outlineColor: 'var(--skin-focus, var(--skin-primary))'
      }}
      aria-label={`${sticker.name}, ${isUnlocked ? 'unlocked' : 'locked'}`}
    >
      <div className="relative aspect-square w-full overflow-hidden border-b-2" style={{ borderColor: 'var(--skin-border)' }}>
        <div
          className="absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage: 'radial-gradient(var(--skin-border) 0.75px, transparent 0.75px)',
            backgroundSize: '11px 11px'
          }}
        />
        <img
          src={sticker.imageUrl}
          alt=""
          loading="lazy"
          className={cn(
            'relative h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none',
            !isUnlocked && 'grayscale brightness-0 opacity-20 blur-[1px]'
          )}
        />

        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[var(--skin-surface)]" style={{ borderColor: 'var(--skin-border)' }}>
              <LockKeyhole className="h-5 w-5" />
            </span>
          </div>
        )}

        {isNew && (
          <span className="absolute left-2 top-2 inline-flex min-h-7 items-center gap-1 border-2 bg-[var(--skin-primary)] px-2 font-mono text-[9px] font-black uppercase" style={{ borderColor: 'var(--skin-border)' }}>
            <Sparkles className="h-3 w-3" aria-hidden="true" /> New
          </span>
        )}

        {isFeatured && (
          <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[var(--skin-accent,var(--skin-primary))]" style={{ borderColor: 'var(--skin-border)' }} title="Featured on profile">
            <Star className="h-4 w-4 fill-current" aria-hidden="true" />
            <span className="sr-only">Featured on profile</span>
          </span>
        )}
      </div>

      <div className="flex min-h-[92px] flex-1 flex-col justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="line-clamp-2 font-display text-sm font-black uppercase leading-tight">
            {sticker.name}
          </p>
          <p className="mt-1 truncate font-mono text-[8px] font-bold uppercase opacity-55">
            {STICKER_ARCHETYPE_LABELS[sticker.archetype]}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-[8px] font-black uppercase">
          <span>{sticker.rarity}</span>
          <span className={isUnlocked ? 'opacity-65' : 'opacity-45'}>
            {isUnlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
      </div>
    </button>
  );
}

