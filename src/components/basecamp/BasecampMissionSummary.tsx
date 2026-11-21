import { Zap } from 'lucide-react';
import type { BasecampMissionSummaryModel } from '../../logic/basecampViewModel';
import type { DeckPack } from '../../types/deckPacks';
import { DeckArtwork } from '../DeckArtwork';
import { FieldTicket } from '../FieldTicket';

interface BasecampMissionSummaryProps {
  mission: BasecampMissionSummaryModel | null;
  pack: DeckPack | null;
  /**
   * The panel's own description (the guidance flavor line, shown in the
   * left column). When the mission's description is the same sentence,
   * the card falls back to the deck subtitle so the panel never prints
   * one fact twice (Nov 8 dedupe rule).
   */
  panelDescription?: string;
}

export function BasecampMissionSummary({ mission, pack, panelDescription }: BasecampMissionSummaryProps) {
  // Nov 17, 2026: no 220px floor on mobile — the summary's real content
  // is ~150–180px (112px-wide 3:4 art beside a short text block), so the
  // floor forced ~40px of dead height. lg:min-h-full still stretches it
  // to the row on desktop.
  // Mission Log body (Nov 21, 2026): the mission's own description when
  // it says something the panel has not already said; otherwise the deck
  // subtitle, so the panel never prints one fact twice.
  const bodyText =
    mission?.description && mission.description !== panelDescription
      ? mission.description
      : pack?.deckSubtitle || pack?.description || 'Open Missions to choose your next assignment.';
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 border-t-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] p-4 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-5 lg:min-h-full lg:grid-cols-1 lg:border-l-2 lg:border-t-0">
      <div className="relative aspect-[3/4] w-full self-center overflow-hidden border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[5px_5px_0_var(--skin-border)] lg:mx-auto lg:max-w-[168px]">
        <DeckArtwork pack={pack} grayscale="" />
        <span className="absolute bottom-2 left-2 z-10 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-2 py-1 font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)] shadow-[2px_2px_0_var(--skin-border)]">
          {pack?.deckCode || 'Field deck'}
        </span>
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-3">
        {/* Mission Log (Nov 21, 2026): the journal-card header — ticket
            + sector line. The body is the mission's own description when
            it says something the panel has not already said (see bodyText
            above); the guidance flavor message is never repeated here, it
            already shows as the panel's description on the left. */}
        <FieldTicket label="Mission log" tone="accent" className="w-fit" />
        <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[var(--skin-text-muted)]">
          Sector {pack?.deckCode || '—'} // {pack?.packName || mission?.deckName || 'Missions'}
        </p>
        <div>
          <p className="font-display text-xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">
            {pack?.packName || mission?.deckName || 'Missions'}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--skin-text-muted)]">
            {bodyText}
          </p>
        </div>
        {mission?.rewardXp !== null && mission?.rewardXp !== undefined && (
          <span className="inline-flex w-fit items-center gap-1.5 border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-2 py-1 font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-on-secondary)] shadow-[2px_2px_0_var(--skin-border)]">
            <Zap size={12} aria-hidden="true" />
            {mission.rewardXp} base XP
          </span>
        )}
      </div>
    </div>
  );
}
