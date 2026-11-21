import React from 'react';
import { cn } from '../../lib/utils';

export function FieldSection({
  eyebrow,
  title,
  action,
  penUnderline,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  /** Hand-drawn pen squiggle under the title (Field Manual chrome):
      graphical only, no words. Same stroke as the FieldDoodles marks. */
  penUnderline?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('ft-section space-y-4', className)}>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 font-display text-2xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)] sm:text-3xl">
            {title}
          </h2>
          {penUnderline && (
            <svg
              aria-hidden="true"
              className="pointer-events-none mt-1.5 h-3 w-24"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M2,8 C15,3 25,11 38,7 C52,3 62,11 75,7 C85,4 92,8 98,6"
                stroke="var(--skin-text)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
