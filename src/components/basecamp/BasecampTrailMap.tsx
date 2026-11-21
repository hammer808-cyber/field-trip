import { MARKER_STICKERS } from '../../data/markers';
import { buildLevelTrail } from '../../logic/levelTrail';
import { FieldStamp } from '../FieldStamp';
import { cn } from '../../lib/utils';

/**
 * Compact trail map for the Basecamp progress card (Nov 21, 2026,
 * mock Option 4). The Profile trail map is the full winding map; this
 * is its small sibling: one row, one node per authored level (15), on
 * a dashed line. States and numbers come from the same buildLevelTrail
 * the Profile map uses, so the two agree. Passed nodes are lime dots,
 * the current node carries the player's marker sticker with a
 * YOU ARE HERE tag, the next node is a dashed outline with its level
 * number, locked nodes are small paper dots. Skin tokens only.
 */
export function BasecampTrailMap({
  xp,
  markerStickerId,
}: {
  xp: number;
  markerStickerId?: string | null;
}) {
  const trail = buildLevelTrail(xp);
  const marker =
    MARKER_STICKERS.find((sticker) => sticker.id === markerStickerId) ||
    MARKER_STICKERS[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text-muted)]">
          Level trail · Stage {trail.currentLevel} of 15
        </p>
        {trail.isComplete && <FieldStamp label="Done" tone="primary" />}
      </div>

      <div
        role="progressbar"
        aria-label={
          trail.isComplete
            ? 'Trail complete: Local Folklore, level 15'
            : 'Progress to next player level'
        }
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(trail.progressPercent)}
        className="relative h-[60px]"
      >
        {/* Dashed trail line, inset so the end nodes never clip. */}
        <div
          aria-hidden="true"
          className="absolute left-[4%] right-[4%] top-[43px] border-t-[3px] border-dashed border-[var(--skin-border)] opacity-55"
        />

        {trail.nodes.map((node, index) => {
          const xPercent = 4 + (index / 14) * 92;
          const isCurrent = node.state === 'current';
          const isPassed = node.state === 'passed';
          const isNext = node.state === 'next';
          // The tag is wider than its node: near either end it clamps
          // to the card edge instead of hanging off the map.
          const tagAlign =
            xPercent < 15
              ? 'left-0 translate-x-0'
              : xPercent > 85
                ? 'right-0 translate-x-0'
                : 'left-1/2 -translate-x-1/2';
          return (
            <div
              key={node.level}
              className="absolute flex h-8 -translate-x-1/2 items-center justify-center"
              style={{ left: `${xPercent}%`, top: '28px' }}
              role="img"
              aria-label={`Level ${node.level}: ${node.title}, ${node.state}`}
              data-trail-node={node.level}
              data-trail-state={node.state}
            >
              <div
                className={cn(
                  'flex items-center justify-center rounded-full border-2 border-[var(--skin-border)] font-mono font-black',
                  isPassed && 'h-3.5 w-3.5 bg-[var(--skin-secondary)]',
                  isCurrent &&
                    'h-8 w-8 border-[3px] bg-[var(--skin-surface)] text-lg shadow-[2px_2px_0_var(--skin-border)]',
                  isNext &&
                    'h-5 w-5 border-dashed bg-[var(--skin-surface)] text-xs text-[var(--skin-text)]',
                  node.state === 'locked' &&
                    'h-3 w-3 bg-[var(--skin-surface-muted)] opacity-70',
                )}
              >
                {isCurrent ? (
                  <span aria-hidden="true">{marker.emoji}</span>
                ) : isNext ? (
                  node.level
                ) : null}
              </div>

              {isCurrent && (
                <span
                  className={cn(
                    'absolute bottom-full mb-1.5 whitespace-nowrap border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-1.5 py-0.5 font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-on-secondary)] shadow-[2px_2px_0_var(--skin-border)]',
                    tagAlign,
                  )}
                >
                  You are here
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {trail.isComplete || !trail.nextNode ? (
          <span className="font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)]">
            Local Folklore · Trail complete
          </span>
        ) : (
          <span className="font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)]">
            Next stop: {trail.nextNode.title} ·{' '}
            {trail.xpToNextLevel.toLocaleString()} XP to go
          </span>
        )}
        <span className="border border-[var(--skin-border)] bg-[var(--skin-surface-muted)] px-2 py-1 font-mono text-xs font-black text-[var(--skin-text)]">
          {trail.isComplete || !trail.nextNode
            ? `${xp.toLocaleString()} XP total`
            : `${xp.toLocaleString()} / ${trail.nextNode.minXp.toLocaleString()} XP`}
        </span>
      </div>
    </div>
  );
}
