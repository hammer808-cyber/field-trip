import { ArrowRight } from 'lucide-react';
import type { PlayerGuidanceSnapshot } from '../../logic/playerGuidance';
import { cn } from '../../lib/utils';

interface MissionsGuidanceStripProps {
  guidance: PlayerGuidanceSnapshot;
  onPrimary: () => void;
  onSecondary?: () => void;
}

const DRAW_STATES = new Set([
  'DRAW_STARTER_MISSION',
  'DRAW_NEXT_STARTER',
  'DRAW_MISSION',
  'NO_URGENT_ACTION',
]);

const CRITICAL_STATES = new Set([
  'REPAIR_PROOF',
  'RETRY_REJECTED_PROOF',
  'RESUME_ACTIVE_MISSION',
  'WAITING_FOR_STARTER_REVIEW',
  'STARTER_COMPLETE',
]);

export function getMissionsStripRole(state: PlayerGuidanceSnapshot['state']): 'dominant' | 'quiet' {
  if (CRITICAL_STATES.has(state)) return 'dominant';
  if (DRAW_STATES.has(state)) return 'quiet';
  return 'dominant';
}

export function MissionsGuidanceStrip({ guidance, onPrimary, onSecondary }: MissionsGuidanceStripProps) {
  const role = getMissionsStripRole(guidance.state);
  const isCritical = guidance.urgency === 'critical' || guidance.state === 'REPAIR_PROOF' || guidance.state === 'RETRY_REJECTED_PROOF';
  const isQuiet = role === 'quiet';

  return (
    <section
      aria-label="What to do next"
      data-guidance-state={guidance.state}
      data-strip-role={role}
      className={cn(
        'mb-4 border-[3px] border-[var(--skin-border)] px-4 py-3 shadow-[4px_4px_0_var(--skin-border)]',
        isQuiet && 'bg-[var(--skin-surface)] opacity-90',
        !isQuiet && !isCritical && 'bg-[var(--skin-secondary)]',
        isCritical && 'bg-[var(--skin-primary)] text-[var(--skin-on-primary)]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={cn(
            'font-mono text-[10px] font-black uppercase tracking-[0.22em]',
            isCritical ? 'text-[var(--skin-on-primary)]/70' : 'text-[var(--skin-text-muted)]',
          )}>
            Now
          </p>
          <p className={cn(
            'mt-1 font-display font-black uppercase italic leading-none tracking-normal',
            isQuiet ? 'text-lg text-[var(--skin-text)]' : 'text-2xl sm:text-3xl text-[var(--skin-text)]',
            isCritical && 'text-[var(--skin-on-primary)]',
          )}>
            {guidance.title}
          </p>
          <p className={cn(
            'mt-2 text-sm font-bold',
            isCritical ? 'text-[var(--skin-on-primary)]/85' : 'text-[var(--skin-text)]',
          )}>
            {guidance.shortMessage}
          </p>
          {!isQuiet && (
            <p className={cn(
              'mt-1 font-mono text-[8px] font-black uppercase tracking-[0.18em] opacity-50',
              isCritical ? 'text-[var(--skin-on-primary)]' : 'text-[var(--skin-primary)]',
            )}>
              {guidance.flavorMessage}
            </p>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={onPrimary}
            data-missions-primary="true"
            className={cn(
              'skin-button inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--skin-border)] px-4 py-2 font-display font-black uppercase italic shadow-[3px_3px_0_var(--skin-border)]',
              isQuiet && 'bg-[var(--skin-surface)] text-[var(--skin-text)] text-sm',
              !isQuiet && !isCritical && 'bg-[var(--skin-text)] text-[var(--skin-surface)] text-base',
              isCritical && 'bg-[var(--skin-surface)] text-[var(--skin-text)] text-lg min-h-14',
            )}
          >
            {guidance.primaryActionLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {guidance.secondaryAction && (
            <button
              type="button"
              onClick={onSecondary}
              className={cn(
                'min-h-9 px-2 font-mono text-[10px] font-black uppercase tracking-widest',
                isCritical ? 'text-[var(--skin-on-primary)]/70 hover:text-[var(--skin-on-primary)]' : 'text-on-surface/50 hover:text-on-surface',
              )}
            >
              {guidance.secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
