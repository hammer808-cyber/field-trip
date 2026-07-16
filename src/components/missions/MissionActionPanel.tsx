import type { ReactNode } from 'react';
import { Crosshair } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MissionActionPanelProps {
  eyebrow: string;
  title: string;
  status: string;
  children: ReactNode;
  className?: string;
}

export function MissionActionPanel({
  eyebrow,
  title,
  status,
  children,
  className,
}: MissionActionPanelProps) {
  return (
    <section
      aria-labelledby="mission-dispatch-heading"
      className={cn(
        'relative border-y-[3px] border-[var(--skin-border)] bg-transparent',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b-[3px] border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
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
        <span className="border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-2.5 py-1 font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-on-secondary)] shadow-[2px_2px_0_var(--skin-border)]" aria-live="polite">
          {status}
        </span>
      </header>

      <div className="relative overflow-hidden p-4 sm:p-6">
        <div className="absolute inset-0 pointer-events-none opacity-[var(--skin-texture-opacity)] [background-image:var(--skin-surface-texture)]" />
        <div className="relative">{children}</div>
      </div>
    </section>
  );
}
