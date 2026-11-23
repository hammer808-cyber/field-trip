import type { ReactNode } from 'react';
import { Crosshair } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DEFAULT_APP_SKIN } from '../../skins/registry';
import { pickTextOnBackground, skinVarHex } from './MissionLogbookPanel';

interface MissionActionPanelProps {
  eyebrow: string;
  title: string;
  status: string;
  children: ReactNode;
  className?: string;
  /**
   * When provided, the lime status badge in the header is a real draw
   * button (Nov 18, 2026, Zach's call: the big black draw button below
   * the deck is gone, so the badge — which already reads "Draw a
   * Mission" — does the drawing). Omit it and the badge stays a plain
   * status display, e.g. while a mission is drawn.
   */
  onDraw?: () => void;
  drawDisabled?: boolean;
}

export function MissionActionPanel({
  eyebrow,
  title,
  status,
  children,
  className,
  onDraw,
  drawDisabled,
}: MissionActionPanelProps) {
  // P0-2: the 8px status badge sits on the skin secondary background, and
  // the token onSecondary fails in baja (white on #00a6b2 is 2.96:1), so
  // the text color is derived from the live background instead. The header
  // icon chip is icon-only (3:1 non-text bar) and passes in every skin.
  const badgeText = pickTextOnBackground(
    skinVarHex('--skin-secondary', DEFAULT_APP_SKIN.designTokens.secondary),
  );
  return (
    <section
      aria-labelledby="mission-dispatch-heading"
      className={cn(
        'relative border-y-[3px] border-[var(--skin-border)] bg-transparent',
        className,
      )}
    >
      {/* Paper ground (Nov 22, 2026, lift #7): the header used to be
          plain white, which read as half-finished against the rest of
          the app. It now sits on the muted paper sheet with the skin's
          surface texture, like the Sticker Machine ticket. */}
      <header className="relative flex flex-wrap items-start justify-between gap-3 border-b-[3px] border-[var(--skin-border)] bg-[var(--skin-surface-muted)] px-4 py-3 sm:px-5">
        <div className="absolute inset-0 pointer-events-none opacity-[var(--skin-texture-opacity)] [background-image:var(--skin-surface-texture)]" aria-hidden="true" />
        <div className="relative flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[var(--skin-border)] bg-[var(--skin-primary)] text-[var(--skin-on-primary)] shadow-[3px_3px_0_var(--skin-border)]">
            <Crosshair size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">{eyebrow}</p>
            <h2 id="mission-dispatch-heading" className="mt-1 break-words font-display text-2xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)] sm:text-3xl">
              {title}
            </h2>
          </div>
        </div>
        {onDraw ? (
          <button
            type="button"
            onClick={onDraw}
            disabled={drawDisabled}
            className="relative border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-widest shadow-[2px_2px_0_var(--skin-border)] transition-all active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            style={{ color: badgeText }}
            aria-live="polite"
          >
            {status}
          </button>
        ) : (
          <span className="relative border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-widest shadow-[2px_2px_0_var(--skin-border)]" style={{ color: badgeText }} aria-live="polite">
            {status}
          </span>
        )}
      </header>

      <div className="relative overflow-hidden p-4 sm:p-6">
        <div className="absolute inset-0 pointer-events-none opacity-[var(--skin-texture-opacity)] [background-image:var(--skin-surface-texture)]" />
        <div className="relative">{children}</div>
      </div>
    </section>
  );
}
