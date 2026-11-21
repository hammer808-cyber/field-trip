import React from 'react';
import { cn } from '../lib/utils';

export type FieldStampTone = 'primary' | 'error' | 'text';

const TONE_CLASSES: Record<FieldStampTone, string> = {
  primary: 'border-[var(--skin-primary)] text-[var(--skin-primary)]',
  error: 'border-[var(--skin-error)] text-[var(--skin-error)]',
  text: 'border-[var(--skin-text)] text-[var(--skin-text)]',
};

interface FieldStampProps {
  label: string;
  tone?: FieldStampTone;
  className?: string;
}

/**
 * Rotated rubber stamp — Field Manual chrome kit (Nov 21, 2026).
 * Double border, mono uppercase, transparent middle so the paper
 * shows through. Decorative only: a stamp never carries information
 * on its own — the rank number, the 100% label, or the photo caption
 * says it in plain text first — so it is aria-hidden.
 */
export function FieldStamp({ label, tone = 'primary', className }: FieldStampProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex -rotate-6 items-center border-[3px] px-2.5 py-1 font-mono text-xs font-black uppercase tracking-[0.25em]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="border border-current px-1.5 py-0.5">{label}</span>
    </span>
  );
}
