import React from 'react';
import { cn } from '../../lib/utils';

export type FieldButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

export function FieldButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: FieldButtonVariant;
  size?: 'md' | 'lg';
}) {
  return (
    <button
      className={cn(
        'skin-button inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--skin-border)] px-4 font-display font-black uppercase italic tracking-normal transition-transform focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)] active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45',
        size === 'lg' && 'min-h-14 px-5 text-xl sm:text-2xl',
        size === 'md' && 'text-sm',
        variant === 'primary' && 'bg-[var(--skin-primary)] text-[var(--skin-on-primary)] shadow-[var(--skin-button-shadow)]',
        variant === 'secondary' && 'bg-[var(--skin-surface)] text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)]',
        variant === 'tertiary' && 'border-transparent bg-transparent text-[var(--skin-text-muted)] shadow-none underline-offset-4 hover:underline',
        variant === 'destructive' && 'border-[var(--skin-error,#c52233)] bg-white text-[var(--skin-error,#c52233)] shadow-[3px_3px_0_var(--skin-error,#c52233)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
