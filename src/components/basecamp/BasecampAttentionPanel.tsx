import { AlertTriangle, CheckCircle2, Clock3, RotateCcw } from 'lucide-react';
import type { BasecampProofAttentionModel } from '../../logic/basecampViewModel';

interface BasecampAttentionPanelProps {
  model: BasecampProofAttentionModel;
  onAction: () => void;
}

export function BasecampAttentionPanel({ model, onAction }: BasecampAttentionPanelProps) {
  const item = model.item;
  return (
    <section
      aria-labelledby="basecamp-attention-heading"
      className="skin-state-panel border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] p-5 shadow-[var(--skin-card-shadow)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Proof desk</p>
          <h2 id="basecamp-attention-heading" className="mt-1 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">
            Needs Attention
          </h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)]">
          {item ? <AlertTriangle size={22} aria-hidden="true" /> : <CheckCircle2 size={22} aria-hidden="true" />}
        </div>
      </div>

      {item ? (
        <div className="mt-5 border-t-2 border-[var(--skin-border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex min-h-7 items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-warning)] px-2 py-1 font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-text)]">
              <RotateCcw size={12} aria-hidden="true" />
              {item.statusLabel}
            </span>
            {model.actionableCount > 1 && (
              <span className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-text-muted)]">
                {model.actionableCount} records need attention
              </span>
            )}
          </div>
          <h3 className="mt-4 font-display text-xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--skin-text-muted)]">{item.note}</p>
          <button
            type="button"
            onClick={onAction}
            className="skin-button mt-4 min-h-11 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
          >
            {item.action.label}
          </button>
        </div>
      ) : (
        <div className="mt-5 border-t-2 border-[var(--skin-border)] pt-4">
          <p className="text-sm font-bold text-[var(--skin-text)]">No proof fixes are waiting.</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--skin-text-muted)]">
            {model.pendingCount > 0
              ? `${model.pendingCount} proof${model.pendingCount === 1 ? ' is' : 's are'} in review. You can keep playing while review is pending.`
              : 'New review requests will appear here.'}
          </p>
        </div>
      )}

      {model.pendingCount > 0 && item && (
        <p className="mt-4 flex items-center gap-2 border-t border-[var(--skin-border-muted)] pt-3 font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
          <Clock3 size={13} aria-hidden="true" />
          {model.pendingCount} proof{model.pendingCount === 1 ? '' : 's'} also in review
        </p>
      )}
    </section>
  );
}
