import { useState } from 'react';
import { X } from 'lucide-react';
import { FIELD_TYPE_ALIASES, FIELD_TYPES, type FieldTypeId } from '../constants/fieldTypes';

/**
 * Post-submit confirmation card (Nov 23, 2026, Zach's call): after a
 * submission, the player's own persona character says good job and shows
 * the points from that submission. Rendered at the top of the
 * MissionResultCard success screen, so the player sees it immediately
 * without going anywhere. Pure props in, no context — renderable in tests.
 *
 * Points honesty: the number is the submit result's own math (base +
 * layers + bonus). While pending review it is an estimate, so the card
 * says "once approved" instead of presenting it as banked.
 */
const CHEER_LINES: Record<string, string> = {
  elondra: 'Darling, beautifully done. Your proof is in.',
  mascota: 'Nice one! Your proof is in and looking good.',
  captainClipboard: 'Logged and filed. Nice work out there.',
  mallRat: 'Got it. That one is in the books.',
  theGobbler: 'Snatched. Your proof is in.',
  bigfoot: 'Spotted doing good work. Proof received.',
  unclassified: 'Nice work. Your proof is in.',
};

export interface SubmissionCheerProps {
  /** profile.fieldType — the player's persona id. */
  personaId?: string | null;
  /** Total points for this submission (base + layers + bonus). */
  points: number;
  approved: boolean;
  /** False when there is no estimate to show (0 points while pending). */
  hasEstimate: boolean;
}

export function SubmissionCheer({ personaId, points, approved, hasEstimate }: SubmissionCheerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const resolvedId = (personaId && FIELD_TYPE_ALIASES[personaId]) || (personaId as FieldTypeId) || 'unclassified';
  const persona = FIELD_TYPES[resolvedId] ?? FIELD_TYPES.unclassified;
  const line = CHEER_LINES[persona.id] ?? CHEER_LINES.unclassified;
  const showPoints = approved || hasEstimate;

  return (
    <div
      data-testid="submission-cheer"
      className="relative bg-[var(--skin-background)] border-4 border-on-surface shadow-[6px_6px_0px_black] rotate-[-0.5deg] p-4 sm:p-5"
    >
      <div className="field-tape w-16 h-5 absolute -top-2 left-8 rotate-[-4deg]" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        data-testid="submission-cheer-dismiss"
        className="absolute top-2 right-2 p-1 text-on-surface/60 hover:text-on-surface"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-4">
        <img
          src={persona.avatarPath}
          alt={`${persona.name} avatar`}
          data-testid="submission-cheer-avatar"
          className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-cover border-4 border-on-surface shadow-[3px_3px_0px_black] rotate-[-2deg]"
        />
        <div className="min-w-0">
          <p className="font-mono text-xs font-black uppercase tracking-[0.25em] text-brand-cyan">
            {persona.name} says
          </p>
          <p
            data-testid="submission-cheer-line"
            className="mt-1 font-serif text-lg sm:text-xl italic leading-snug text-on-surface"
          >
            &ldquo;{line}&rdquo;
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4 border-t-2 border-on-surface/10 pt-3">
        {showPoints ? (
          <>
            <p
              data-testid="submission-cheer-points"
              className="font-display text-4xl sm:text-5xl font-black italic leading-none text-brand-orange"
            >
              +{points} XP
            </p>
            <p className="font-mono text-xs font-black uppercase tracking-widest text-on-surface/60 text-right">
              {approved ? 'Points banked' : 'Once approved'}
            </p>
          </>
        ) : (
          <p
            data-testid="submission-cheer-points"
            className="font-mono text-xs font-black uppercase tracking-widest text-on-surface/60"
          >
            Points land once Trevor approves your proof.
          </p>
        )}
      </div>
    </div>
  );
}
