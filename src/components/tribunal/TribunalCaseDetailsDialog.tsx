import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { TribunalCase } from '../../types/game';
import { tribunalCaseOpenedAtMs } from '../../logic/tribunalClock';

/**
 * Case details dialog (Nov 24, 2026): the gavel button on an evidence
 * card opens the full case record. Every field is real data from the
 * tribunal case; there is no invented evidence. Closes on Escape, on
 * the dismiss button, or on a tap outside the panel.
 */
export function TribunalCaseDetailsDialog({
  caseData,
  onClose,
}: {
  caseData: TribunalCase | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!caseData) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [caseData, onClose]);

  if (!caseData) return null;

  const openedAtMs = tribunalCaseOpenedAtMs(caseData.openedAt);
  const openedAt = openedAtMs ? new Date(openedAtMs) : null;
  const totalVotes = caseData.totalVotes ?? caseData.validVotes + caseData.susVotes;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      data-testid="tribunal-case-details-overlay"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Case details for ${caseData.title}`}
        data-testid="tribunal-case-details-dialog"
        className="w-full max-w-md border-2 border-on-surface bg-[var(--skin-surface)] shadow-[6px_6px_0px_black]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-on-surface px-4 py-3">
          <h3 className="font-display text-lg font-black uppercase italic leading-none tracking-tight text-on-surface">
            Case details
          </h3>
          <button
            type="button"
            aria-label="Close case details"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border-2 border-on-surface bg-white text-on-surface shadow-[1px_1px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="space-y-3 px-4 py-4 text-sm">
          <div>
            <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Receipt</dt>
            <dd className="font-bold text-on-surface">{caseData.title}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Operative</dt>
            <dd className="font-bold text-on-surface">{caseData.playerName}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Mission</dt>
            <dd className="font-bold text-on-surface">{caseData.missionTitle || 'Not recorded'}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Deck</dt>
            <dd className="font-bold text-on-surface">{caseData.deckName || 'Not recorded'}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Field note</dt>
            <dd className="font-bold text-on-surface">{caseData.fieldNote || 'No field note was left.'}</dd>
          </div>
          <div className="flex gap-6">
            <div>
              <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Week</dt>
              <dd className="font-bold text-on-surface">{caseData.weekNumber}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Status</dt>
              <dd className="font-bold text-on-surface">{caseData.status ?? 'open'}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Opened</dt>
              <dd className="font-bold text-on-surface">
                {openedAt ? openedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded'}
              </dd>
            </div>
          </div>
          <div>
            <dt className="font-mono text-xs font-bold uppercase text-on-surface/60">Votes</dt>
            <dd className="font-bold text-on-surface">
              {caseData.validVotes} valid • {caseData.susVotes} signal • {totalVotes} total
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
