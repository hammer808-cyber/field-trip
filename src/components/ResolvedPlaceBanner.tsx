import { MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { getTierLabel, type ResolvedPlace } from '../logic/placeResolution';

/**
 * Urban Recon resolved-place banner (Nov 23, 2026, Zach's word).
 *
 * The resolved place used to render as a small mono footnote BELOW the
 * drawn card (Deck.tsx / MissionBriefing.tsx): 12px at 60% opacity, and
 * a long place name ran the full width of the sheet and got clipped by
 * the sheet's overflow. It now lives ON the card as a full-width lime
 * band: big Bebas place name, tier label underneath, wrapping cleanly.
 *
 * Pure presentational (no hooks), so render tests can use it directly.
 * The generic fallback keeps its honest wording: the place name is the
 * skeleton's generic default and the tier label reads "anywhere you
 * are" — never a fake specific place.
 */
export function ResolvedPlaceBanner({
  resolvedPlace,
  className,
}: {
  resolvedPlace: ResolvedPlace | null | undefined;
  className?: string;
}) {
  if (!resolvedPlace || !resolvedPlace.name) return null;
  return (
    <div
      data-testid="resolved-place-banner"
      className={cn(
        'border-b-4 border-on-surface bg-brand-lime px-4 py-3 text-on-surface',
        className,
      )}
    >
      <p className="flex items-center gap-1.5 font-mono text-xs font-black uppercase tracking-[0.2em]">
        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Go here</span>
      </p>
      <p className="mt-1 break-words font-display text-3xl font-black uppercase italic leading-[0.9] tracking-tight">
        {resolvedPlace.name}
      </p>
      <p className="mt-1 font-mono text-xs font-black uppercase tracking-[0.2em]">
        {getTierLabel(resolvedPlace)}
      </p>
    </div>
  );
}
