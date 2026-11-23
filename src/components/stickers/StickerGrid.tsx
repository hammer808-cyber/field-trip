import { COLLECTION_META, type StickerArchetype, type StickerCollection, type StickerDefinition } from '../../data/stickers';
import type { UserUnlockedSticker } from '../../services/stickerService';
import type { StickerFilter } from './StickerFilterTabs';
import { StickerCard } from './StickerCard';
import { cn } from '../../lib/utils';

/**
 * Folder-tab index colors (Nov 23, 2026): one Field Manual accent per
 * collection, as a fill chip on the folder tab — lime, magenta, and cyan
 * are fills only, never text. Keyed by collection so a shelf keeps its
 * color when its neighbors are hidden by a filter.
 */
export const STICKER_FOLDER_TAB_ACCENTS: Readonly<Record<StickerCollection, string>> = {
  explorer: 'var(--skin-primary)',
  adventure: 'var(--skin-accent)',
  side_quests: 'var(--skin-secondary)',
  achievement: 'var(--color-heat-yellow)',
  social: 'var(--color-brand-magenta)',
  chaos: 'var(--skin-warning)',
  limited_edition: 'var(--skin-success)',
  texas_yall: 'var(--color-brand-purple)',
};

/**
 * Folder tab (Nov 23, 2026): the tab on a shelf's top edge, in the same
 * tone as the sheet below it, so tab + sheet read as one folder in the
 * cabinet — the Dex hero tabs' language, carried inside the Stickers
 * tab. The tab carries the section's name and count; the sheet below
 * keeps only the tagline and the grid. The negative bottom margin
 * (inline style, so it always matches the sheet's border width) pulls
 * the sheet's top border under the tab, hiding the border segment
 * beneath it — the tab is attached, not floating above the sheet.
 */
export function StickerFolderTab({
  label,
  count,
  accent,
  tone = 'plain',
  headingLevel = 'h3',
  headingId,
  large = false,
  overlapPx = 2,
}: {
  label: string;
  count?: string;
  accent: string;
  tone?: StickerShelfTone;
  headingLevel?: 'h2' | 'h3';
  headingId?: string;
  large?: boolean;
  overlapPx?: number;
}) {
  const Heading = headingLevel;
  return (
    <div
      data-testid="sticker-folder-tab"
      className={cn(
        'relative z-10 ml-3 inline-flex max-w-[calc(100%-12px)] items-center gap-2 rounded-t-lg border-2 border-b-0',
        large ? 'px-4 py-2' : 'px-3 py-1.5'
      )}
      style={{
        background: tone === 'muted' ? 'var(--skin-surface-muted)' : 'var(--skin-surface)',
        borderColor: 'var(--skin-border)',
        marginBottom: `-${overlapPx}px`,
      }}
    >
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 border border-[var(--skin-border)]"
        style={{ background: accent }}
      />
      <Heading
        id={headingId}
        className={cn(
          'min-w-0 truncate font-display font-black uppercase leading-none',
          large ? 'text-xl' : 'text-base'
        )}
      >
        {label}
      </Heading>
      {count !== undefined && (
        <span className="shrink-0 font-mono text-xs font-black uppercase opacity-70">{count}</span>
      )}
    </div>
  );
}

/**
 * One filed sheet per collection shelf (Nov 21, 2026): a bordered paper
 * sheet with a hard offset shadow, so the shelves read as stacked paper
 * in the folder instead of loose grids on one flat sheet. Alternating
 * tones — white sheet, muted sheet — keep the stack from reading as a
 * single color.
 *
 * Nov 23, 2026: the sheet gains an optional folder `tab` on its top
 * edge (see StickerFolderTab). The tab replaces the centered tape strip
 * — the tab is the top anchor now, so the tape would crowd the same
 * edge. The sticker tiles inside are untouched (including the locked
 * silhouettes).
 */
export type StickerShelfTone = 'plain' | 'muted';

export function StickerShelfSheet({
  tone = 'plain',
  tab,
  children,
}: {
  tone?: StickerShelfTone;
  /** Folder tab rendered flush on the sheet's top edge. */
  tab?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      {tab}
      <div
        className={cn(
          'relative border-2 p-3 shadow-[4px_4px_0_var(--skin-border)] sm:p-4',
          tone === 'muted' ? 'bg-[var(--skin-surface-muted)]' : 'bg-[var(--skin-surface)]'
        )}
        style={{ borderColor: 'var(--skin-border)', borderRadius: 'var(--skin-card-radius, 8px)' }}
      >
        {children}
      </div>
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
      <StickerShelfSheet
        tone={tone}
        tab={(
          <StickerFolderTab
            label={meta.label}
            count={`${earnedCount} / ${totalCount}`}
            accent={STICKER_FOLDER_TAB_ACCENTS[collection]}
            tone={tone}
          />
        )}
      >
        <div className="space-y-3">
          <p className="font-serif text-sm font-semibold opacity-65">{meta.tagline}</p>
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

