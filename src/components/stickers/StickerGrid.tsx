import { COLLECTION_META, type StickerArchetype, type StickerCollection, type StickerDefinition } from '../../data/stickers';
import type { UserUnlockedSticker } from '../../services/stickerService';
import type { StickerFilter } from './StickerFilterTabs';
import { StickerCard } from './StickerCard';

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
}

export function StickerCollectionSection({
  collection,
  stickers,
  earnedCount,
  totalCount,
  unlocksById,
  onOpenSticker,
  emptyMessage
}: StickerCollectionSectionProps) {
  const meta = COLLECTION_META[collection];
  return (
    <section aria-label={`${meta.label} stickers`} className="space-y-3">
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-black uppercase leading-none">{meta.label}</h3>
          <p className="mt-1 font-serif text-sm font-semibold opacity-65">{meta.tagline}</p>
        </div>
        <p className="shrink-0 font-mono text-xs font-black uppercase opacity-55">
          {earnedCount} / {totalCount}
        </p>
      </header>
      {stickers.length === 0 ? (
        <p
          className="border-2 border-dashed px-4 py-6 text-center font-mono text-xs font-bold uppercase opacity-55"
          style={{ borderColor: 'var(--skin-border)' }}
        >
          {emptyMessage ?? meta.emptyState}
        </p>
      ) : (
        <StickerGrid stickers={stickers} unlocksById={unlocksById} onOpenSticker={onOpenSticker} />
      )}
    </section>
  );
}

