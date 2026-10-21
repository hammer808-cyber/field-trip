import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

/**
 * FrankieModeCard — the plain-language ("Simple Words") switch, in plain words.
 *
 * Frankie Mode used to live only inside the skin/appearance picker, labeled
 * "Visual Calm", so the players who need it most could never find it. This
 * card is the discoverable home for the same switch: Profile → Settings, and
 * a one-tap banner on the Missions page.
 *
 * Turning it on: plain titles/descriptions/directions on every card (see
 * src/data/plainCardCopy.ts), calmer screens, fewer effects.
 */
export function FrankieModeCard({ compact = false }: { compact?: boolean }) {
  const { frankieMode, setFrankieMode } = useTheme();

  return (
    <section
      aria-label="Simple words setting"
      className="border-2 border-on-surface bg-white p-5 shadow-[5px_5px_0px_black]"
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange">
            Reading
          </p>
          <h4 className="font-display text-2xl font-black leading-none">Simple Words</h4>
          <p className="mt-2 text-sm leading-snug text-on-surface/70">
            Short, clear words on every card. No slang. No word puzzles.
            The screens get calmer too.
          </p>
          {!compact && (
            <div className="mt-3 space-y-1 border-t border-on-surface/10 pt-3 text-sm">
              <p className="text-on-surface/50">
                Off: <span className="font-semibold text-on-surface/70">“Aisle Oracle”</span>
              </p>
              <p className="text-on-surface/50">
                On: <span className="font-semibold text-on-surface">“A Sign in a Store — take a photo of a sign that tells you something.”</span>
              </p>
            </div>
          )}
          <p className="mt-3 font-mono text-[10px] font-black uppercase tracking-widest" aria-live="polite">
            {frankieMode ? 'Simple Words is ON' : 'Simple Words is OFF'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={frankieMode}
          aria-label="Turn Simple Words on or off"
          onClick={() => setFrankieMode(!frankieMode)}
          className={cn(
            'relative h-11 w-20 shrink-0 border-2 border-on-surface p-1 transition-colors',
            frankieMode ? 'bg-brand-lime' : 'bg-on-surface/10'
          )}
        >
          <span
            className={cn(
              'block h-7 w-7 border-2 border-on-surface bg-white transition-transform',
              frankieMode && 'translate-x-9'
            )}
          />
        </button>
      </div>
    </section>
  );
}

export default FrankieModeCard;
