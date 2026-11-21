import { LockKeyhole, Star } from 'lucide-react';
import { DECALS, hasEarnedDecal } from '../../data/decals';
import type { DecalDefinition, DecalProfile } from '../../data/decals';
import { cn } from '../../lib/utils';

/**
 * Dex Decals shelf (Nov 20, 2026). Lives at the bottom of the Dex
 * Stickers tab, below the sticker machine. One card per decal in the
 * registry; locked cards use the same treatment as locked sticker
 * cards (dashed border, no shadow, silhouetted art + lock overlay)
 * so the cabinet reads as one collection. Cards are display-only —
 * there is no decal detail view yet.
 */

function DecalCard({ decal, isUnlocked }: { decal: DecalDefinition; isUnlocked: boolean }) {
  return (
    <div
      className={cn(
        'skin-card group relative flex min-w-0 flex-col overflow-hidden border-2 text-left',
        !isUnlocked && 'border-dashed'
      )}
      style={{
        borderColor: 'var(--skin-border)',
        borderRadius: 'var(--skin-card-radius, 8px)',
        background: 'var(--skin-surface)',
        color: 'var(--skin-text)',
        boxShadow: isUnlocked ? 'var(--skin-card-shadow, 4px 4px 0 var(--skin-border))' : 'none',
      }}
      aria-label={`${decal.name}, ${isUnlocked ? 'unlocked' : 'locked'}`}
    >
      <div className="relative aspect-square w-full overflow-hidden border-b-2" style={{ borderColor: 'var(--skin-border)' }}>
        <div
          className="absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage: 'radial-gradient(var(--skin-border) 0.75px, transparent 0.75px)',
            backgroundSize: '11px 11px'
          }}
        />
        <img
          src={decal.imageUrl}
          alt=""
          loading="lazy"
          className={cn(
            'relative h-full w-full object-contain p-3',
            !isUnlocked && 'grayscale brightness-0 opacity-20 blur-[1px]'
          )}
        />
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[var(--skin-surface)]" style={{ borderColor: 'var(--skin-border)' }}>
              <LockKeyhole className="h-5 w-5" />
            </span>
          </div>
        )}
        {isUnlocked && (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--skin-border)] bg-[var(--skin-warning)]" aria-hidden="true">
            <Star className="h-4 w-4 fill-[var(--skin-text)] text-[var(--skin-text)]" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="font-display text-base font-black uppercase italic leading-none">{decal.name}</p>
        <p className="font-serif text-xs font-semibold opacity-65">{decal.tagline}</p>
        <p className="font-mono text-xs font-black uppercase tracking-widest opacity-55">
          {isUnlocked ? 'Earned' : decal.howToEarn}
        </p>
      </div>
    </div>
  );
}

export function DecalShelf({ profile }: { profile: DecalProfile | null | undefined }) {
  const earnedCount = DECALS.filter((decal) => hasEarnedDecal(profile, decal.id)).length;
  return (
    <section aria-label="Decals" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-black uppercase italic tracking-tight">Decals</h2>
          <p className="mt-1 font-serif text-sm font-semibold opacity-65">Earned by deeds, not draws. One of a kind, each.</p>
        </div>
        <p className="shrink-0 font-mono text-xs font-black uppercase opacity-55">
          {earnedCount} of {DECALS.length} earned
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {DECALS.map((decal) => (
          <DecalCard key={decal.id} decal={decal} isUnlocked={hasEarnedDecal(profile, decal.id)} />
        ))}
      </div>
    </section>
  );
}
