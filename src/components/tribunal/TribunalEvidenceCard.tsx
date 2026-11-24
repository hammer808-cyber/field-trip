import { CheckCircle, Gavel, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { TribunalCase } from '../../types/game';
import type { TribunalVerdict } from '../../logic/firelightTribunal';
import { tribunalCaseOpenedAtMs } from '../../logic/tribunalClock';
import { cn } from '../../lib/utils';

/**
 * Evidence case card (Nov 24, 2026, from Zach's tribunal mockup):
 * the flagged receipt as an open case, with the real photo, title,
 * operative, and caption, and side-by-side VALID / SIGNAL buttons
 * wired to the real vote path. Counts are live.
 *
 * One vote per player, immutable on the server: after voting, both
 * buttons disable and the card shows which verdict was recorded.
 * A player cannot vote on their own receipt (the server rejects it
 * with SELF_TRIBUNAL_VOTE_PROHIBITED), so the buttons disable with
 * an explanation instead of letting the tap fail.
 */
export function TribunalEvidenceCard({
  caseData,
  myVote,
  isVoting,
  isOwnCase,
  onVote,
  onViewDetails,
}: {
  caseData: TribunalCase;
  myVote: TribunalVerdict | null;
  isVoting: boolean;
  isOwnCase: boolean;
  onVote: (vote: TribunalVerdict) => void;
  onViewDetails: (c: TribunalCase) => void;
}) {
  const hasVoted = myVote !== null;
  const votingDisabled = hasVoted || isVoting || isOwnCase;
  const status = caseData.status ?? 'open';
  const openCaseNumber = tribunalCaseOpenedAtMs(caseData.openedAt);
  const caseCode = `OPEN_CASE_${openCaseNumber ? String(Math.floor(openCaseNumber / 1000)).slice(-4) : '0000'}`;
  const caption = caseData.fieldNote || 'No field note was left with this receipt.';
  const totalVotes = caseData.totalVotes ?? caseData.validVotes + caseData.susVotes;

  return (
    <article
      data-testid="tribunal-evidence-card"
      className="overflow-hidden border-2 border-on-surface bg-[var(--skin-surface)] shadow-[4px_4px_0px_black]"
    >
      <div className="flex items-center justify-between gap-2 p-2.5">
        <span className="inline-flex items-center gap-1.5 border border-on-surface bg-brand-magenta px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-white">
          {caseCode}
        </span>
        <button
          type="button"
          aria-label={`View details for ${caseData.title}`}
          onClick={() => onViewDetails(caseData)}
          className="flex h-8 w-8 items-center justify-center border-2 border-on-surface bg-white text-on-surface shadow-[1px_1px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <Gavel className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="px-2.5 pb-2.5">
        <h3 className="font-display text-xl font-black uppercase italic leading-none tracking-tight text-on-surface">
          {caseData.title}
        </h3>
        <p className="mt-1 font-mono text-xs uppercase text-on-surface/60">
          Operative: {caseData.playerName}
        </p>
      </div>

      <div className="relative border-t-2 border-on-surface">
        {caseData.proofImage ? (
          <img
            src={caseData.proofImage}
            alt={`Evidence photo for ${caseData.title}`}
            className="h-48 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-[var(--skin-surface-muted)] font-mono text-xs uppercase text-on-surface/60">
            No photo on file
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-8">
          <p className="font-mono text-xs italic leading-snug text-white">"{caption}"</p>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-2 flex items-center justify-between border-y border-on-surface/10 py-1 font-mono text-xs">
          <span className="font-bold uppercase tracking-tight text-on-surface">Cast your verdict</span>
          <span className="text-on-surface/60">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} so far
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onVote('valid')}
            disabled={votingDisabled}
            aria-pressed={myVote === 'valid'}
            className={cn(
              'flex h-12 flex-1 items-center justify-center gap-1.5 border-2 border-on-surface text-sm font-bold shadow-[2px_2px_0px_black] transition-transform',
              myVote === 'valid'
                ? 'bg-brand-lime text-on-surface'
                : 'bg-white text-on-surface hover:bg-[var(--skin-surface-muted)]',
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
              !votingDisabled && 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            )}
          >
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            VALID ({caseData.validVotes})
          </button>
          <button
            type="button"
            onClick={() => onVote('sus')}
            disabled={votingDisabled}
            aria-pressed={myVote === 'sus'}
            className={cn(
              'flex h-12 flex-1 items-center justify-center gap-1.5 border-2 border-on-surface text-sm font-bold shadow-[2px_2px_0px_black] transition-transform',
              myVote === 'sus'
                ? 'bg-brand-magenta text-white'
                : 'bg-white text-brand-magenta hover:bg-[var(--skin-surface-muted)]',
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
              !votingDisabled && 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            )}
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            SIGNAL ({caseData.susVotes})
          </button>
        </div>
        {hasVoted && (
          <p className="mt-2 flex items-center gap-1 font-mono text-xs font-bold uppercase text-on-surface">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Your verdict is recorded: {myVote === 'valid' ? 'Valid' : 'Signal'}
          </p>
        )}
        {isOwnCase && !hasVoted && (
          <p className="mt-2 font-mono text-xs uppercase text-on-surface/60">
            This is your receipt. You cannot vote on your own case.
          </p>
        )}
        {status !== 'open' && (
          <p className="mt-2 font-mono text-xs uppercase text-on-surface/60">
            Case {status}: votes are closed.
          </p>
        )}
      </div>
    </article>
  );
}
