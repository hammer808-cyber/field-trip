import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { DeckPack } from '../../types/deckPacks';
import { cn } from '../../lib/utils';
import { DeckArtwork } from '../DeckArtwork';
import { ActiveDeckPanel } from './ActiveDeckPanel';

interface ExpandableDeckLineProps {
  pack: DeckPack | null | undefined;
  displayName: string;
  approvedCount: number;
  pendingCount: number;
  totalCount: number;
  approvedPercent: number;
  pendingPercent: number;
  locked: boolean;
  lockReason?: string;
}

/**
 * The deck, folded into the mission card's title (Nov 16, 2026).
 * When a mission is drawn, the big deck panel is replaced by one
 * tappable line in the mission panel header: cover thumb, deck name,
 * and progress at a glance. Tapping it flips the full deck detail
 * open underneath (cover, subtitle, progress meter) — and tapping
 * again folds it back.
 *
 * The open/closed state is plain local state on purpose: it is never
 * persisted, so leaving the page always resets the deck to its
 * deck-art side, collapsed.
 */
export function ExpandableDeckLine({
  pack,
  displayName,
  approvedCount,
  pendingCount,
  totalCount,
  approvedPercent,
  pendingPercent,
  locked,
  lockReason,
}: ExpandableDeckLineProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={expanded ? `Hide ${displayName} deck details` : `Show ${displayName} deck details`}
        className="flex w-full min-h-11 items-center gap-3 border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] px-2.5 py-1.5 text-left shadow-[2px_2px_0_var(--skin-border)] transition-all hover:bg-[var(--skin-surface)] active:translate-y-0.5 active:shadow-none"
      >
        <span className="relative h-8 w-8 shrink-0 overflow-hidden border-2 border-[var(--skin-border)]">
          <DeckArtwork
            pack={pack}
            alt={`${displayName} cover`}
            grayscale=""
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-black uppercase italic leading-none text-[var(--skin-text)]">
            {displayName}
          </span>
          <span className="mt-1 block font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-text-muted)]">
            {locked
              ? 'Deck locked'
              : `${approvedCount}/${totalCount} approved · ${pendingCount} pending`}
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn(
            'shrink-0 text-[var(--skin-text-muted)] transition-transform duration-200',
            expanded && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="deck-detail"
            initial={{ opacity: 0, rotateX: -70, transformOrigin: 'top' }}
            animate={{ opacity: 1, rotateX: 0, transformOrigin: 'top' }}
            exit={{ opacity: 0, rotateX: -70, transformOrigin: 'top' }}
            transition={{ duration: 0.25 }}
            style={{ perspective: 800 }}
            className="mt-3"
          >
            <ActiveDeckPanel
              pack={pack}
              displayName={displayName}
              approvedCount={approvedCount}
              pendingCount={pendingCount}
              totalCount={totalCount}
              approvedPercent={approvedPercent}
              pendingPercent={pendingPercent}
              locked={locked}
              lockReason={lockReason}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
