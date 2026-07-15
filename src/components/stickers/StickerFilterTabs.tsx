import type { StickerArchetype } from '../../data/stickers';
import { cn } from '../../lib/utils';

export type StickerFilter = 'all' | StickerArchetype;

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

export function StickerFilterTabs({ activeFilter, onChange }: StickerFilterTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2 no-scrollbar">
      <div
        className="flex min-w-max gap-2"
        role="tablist"
        aria-label="Filter stickers by Field Type"
      >
        {STICKER_FILTER_OPTIONS.map(option => {
          const isActive = option.id === activeFilter;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(option.id)}
              className={cn(
                'skin-button min-h-11 border-2 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-wider transition-transform motion-reduce:transition-none',
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
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

