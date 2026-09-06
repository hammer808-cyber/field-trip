import React from 'react';
import { cn } from '../../lib/utils';

export function FieldSection({
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('ft-section space-y-4', className)}>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 font-display text-2xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)] sm:text-3xl">
            {title}
          </h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
