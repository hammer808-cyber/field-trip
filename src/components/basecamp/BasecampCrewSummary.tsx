import { ArrowRight, UserPlus, Users } from 'lucide-react';
import type { BasecampCrewModel } from '../../logic/basecampViewModel';

interface BasecampCrewSummaryProps {
  model: BasecampCrewModel;
  onOpenCrew: () => void;
}

export function BasecampCrewSummary({ model, onOpenCrew }: BasecampCrewSummaryProps) {
  return (
    <section
      aria-labelledby="basecamp-crew-heading"
      className="skin-card border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] p-5 shadow-[var(--skin-card-shadow)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Crew presence</p>
          <h2 id="basecamp-crew-heading" className="mt-1 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">
            {model.crewName}
          </h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)] shadow-[3px_3px_0_var(--skin-border)]">
          {model.hasCrew ? <Users size={22} aria-hidden="true" /> : <UserPlus size={22} aria-hidden="true" />}
        </div>
      </div>

      <div className="mt-5 border-t-2 border-[var(--skin-border)] pt-4">
        <p className="text-sm leading-relaxed text-[var(--skin-text-muted)]">
          {model.hasCrew
            ? 'Your active Crew home contains members, invitations, shared memories, and Crew settings.'
            : 'Create or join a Crew now. Starter Signals still gates seasonal Crew proofs, memories, and zine eligibility.'}
        </p>
        {model.roleLabel && (
          <p className="mt-3 font-mono text-[8px] font-black uppercase tracking-widest text-[var(--skin-primary)]">
            Current role: {model.roleLabel}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenCrew}
        className="skin-button mt-5 flex min-h-11 w-full items-center justify-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
      >
        {model.hasCrew ? 'Open Crew Home' : 'Find a Crew'}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
