import React from 'react';
import { Flame } from 'lucide-react';

/**
 * Daily approval streak chip (P3-8, Nov 21, 2026, premium layer).
 * Reads the server-maintained `approvalStreakDays` — consecutive UTC
 * days with an approved proof, the streak behind the On a Roll
 * sticker. A zero streak renders an invite, not a bare 0.
 */
export function StreakChip({ streakDays, className = '' }: { streakDays: number; className?: string }) {
  const active = streakDays > 0;
  return (
    <div
      role="status"
      aria-label={
        active
          ? `${streakDays}-day approval streak`
          : 'No approval streak yet — start one with an approved proof'
      }
      className={`flex items-center gap-3 border-2 border-on-surface px-4 py-3 shadow-[4px_4px_0px_black] ${
        active ? 'bg-brand-lime text-on-surface' : 'bg-white text-on-surface'
      } ${className}`}
    >
      <Flame
        className={`w-5 h-5 shrink-0 ${active ? 'fill-brand-orange text-brand-orange' : 'text-on-surface/60'}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-black uppercase tracking-wide leading-none">
          {active ? `${streakDays}-day streak` : 'Start your streak'}
        </p>
        <p className="mt-1 text-xs font-bold leading-snug text-on-surface/60">
          {active
            ? 'Consecutive days with an approved proof.'
            : 'One approved proof a day keeps it alive.'}
        </p>
      </div>
    </div>
  );
}
