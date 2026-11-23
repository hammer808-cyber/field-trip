import { COLLECTION_META, COLLECTION_SHELF_ORDER, type StickerCollection } from '../../data/stickers';
import type { StickerArchetype } from '../../data/stickers';
import { cn } from '../../lib/utils';

export type StickerFilter = 'all' | StickerArchetype;

export type StickerCollectionFilter = 'all' | StickerCollection;

export interface StickerCollectionProgress {
  earned: number;
  total: number;
}

export const STICKER_ARCHETYPE_LABELS: Readonly<Record<StickerArchetype, string>> = {
  captainClipboard: 'Captain Clipboard',
  mallRat: 'Mall Rat',
  mascota: 'Mascota',
  elondra: 'Elondra',
  lostCamper: 'Lost Camper',
  bigfoot: 'Bigfoot'
};

export const STICKER_FILTER_OPTIONS: readonly Readonly<{
  id: StickerFilter;
  label: string;
}>[] = [
  { id: 'all', label: 'All' },
  ...Object.entries(STICKER_ARCHETYPE_LABELS).map(([id, label]) => ({
    id: id as StickerArchetype,
    label
  }))
];

interface StickerFilterTabsProps {
  activeFilter: StickerFilter;
  onChange: (filter: StickerFilter) => void;
}

/**
 * Folder index tab (Nov 23, 2026): the filter pills read as the folder
 * tabs of a filing cabinet — rounded top corners, open bottom, sitting
 * on the ruled divider under the row (the inner flex row carries the
 * 2px rule, so it spans the full scrollable width). The active tab is
 * the open folder: orange, with a 2px shadow in its own color that
 * covers the rule segment beneath it. Inactive tabs sit on the deeper
 * beige paper token (--skin-background-alt), not white, so they read
 * as paper chips on the cream folder ground. No hard shadow on the
 * tabs — the rule carries the strip. The shared .skin-button class is
 * deliberately absent: it forces a 14px all-corner radius, which
 * would undo the folder-tab shape.
 */
function FilterTabButton({
  label,
  isActive,
  onClick
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        'relative inline-flex min-h-11 shrink-0 items-center rounded-t-[10px] border-2 border-b-0 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider transition-colors motion-reduce:transition-none',
        isActive
          ? 'z-10 text-[var(--skin-button-primary-text,var(--skin-text))] shadow-[0_2px_0_var(--skin-primary)]'
          : 'bg-[var(--skin-background-alt)] text-[var(--skin-text-muted,var(--skin-text))] hover:bg-[var(--skin-surface)] hover:text-[var(--skin-text)]'
      )}
      style={isActive ? {
        background: 'var(--skin-primary)',
        borderColor: 'var(--skin-border)',
      } : {
        borderColor: 'var(--skin-border)'
      }}
    >
      {label}
    </button>
  );
}

export function StickerFilterTabs({ activeFilter, onChange }: StickerFilterTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
      <div
        className="flex min-w-max gap-2 border-b-2 border-[var(--skin-border)]"
        role="tablist"
        aria-label="Filter stickers by Field Type"
      >
        {STICKER_FILTER_OPTIONS.map(option => (
          <FilterTabButton
            key={option.id}
            label={option.label}
            isActive={option.id === activeFilter}
            onClick={() => onChange(option.id)}
          />
        ))}
      </div>
    </div>
  );
}

export const STICKER_COLLECTION_FILTER_OPTIONS: readonly Readonly<{
  id: StickerCollectionFilter;
  label: string;
}>[] = [
  { id: 'all', label: 'All' },
  ...COLLECTION_SHELF_ORDER.map(collection => ({
    id: collection as StickerCollectionFilter,
    label: COLLECTION_META[collection].label
  }))
];

interface StickerCollectionTabsProps {
  activeFilter: StickerCollectionFilter;
  /** Live progress per collection (plus 'all'); drives the `n/m` tab labels. */
  counts: Readonly<Record<StickerCollectionFilter, StickerCollectionProgress>>;
  onChange: (filter: StickerCollectionFilter) => void;
}

export function StickerCollectionTabs({ activeFilter, counts, onChange }: StickerCollectionTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
      <div
        className="flex min-w-max gap-2 border-b-2 border-[var(--skin-border)]"
        role="tablist"
        aria-label="Filter stickers by Collection"
      >
        {STICKER_COLLECTION_FILTER_OPTIONS.map(option => {
          const progress = counts[option.id];
          const label = progress ? `${option.label} ${progress.earned}/${progress.total}` : option.label;
          return (
            <FilterTabButton
              key={option.id}
              label={label}
              isActive={option.id === activeFilter}
              onClick={() => onChange(option.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

