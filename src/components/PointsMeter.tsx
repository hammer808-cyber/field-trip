import React from 'react';
import { PARTICIPATION_LAYER_RATE, type ScoreCalculationResult } from '../logic/missionScoring';

/**
 * The live points meter for the Capture flow. A segmented bar that fills
 * as the player completes each step: the card's base is always there,
 * then the photo, note, and location layers light up one by one. The
 * same numbers the receipt shows at submit — this is the live version
 * of that receipt, computed by the same scorer.
 */
export function PointsMeter({ score }: { score: ScoreCalculationResult }) {
  const layerValue = Math.round(score.baseMaxScore * PARTICIPATION_LAYER_RATE);
  const maxPossible = score.baseMaxScore + layerValue * 3;
  const pct = (points: number) => (maxPossible > 0 ? `${(points / maxPossible) * 100}%` : '0%');
  const layers = score.participationLayers;

  const segments = [
    {
      key: 'base',
      label: 'Base',
      points: score.reviewerScoreAfterRetry,
      earned: true,
      fillClass: 'bg-brand-orange',
    },
    {
      key: 'photo',
      label: 'Photo',
      points: layers.photoSubject,
      earned: layers.photoSubject > 0,
      fillClass: 'bg-brand-lime',
    },
    {
      key: 'note',
      label: layers.fieldNoteViaVoice ? 'Voice note' : 'Note',
      points: layers.fieldNote,
      earned: layers.fieldNote > 0,
      fillClass: 'bg-brand-cyan',
    },
    {
      key: 'location',
      label: 'Place',
      points: layers.location,
      earned: layers.location > 0,
      fillClass: 'bg-brand-magenta',
    },
  ];

  return (
    <div className="w-full rounded-2xl border-4 border-on-surface bg-white p-4 shadow-[6px_6px_0px_black]">
      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-on-surface/50">
          Points so far
        </p>
        <p className="font-display text-3xl font-black italic leading-none text-brand-orange">
          {score.finalScore}
          <span className="ml-1 text-sm not-italic text-on-surface/40">/ {maxPossible} XP</span>
        </p>
      </div>

      <div
        className="mt-3 flex h-6 w-full gap-1 overflow-hidden rounded-full border-2 border-on-surface bg-on-surface/5"
        role="meter"
        aria-valuenow={score.finalScore}
        aria-valuemin={0}
        aria-valuemax={maxPossible}
        aria-label={`Points so far: ${score.finalScore} of ${maxPossible} XP`}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={`h-full transition-all duration-500 ease-out ${segment.earned ? segment.fillClass : 'border border-dashed border-on-surface/25 bg-transparent'}`}
            style={{ width: pct(segment.earned ? segment.points : layerValue) }}
            title={`${segment.label}: ${segment.earned ? `+${segment.points} XP` : `worth +${layerValue} XP`}`}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {segments.map((segment) => (
          <div key={segment.key} className="text-center">
            <p className={`font-mono text-[9px] font-black uppercase tracking-widest ${segment.earned ? 'text-on-surface' : 'text-on-surface/35'}`}>
              {segment.label}
            </p>
            <p className={`font-display text-sm font-black italic ${segment.earned ? 'text-on-surface' : 'text-on-surface/35'}`}>
              {segment.earned ? `+${segment.points}` : `+${segment.key === 'base' ? segment.points : layerValue}`}
            </p>
          </div>
        ))}
      </div>

      {score.hintUsed && (
        <p className="mt-2 text-center font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange">
          Hint used: base is {score.adjustedMaxScore} instead of {score.baseMaxScore}
        </p>
      )}
      {score.appliedMultiplier > 1 && (
        <p className="mt-2 text-center font-mono text-[9px] font-black uppercase tracking-widest text-brand-lime">
          {score.appliedBonusLabel} ×{score.appliedMultiplier} applies at review
        </p>
      )}
    </div>
  );
}
