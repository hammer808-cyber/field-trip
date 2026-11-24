import { useRef, useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { getTierLabel, type ResolvedPlace } from '../logic/placeResolution';

/**
 * Single-flight guard for the place retry tap (Nov 23, 2026): while a
 * retry is in flight, further taps are ignored instead of stacking
 * GPS + Places calls. tryStart returns false when a retry is already
 * running; finish releases it. The banner owns one per mount.
 */
export function createPlaceRetryRunner(): { tryStart: () => boolean; finish: () => void } {
  let inFlight = false;
  return {
    tryStart() {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    finish() {
      inFlight = false;
    },
  };
}

/**
 * Urban Recon resolved-place banner (Nov 23, 2026, Zach's word).
 *
 * The resolved place used to render as a small mono footnote BELOW the
 * drawn card (Deck.tsx / MissionBriefing.tsx): 12px at 60% opacity, and
 * a long place name ran the full width of the sheet and got clipped by
 * the sheet's overflow. It now lives ON the card as a full-width lime
 * band: big Bebas place name, tier label underneath, wrapping cleanly.
 *
 * Pure presentational except for the retry's local resolving state,
 * so render tests can use it directly with static markup.
 * The generic fallback keeps its honest wording: the place name is the
 * skeleton's generic default and the tier label reads "anywhere you
 * are" — never a fake specific place.
 *
 * Retry (Nov 23, 2026, Zach's report — a card stuck on the generic
 * fallback had no way back to a real place): when the banner shows a
 * generic place and the page passes onRetryPlace, a small "Find a
 * place" action re-runs resolution for that card. While resolving the
 * button reads "Looking nearby" and is disabled; one tap is one
 * attempt, and the live subscription re-renders the banner when the
 * write lands. Resolved places never show the button.
 */
export function ResolvedPlaceBanner({
  resolvedPlace,
  className,
  onRetryPlace,
}: {
  resolvedPlace: ResolvedPlace | null | undefined;
  className?: string;
  /** Retry tap for a generic banner. Absent means no retry action. */
  onRetryPlace?: () => void | Promise<void>;
}) {
  const [resolving, setResolving] = useState(false);
  const retryGuardRef = useRef<ReturnType<typeof createPlaceRetryRunner> | null>(null);
  if (retryGuardRef.current === null) {
    retryGuardRef.current = createPlaceRetryRunner();
  }
  if (!resolvedPlace || !resolvedPlace.name) return null;
  const isGeneric = resolvedPlace.tier === 'generic';
  const handleRetry = () => {
    if (!onRetryPlace) return;
    if (!retryGuardRef.current!.tryStart()) return;
    setResolving(true);
    void Promise.resolve()
      .then(() => onRetryPlace())
      .catch(() => {})
      .finally(() => {
        retryGuardRef.current!.finish();
        setResolving(false);
      });
  };
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
      {isGeneric && onRetryPlace && (
        <button
          type="button"
          data-testid="retry-place-button"
          onClick={handleRetry}
          disabled={resolving}
          className="mt-2 inline-flex items-center gap-1.5 border-2 border-on-surface bg-white px-3 py-1.5 font-mono text-xs font-black uppercase tracking-[0.2em] text-on-surface shadow-[2px_2px_0px_black] transition-all active:translate-y-0.5 active:shadow-none disabled:cursor-wait"
        >
          <RefreshCw
            className={cn('h-4 w-4 shrink-0', resolving && 'animate-spin')}
            aria-hidden="true"
          />
          <span>{resolving ? 'Looking nearby…' : 'Find a place'}</span>
        </button>
      )}
    </div>
  );
}
