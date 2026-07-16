import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface DeckProgressMeterProps {
  approvedCount: number;
  pendingCount?: number;
  totalCount: number;
  approvedPercent: number;
  pendingPercent?: number;
  compact?: boolean;
  className?: string;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function DeckProgressMeter({
  approvedCount,
  pendingCount = 0,
  totalCount,
  approvedPercent,
  pendingPercent = 0,
  compact = false,
  className,
}: DeckProgressMeterProps) {
  const safeTotal = Math.max(0, totalCount);
  const safeApproved = Math.min(safeTotal, Math.max(0, approvedCount));
  const approvedWidth = clampPercent(approvedPercent);
  const pendingWidth = Math.min(100 - approvedWidth, clampPercent(pendingPercent));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[9px] font-black uppercase tracking-wider text-[var(--skin-text-muted)]">
        <span>Deck progress</span>
        <span className="text-[var(--skin-text)]">
          {safeApproved}/{safeTotal} approved
          {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
        </span>
      </div>

      <div
        className={cn(
          'skin-progress flex w-full overflow-hidden border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)]',
          compact ? 'h-3' : 'h-4',
        )}
        role="progressbar"
        aria-label={`${safeApproved} of ${safeTotal} deck missions approved${pendingCount > 0 ? `, ${pendingCount} pending review` : ''}`}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeApproved}
      >
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${approvedWidth}%` }}
          className="h-full shrink-0 bg-[var(--skin-secondary)]"
        />
        {pendingWidth > 0 && (
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${pendingWidth}%` }}
            className="h-full shrink-0 bg-[var(--skin-primary)] opacity-55"
          />
        )}
      </div>

      {pendingCount > 0 && !compact && (
        <div className="flex items-center gap-4 font-mono text-[8px] font-bold uppercase tracking-widest text-[var(--skin-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 border border-[var(--skin-border)] bg-[var(--skin-secondary)]" />
            Approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 border border-[var(--skin-border)] bg-[var(--skin-primary)] opacity-55" />
            Pending
          </span>
        </div>
      )}
    </div>
  );
}
