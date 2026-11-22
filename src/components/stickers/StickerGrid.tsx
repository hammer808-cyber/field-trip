import { COLLECTION_META, type StickerArchetype, type StickerCollection, type StickerDefinition } from '../../data/stickers';
import type { UserUnlockedSticker } from '../../services/stickerService';
import type { StickerFilter } from './StickerFilterTabs';
import { StickerCard } from './StickerCard';
import { cn } from '../../lib/utils';

/**
 * One filed sheet per collection shelf (Nov 21, 2026): a bordered paper
 * sheet with a hard offset shadow and a tape strip across the top edge,
 * so the shelves read as stacked paper taped into the folder instead of
 * loose grids on one flat sheet. Alternating tones — white sheet, muted
 * sheet — keep the stack from reading as a single color. The sticker
 * tiles inside are untouched (including the locked silhouettes).
 */
export type StickerShelfTone = 'plain' | 'muted';

export function StickerShelfSheet({
  tone = 'plain',
  children,
}: {
  tone?: StickerShelfTone;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative border-2 p-3 shadow-[4px_4px_0_var(--skin-border)] sm:p-4',
        tone === 'muted' ? 'bg-[var(--skin-surface-muted)]' : 'bg-[var(--skin-surface)]'
      )}
      style={{ borderColor: 'var(--skin-border)', borderRadius: 'var(--skin-card-radius, 8px)' }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-3 left-1/2 z-20" style={{ transform: 'translateX(-50%) rotate(-2deg)' }}>
        <span className="field-tape block" />
      </span>
      {children}
    </div>
  );
}

/**
 * Archetype filter. A cross-pack sticker (no archetype, Stage 6) is never
 * hidden by the archetype filter — it appears under every chip.
 */
export function filterStickersByArchetype(
  stickers: readonly StickerDefinition[],
  filter: StickerFilter
): StickerDefinition[] {
  if (filter === 'all') return [...stickers];
  return stickers.filter(sticker => sticker.archetype === undefined || sticker.archetype === (filter as StickerArchetype));
}

interface StickerGridProps {
  stickers: readonly StickerDefinition[];
  unlocksById: ReadonlyMap<string, UserUnlockedSticker>;
  onOpenSticker: (sticker: StickerDefinition) => void;
}

export function StickerGrid({ stickers, unlocksById, onOpenSticker }: StickerGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {stickers.map(sticker => (
        <StickerCard
          key={sticker.id}
          sticker={sticker}
          unlock={unlocksById.get(sticker.id)}
          onOpen={onOpenSticker}
        />
      ))}
    </div>
  );
}

interface StickerCollectionSectionProps {
  collection: StickerCollection;
  /** Visible stickers in this shelf (already archetype-filtered). */
  stickers: readonly StickerDefinition[];
  /** Earned/total for the whole collection (unfiltered). */
  earnedCount: number;
  totalCount: number;
  unlocksById: ReadonlyMap<string, UserUnlockedSticker>;
  onOpenSticker: (sticker: StickerDefinition) => void;
  /** Copy shown when the shelf has no visible stickers. Defaults to the collection's empty state. */
  emptyMessage?: string;
  /** Filed-sheet ground: alternated by the caller so the stack reads as layered paper. */
  tone?: StickerShelfTone;
}

export function StickerCollectionSection({
  collection,
  stickers,
  earnedCount,
  totalCount,
  unlocksById,
  onOpenSticker,
  emptyMessage,
  tone = 'plain'
}: StickerCollectionSectionProps) {
  const meta = COLLECTION_META[collection];
  return (
    <section aria-label={`${meta.label} stickers`}>
      <StickerShelfSheet tone={tone}>
        <div className="space-y-3">
          <header className="flex items-baseline justify-between gap-3 border-b-2 border-dashed border-[var(--skin-border-muted)] pb-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-black uppercase leading-none">{meta.label}</h3>
              <p className="mt-1 font-serif text-sm font-semibold opacity-65">{meta.tagline}</p>
            </div>
            <p className="shrink-0 font-mono text-xs font-black uppercase opacity-70">
              {earnedCount} / {totalCount}
            </p>
          </header>
          {stickers.length === 0 ? (
            <p
              className="border-2 border-dashed px-4 py-6 text-center font-mono text-xs font-bold uppercase opacity-70"
              style={{ borderColor: 'var(--skin-border)' }}
            >
              {emptyMessage ?? meta.emptyState}
            </p>
          ) : (
            <StickerGrid stickers={stickers} unlocksById={unlocksById} onOpenSticker={onOpenSticker} />
          )}
        </div>
      </StickerShelfSheet>
    </section>
  );
}

