/**
 * Crew Challenges picker (Nov 23, 2026).
 *
 * One space inside the Crew tab with every playable crew card, grouped
 * by deck. A startable card opens Capture on that exact card:
 * `/capture?id=<cardId>` resolves through resolveMissionById and starts
 * the attempt through the existing attempts/start path, so no draw and
 * no parallel submit path. The server still enforces deck access on
 * start; the picker hides the button for locked decks up front.
 *
 * Locked decks stay visible with their access reason, so a player can
 * see what opens and when. A location tag is a layer note, never a
 * block. A time window is shown when a card carries one.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ALL_CHALLENGE_CARDS } from '../../data/allChallengeBanks';
import {
  buildCrewChallengeSections,
  type CrewChallengeDeckSection,
  type CrewChallengeRow,
} from '../../logic/crewChallenges';
import { FieldStamp } from '../FieldStamp';
import { StickerShelfSheet } from '../stickers/StickerGrid';

export function CrewChallenges({
  sections,
  onStart,
}: {
  sections: CrewChallengeDeckSection[];
  onStart: (cardId: string) => void;
}) {
  const totalCards = sections.reduce((count, section) => count + section.cards.length, 0);
  const startableCards = sections
    .filter(section => !section.locked)
    .reduce((count, section) => count + section.cards.filter(card => !card.completed).length, 0);

  return (
    <div data-testid="crew-challenges" className="space-y-8">
      <div className="space-y-2">
        <p className="font-mono text-xs font-black uppercase tracking-[0.24em] text-[var(--skin-text-muted)]">Crew challenges</p>
        <h2 className="font-display text-4xl font-black uppercase italic leading-none">Pick a crew card</h2>
        <p className="font-serif italic text-sm opacity-70">
          Every card that needs your crew, in one place. Pick one and Capture opens on that card.
        </p>
        <p className="font-mono text-xs uppercase tracking-wider opacity-70">
          {totalCards} crew cards. {startableCards} ready to start.
        </p>
        <p className="text-xs opacity-70">
          Crew proof cards need your crew in the proof. Submit as crew and the crew layer pays +25% of base.
        </p>
        <p className="text-xs opacity-70">
          Crew Challenge cards are crew themed from the older decks. Photo proof only, so the crew layer does not pay on these.
        </p>
      </div>

      {sections.length === 0 && (
        <p className="font-mono text-xs font-black uppercase tracking-wider opacity-70">No crew cards yet.</p>
      )}

      {sections.map((section, index) => (
        <StickerShelfSheet key={section.deckId} tone={index % 2 === 1 ? 'muted' : 'plain'}>
          <div data-testid="crew-challenge-section" data-deck-id={section.deckId}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-3xl font-black uppercase italic leading-none">{section.deckTitle}</h3>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider opacity-60">
                  {section.deckCode ? `${section.deckCode} / ` : ''}{section.cards.length} crew cards
                </p>
              </div>
              {section.locked && <FieldStamp label="Locked" tone="error" />}
            </div>
            {section.locked && (
              <p className="mt-2 font-mono text-xs font-black uppercase tracking-wider">
                Locked: {section.lockReason}
              </p>
            )}
            <div aria-hidden="true" className="mt-3 border-b-2 border-dashed border-[var(--skin-border)]" />
            <ul className="mt-2">
              {section.cards.map(card => (
                <CrewChallengeRowView
                  key={card.id}
                  row={card}
                  locked={section.locked}
                  onStart={onStart}
                />
              ))}
            </ul>
          </div>
        </StickerShelfSheet>
      ))}
    </div>
  );
}

function CrewChallengeRowView({
  row,
  locked,
  onStart,
}: {
  row: CrewChallengeRow;
  locked: boolean;
  onStart: (cardId: string) => void;
}) {
  return (
    <li
      data-testid="crew-challenge-row"
      data-card-id={row.id}
      className="border-t-2 border-dashed border-[var(--skin-border)] py-4 first:border-t-0 first:pt-2 last:pb-0"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="font-display text-2xl font-black uppercase italic leading-none">{row.title}</p>
          {row.shortPrompt && <p className="font-serif italic text-sm opacity-70">{row.shortPrompt}</p>}
          <p className="font-mono text-xs font-black uppercase tracking-wider">
            {row.difficulty} / {row.baseXP} XP / {row.proofLabels.join(' + ')}
          </p>
          <p className="text-xs opacity-70">{row.crewLayerNote}</p>
          {row.locationLabel && (
            <p className="text-xs opacity-70">
              Near {row.locationLabel}. The tag pays the location layer. It never blocks a submit.
            </p>
          )}
          {row.timeWindowLabel && <p className="text-xs opacity-70">{row.timeWindowLabel}.</p>}
          {locked && <p className="font-mono text-xs font-black uppercase tracking-wider">Locked</p>}
          {!locked && row.completed && (
            <p className="font-mono text-xs font-black uppercase tracking-wider">Logged</p>
          )}
        </div>
        <div className="shrink-0">
          {locked ? (
            <FieldStamp label="Locked" tone="error" />
          ) : row.completed ? (
            <FieldStamp label="Logged" tone="text" />
          ) : (
            <button
              type="button"
              data-testid="crew-challenge-start"
              data-card-id={row.id}
              onClick={() => onStart(row.id)}
              className="bureau-btn bg-brand-lime text-on-surface text-xs"
            >
              Do this <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * The live panel: builds sections from the app context (deck access
 * verdicts, approved ids) and starts a card by navigating to Capture
 * with the card id. Capture resolves the card from the id param and
 * starts the attempt through the existing attempts/start path.
 */
export function CrewChallengesPanel() {
  const { deckPacks, getDeckAccessForPack, completedChallengeIds } = useApp();
  const navigate = useNavigate();
  const sections = React.useMemo(
    () =>
      buildCrewChallengeSections({
        cards: ALL_CHALLENGE_CARDS,
        packs: deckPacks,
        getAccess: getDeckAccessForPack,
        completedIds: completedChallengeIds,
      }),
    [deckPacks, getDeckAccessForPack, completedChallengeIds],
  );
  const handleStart = React.useCallback(
    (cardId: string) => {
      navigate(`/capture?id=${cardId}`);
    },
    [navigate],
  );
  return <CrewChallenges sections={sections} onStart={handleStart} />;
}
