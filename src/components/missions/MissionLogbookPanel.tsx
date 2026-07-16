import { AlertTriangle, CheckCircle2, ChevronDown, FileText, RotateCcw } from 'lucide-react';
import type { CanonicalProofStatus, ProofLogbookCounts } from '../../logic/proofDistribution';
import { cn } from '../../lib/utils';

export interface MissionLogbookItem {
  id: string;
  title: string;
  status: CanonicalProofStatus;
  statusLabel: string;
  filedLabel: string;
  fieldNote: string;
  imageUrl?: string;
  adminNote?: string;
  onRetry?: () => void;
}

interface MissionLogbookPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: ProofLogbookCounts;
  items: MissionLogbookItem[];
  onOpenFullLogbook: () => void;
  className?: string;
}

function statusClasses(status: CanonicalProofStatus): string {
  if (status === 'approved') return 'bg-[var(--skin-success)] text-white';
  if (status === 'needs_more_proof') return 'bg-[var(--skin-warning)] text-white';
  if (status === 'rejected') return 'bg-[var(--skin-error)] text-white';
  return 'bg-[var(--skin-surface-muted)] text-[var(--skin-text)]';
}

export function MissionLogbookPanel({
  open,
  onOpenChange,
  counts,
  items,
  onOpenFullLogbook,
  className,
}: MissionLogbookPanelProps) {
  const urgentCount = counts.rejectedOrNeedsMoreProof;

  return (
    <section className={cn('skin-card border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] shadow-[var(--skin-card-shadow)]', className)}>
      <details
        id="field-log-details"
        open={open}
        onToggle={(event) => onOpenChange(event.currentTarget.open)}
        className="group"
      >
        <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[var(--skin-border)] shadow-[3px_3px_0_var(--skin-border)]',
              urgentCount > 0 ? 'bg-[var(--skin-warning)] text-white' : 'bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)]',
            )}>
              {urgentCount > 0 ? <AlertTriangle size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[var(--skin-primary)]">Proof archive</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">Logbook</h2>
                {urgentCount > 0 && (
                  <span className="border-2 border-[var(--skin-border)] bg-[var(--skin-warning)] px-2 py-0.5 font-mono text-[7px] font-black uppercase tracking-widest text-white shadow-[2px_2px_0_var(--skin-border)]">
                    {urgentCount} need action
                  </span>
                )}
              </div>
              <p className="mt-1 truncate font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
                {counts.totalSubmitted === 0
                  ? 'No submitted field logs'
                  : `${counts.totalSubmitted} submitted · ${counts.approvedVerified} verified · ${counts.pendingReview} pending`}
              </p>
            </div>
          </div>
          <span className="flex min-h-11 min-w-11 items-center justify-center text-[var(--skin-text-muted)]">
            <ChevronDown className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>

        <div className="border-t-[3px] border-[var(--skin-border)] bg-[var(--skin-surface-muted)] p-4">
          {items.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--skin-border-muted)] bg-[var(--skin-surface)] px-4 py-8 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-[var(--skin-text-muted)]" aria-hidden="true" />
              <p className="font-display text-xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">No field logs yet</p>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-[var(--skin-text-muted)]">Draw a mission and submit its receipt to start the archive.</p>
            </div>
          ) : (
            <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {items.map((item) => {
                const urgent = item.status === 'needs_more_proof' || item.status === 'rejected';
                return (
                  <article key={item.id} className={cn(
                    'grid grid-cols-[58px_minmax(0,1fr)] gap-3 border-2 bg-[var(--skin-surface)] p-2.5',
                    urgent ? 'border-[var(--skin-warning)] shadow-[3px_3px_0_var(--skin-border)]' : 'border-[var(--skin-border-muted)]',
                  )}>
                    <div className="flex h-[58px] w-[58px] items-center justify-center overflow-hidden border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)]">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : item.status === 'approved' ? (
                        <CheckCircle2 className="text-[var(--skin-success)]" aria-hidden="true" />
                      ) : (
                        <FileText className="text-[var(--skin-text-muted)]" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-black uppercase italic leading-none tracking-normal text-[var(--skin-text)]">{item.title}</h3>
                          <p className="mt-1 font-mono text-[7px] font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">{item.filedLabel}</p>
                        </div>
                        <span className={cn('border border-[var(--skin-border)] px-2 py-1 font-mono text-[7px] font-black uppercase tracking-wider', statusClasses(item.status))}>
                          {item.statusLabel}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs italic leading-snug text-[var(--skin-text-muted)]">“{item.fieldNote}”</p>
                      {item.adminNote && (
                        <p className="mt-2 border-l-4 border-[var(--skin-error)] bg-[var(--skin-surface-muted)] px-2 py-1.5 font-mono text-[8px] leading-relaxed text-[var(--skin-text)]">
                          <strong>Review note:</strong> {item.adminNote}
                        </p>
                      )}
                      {urgent && item.onRetry && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={item.onRetry}
                            className="skin-button flex min-h-11 items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-primary)] px-3 py-2 font-display text-[10px] font-black uppercase italic tracking-normal text-[var(--skin-on-primary)] shadow-[3px_3px_0_var(--skin-border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          >
                            <RotateCcw size={14} aria-hidden="true" />
                            Retry mission
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenFullLogbook}
            className="skin-button mt-4 min-h-11 w-full border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-2.5 font-display text-xs font-black uppercase italic tracking-normal text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Open full Logbook
          </button>
        </div>
      </details>
    </section>
  );
}
