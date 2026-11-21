import React from 'react';
import { cn } from '../lib/utils';

export type FieldTicketTone = 'primary' | 'secondary' | 'accent';

const TONE_CLASSES: Record<FieldTicketTone, string> = {
  primary: 'bg-[var(--skin-primary)] text-[var(--skin-on-primary)]',
  secondary: 'bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)]',
  accent: 'bg-[var(--skin-accent)] text-[var(--skin-on-accent)]',
};

interface FieldTicketProps {
  label: string;
  tone?: FieldTicketTone;
  className?: string;
}

/**
 * Perforated ticket label — Field Manual chrome kit (Nov 21, 2026).
 * A ticket reads as a ticket through the dashed inner rule, the mono
 * uppercase label, the slight rotation, and the hard offset shadow.
 * Every colour comes from a skin token, never a hard-coded hex.
 */
export function FieldTicket({ label, tone = 'primary', className }: FieldTicketProps) {
  return (
    <span
      className={cn(
        'relative inline-flex -rotate-1 items-center border-2 border-[var(--skin-border)] px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.2em] shadow-[3px_3px_0px_var(--skin-border)]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 border border-dashed border-current opacity-40"
      />
      {label}
    </span>
  );
}
