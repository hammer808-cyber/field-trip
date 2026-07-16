import { Check, ChevronDown, Layers3, Lock } from 'lucide-react';
import type { DeckPack } from '../../types/deckPacks';
import { cn } from '../../lib/utils';
import { DeckArtwork } from '../DeckArtwork';
import { DeckProgressMeter } from './DeckProgressMeter';

export interface DeckShelfItem {
  pack: DeckPack;
  completed: number;
  total: number;
  percent: number;
  locked: boolean;
  lockReason?: string;
  selected: boolean;
}

export interface DeckShelfSection {
  id: string;
  label: string;
  items: DeckShelfItem[];
}

interface DeckShelfPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeDeckLabel: string;
  sections: DeckShelfSection[];
  onSelect: (packId: string) => void;
  className?: string;
}

export function DeckShelfPanel({
  open,
  onOpenChange,
  activeDeckLabel,
  sections,
  onSelect,
  className,
}: DeckShelfPanelProps) {
  const visibleCount = sections.reduce((count, section) => count + section.items.length, 0);

  return (
    <section className={cn('skin-card border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[var(--skin-card-shadow)]', className)}>
      <details
        id="deck-shelf"
        open={open}
        onToggle={(event) => onOpenChange(event.currentTarget.open)}
        className="group"
      >
        <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[var(--skin-border)] bg-[var(--skin-accent)] text-[var(--skin-on-accent)] shadow-[3px_3px_0_var(--skin-border)]">
              <Layers3 size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[var(--skin-primary)]">Mission library</p>
              <h2 className="font-display text-2xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">Deck Shelf</h2>
              <p className="mt-1 truncate font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
                {activeDeckLabel} active · {visibleCount} visible
              </p>
            </div>
          </div>
          <span className="flex min-h-11 min-w-11 items-center justify-center text-[var(--skin-text-muted)]">
            <ChevronDown className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>

        <div className="space-y-5 border-t-[3px] border-[var(--skin-border)] bg-[var(--skin-surface-muted)] p-4">
          {visibleCount === 0 ? (
            <p className="border-2 border-dashed border-[var(--skin-border-muted)] bg-[var(--skin-surface)] p-5 text-center font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--skin-text-muted)]">
              No deck assignments are currently visible.
            </p>
          ) : sections.map((section) => (
            <section key={section.id} aria-labelledby={`deck-shelf-${section.id}`} className="space-y-2">
              <h3 id={`deck-shelf-${section.id}`} className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[var(--skin-text-muted)]">
                {section.label}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <button
                    key={item.pack.packId}
                    type="button"
                    onClick={() => onSelect(item.pack.packId)}
                    disabled={item.locked || item.selected}
                    aria-current={item.selected ? 'true' : undefined}
                    className={cn(
                      'grid min-h-[88px] w-full grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] p-2 text-left transition-transform focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]',
                      item.selected && 'shadow-[4px_4px_0_var(--skin-border)]',
                      item.locked && 'cursor-not-allowed border-dashed opacity-65',
                      !item.locked && !item.selected && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--skin-border)]',
                    )}
                  >
                    <span className="relative aspect-[3/4] w-[52px] overflow-hidden border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)]">
                      <DeckArtwork pack={item.pack} alt={`${item.pack.title || item.pack.packName} cover`} grayscale={item.locked ? 'grayscale' : ''} />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">
                        {item.pack.packName}
                      </span>
                      {item.locked ? (
                        <span className="mt-2 block font-mono text-[8px] font-black uppercase leading-relaxed tracking-wider text-[var(--skin-warning)]">
                          {item.lockReason || 'Private field assignment'}
                        </span>
                      ) : (
                        <DeckProgressMeter
                          approvedCount={item.completed}
                          totalCount={item.total}
                          approvedPercent={item.percent}
                          compact
                          className="mt-2"
                        />
                      )}
                    </span>

                    <span className={cn(
                      'flex h-8 w-8 items-center justify-center border-2 border-[var(--skin-border)]',
                      item.selected ? 'bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)]' : 'bg-[var(--skin-surface-muted)] text-[var(--skin-text-muted)]',
                    )}>
                      {item.locked ? <Lock size={14} aria-label="Locked" /> : item.selected ? <Check size={16} aria-label="Active deck" /> : <span className="font-mono text-[8px] font-black" aria-hidden="true">GO</span>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </details>
    </section>
  );
}
