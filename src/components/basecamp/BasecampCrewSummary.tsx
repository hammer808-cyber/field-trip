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
      className={`basecamp-crew relative overflow-hidden p-5 text-white sm:p-6 ${model.hasCrew ? '' : 'basecamp-crew--quiet'}`}
    >
      <div className="basecamp-crew-glow" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Crew presence</p>
          <h2 id="basecamp-crew-heading" className="mt-1 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">
            {model.crewName}
          </h2>
        </div>
        <div className="basecamp-chrome-badge">
          {model.hasCrew ? <Users size={22} aria-hidden="true" /> : <UserPlus size={22} aria-hidden="true" />}
        </div>
      </div>

      <div className="basecamp-crew-campaign mt-5">
        <div className="basecamp-crew-portraits" aria-hidden="true">
          <span><Users size={30} /></span><span><UserPlus size={28} /></span><span><Users size={34} /></span>
        </div>
        <p className="basecamp-crew-kicker">{model.hasCrew ? 'YOUR PEOPLE ARE OUT THERE' : 'WANTED: CO-CONSPIRATORS'}</p>
      </div>

      <div className="relative mt-5 border-t border-white/25 pt-4">
        <p className="text-sm leading-relaxed text-white/80">
          {model.hasCrew
            ? 'Open Crew for members, invites, and shared memories.'
            : 'Optional. Create or join a Crew, or keep playing solo. Starter Signals still gates seasonal Crew proofs, memories, and zine eligibility.'}
        </p>
        {model.roleLabel && (
          <p className="mt-3 font-mono text-[8px] font-black uppercase tracking-widest text-[#dfff45]">
            Current role: {model.roleLabel}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenCrew}
        className="basecamp-crew-cta relative mt-5 flex min-h-12 w-full items-center justify-center gap-2 px-4 py-2 font-mono text-[9px] font-black uppercase tracking-widest focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
      >
        {model.hasCrew ? 'Open Crew Home' : 'Find a Crew'}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
