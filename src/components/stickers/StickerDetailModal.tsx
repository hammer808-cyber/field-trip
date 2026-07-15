import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LockKeyhole, Sparkles, Star, X } from 'lucide-react';
import type { StickerDefinition } from '../../data/stickers';
import type { UserUnlockedSticker } from '../../services/stickerService';
import { cn } from '../../lib/utils';
import { STICKER_ARCHETYPE_LABELS } from './StickerFilterTabs';

interface StickerDetailModalProps {
  sticker: StickerDefinition | null;
  unlock?: UserUnlockedSticker;
  featuredCount: number;
  maxFeatured: number;
  isUpdatingFeatured: boolean;
  featuredError?: string | null;
  onClose: () => void;
  onSetFeatured: (featured: boolean) => void;
}

export function StickerDetailModal({
  sticker,
  unlock,
  featuredCount,
  maxFeatured,
  isUpdatingFeatured,
  featuredError,
  onClose,
  onSetFeatured
}: StickerDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sticker) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, sticker]);

  if (!sticker || typeof document === 'undefined') return null;

  const isUnlocked = Boolean(unlock);
  const isFeatured = unlock?.equipped === true;
  const featureLimitReached = !isFeatured && featuredCount >= maxFeatured;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={event => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sticker-detail-title"
        className="skin-modal relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-2 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-lg sm:p-6"
        style={{
          background: 'var(--skin-surface)',
          borderColor: 'var(--skin-border)',
          color: 'var(--skin-text)',
          boxShadow: 'var(--skin-modal-shadow, 8px 8px 0 var(--skin-border))'
        }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[var(--skin-surface)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--skin-border)', outlineColor: 'var(--skin-focus, var(--skin-primary))' }}
          aria-label="Close sticker details"
          title="Close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="mx-auto mb-5 aspect-square w-full max-w-[260px] overflow-hidden rounded-lg border-2" style={{ borderColor: 'var(--skin-border)', background: 'var(--skin-background)' }}>
          <div className="relative h-full w-full">
            <img
              src={sticker.imageUrl}
              alt={isUnlocked ? sticker.name : ''}
              className={cn(
                'h-full w-full object-contain p-5',
                !isUnlocked && 'grayscale brightness-0 opacity-20 blur-[1px]'
              )}
            />
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 bg-[var(--skin-surface)]" style={{ borderColor: 'var(--skin-border)' }}>
                  <LockKeyhole className="h-6 w-6" />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-current px-2 py-1 font-mono text-[9px] font-black uppercase">
                {sticker.rarity}
              </span>
              <span className="font-mono text-[9px] font-black uppercase opacity-55">
                {isUnlocked ? 'Unlocked' : 'Locked'}
              </span>
              {unlock?.seen === false && (
                <span className="inline-flex items-center gap-1 bg-[var(--skin-primary)] px-2 py-1 font-mono text-[9px] font-black uppercase">
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> New
                </span>
              )}
            </div>
            <h2 id="sticker-detail-title" className="mt-3 font-display text-2xl font-black uppercase leading-none">
              {sticker.name}
            </h2>
            <p className="mt-2 font-mono text-[10px] font-bold uppercase opacity-55">
              {STICKER_ARCHETYPE_LABELS[sticker.archetype]}
            </p>
          </div>

          <div className="border-y py-4" style={{ borderColor: 'color-mix(in srgb, var(--skin-border) 20%, transparent)' }}>
            <p className="font-mono text-[9px] font-black uppercase opacity-45">How to unlock</p>
            <p className="mt-2 font-serif text-sm font-semibold leading-relaxed">{sticker.unlockReason}</p>
          </div>

          {isUnlocked ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled={isUpdatingFeatured || featureLimitReached}
                onClick={() => onSetFeatured(!isFeatured)}
                className="skin-button flex min-h-12 w-full items-center justify-center gap-2 border-2 px-4 py-3 font-display text-sm font-black uppercase disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                  borderColor: 'var(--skin-border)',
                  background: isFeatured ? 'var(--skin-surface)' : 'var(--skin-primary)',
                  color: 'var(--skin-text)'
                }}
              >
                <Star className={cn('h-5 w-5', isFeatured && 'fill-current')} aria-hidden="true" />
                {isUpdatingFeatured
                  ? 'Updating...'
                  : isFeatured
                    ? 'Remove from profile'
                    : 'Feature on profile'}
              </button>
              <p className="text-center font-mono text-[9px] font-bold uppercase opacity-55" aria-live="polite">
                {featureLimitReached
                  ? `Profile full: remove one of your ${maxFeatured} featured stickers first.`
                  : `${featuredCount} of ${maxFeatured} profile spots used.`}
              </p>
              {featuredError && (
                <p className="border border-red-600 bg-red-50 px-3 py-2 text-center font-mono text-[9px] font-black uppercase text-red-800" role="alert">
                  {featuredError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-h-12 items-center justify-center gap-2 border-2 border-dashed px-4 py-3 font-mono text-[10px] font-black uppercase opacity-55" style={{ borderColor: 'var(--skin-border)' }}>
              <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Earn this sticker to feature it
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}
