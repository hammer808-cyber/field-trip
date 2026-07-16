import { Camera, Compass, Zap } from 'lucide-react';
import type { BasecampMissionSummaryModel } from '../../logic/basecampViewModel';
import type { DeckPack } from '../../types/deckPacks';
import { DeckArtwork } from '../DeckArtwork';

interface BasecampMissionSummaryProps {
  mission: BasecampMissionSummaryModel | null;
  pack: DeckPack | null;
}

export function BasecampMissionSummary({ mission, pack }: BasecampMissionSummaryProps) {
  return (
    <div className="grid min-h-[220px] grid-cols-[112px_minmax(0,1fr)] gap-4 border-t-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] p-4 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-5 lg:min-h-full lg:grid-cols-1 lg:border-l-2 lg:border-t-0">
      <div className="relative aspect-[3/4] w-full self-center overflow-hidden border-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[5px_5px_0_var(--skin-border)] lg:mx-auto lg:max-w-[168px]">
        <DeckArtwork pack={pack} grayscale="" />
        <span className="absolute bottom-2 left-2 z-10 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-2 py-1 font-mono text-[7px] font-black uppercase tracking-widest text-[var(--skin-text)] shadow-[2px_2px_0_var(--skin-border)]">
          {pack?.deckCode || 'Field deck'}
        </span>
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-3">
        <div className="flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[var(--skin-text-muted)]">
          {mission ? <Camera size={14} aria-hidden="true" /> : <Compass size={14} aria-hidden="true" />}
          {mission ? 'Active field card' : 'Available deck'}
        </div>
        <div>
          <p className="font-display text-xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">
            {mission?.title || pack?.packName || 'Missions'}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--skin-text-muted)]">
            {mission?.deckName || pack?.deckSubtitle || pack?.description || 'Open Missions to choose your next assignment.'}
          </p>
        </div>
        {mission?.rewardXp !== null && mission?.rewardXp !== undefined && (
          <span className="inline-flex w-fit items-center gap-1.5 border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-2 py-1 font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-on-secondary)] shadow-[2px_2px_0_var(--skin-border)]">
            <Zap size={12} aria-hidden="true" />
            {mission.rewardXp} base XP
          </span>
        )}
      </div>
    </div>
  );
}
