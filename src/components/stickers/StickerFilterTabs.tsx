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
        'skin-button min-h-11 border-2 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider transition-transform motion-reduce:transition-none',
        isActive
          ? 'translate-y-0 text-[var(--skin-button-primary-text,var(--skin-text))]'
          : 'bg-[var(--skin-surface)] text-[var(--skin-text-muted,var(--skin-text))] opacity-70 hover:opacity-100'
      )}
      style={isActive ? {
        background: 'var(--skin-primary)',
        borderColor: 'var(--skin-border)',
        boxShadow: '3px 3px 0 var(--skin-border)'
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
    <div className="-mx-1 overflow-x-auto px-1 pb-2 no-scrollbar">
      <div
        className="flex min-w-max gap-2"
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
    <div className="-mx-1 overflow-x-auto px-1 pb-2 no-scrollbar">
      <div
        className="flex min-w-max gap-2"
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

