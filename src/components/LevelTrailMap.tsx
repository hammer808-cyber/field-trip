import React from 'react';
import { Check } from 'lucide-react';
import { MARKER_STICKERS } from '../data/markers';
import { TRAIL_PATH_D, TRAIL_VIEWBOX, buildLevelTrail, type TrailNode } from '../logic/levelTrail';
import { cn } from '../lib/utils';

/**
 * Trail Map levels (Nov 21, 2026, progress-bar refresh slice 1):
 * the old straight lime bar on Profile is now a winding trail with one
 * node per authored level (15). Passed nodes are stamped lime with a
 * check, the current node carries the player's chosen marker sticker,
 * the next node ahead is named with its XP distance. At level 15 the
 * authored trail is done: every node stamped, DONE stamp on the map.
 *
 * Colours come from skin tokens only, so all 5 skins keep working.
 * No hard-coded hexes, no em dashes in copy.
 */
export function LevelTrailMap({
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
    <div className="space-y-3">
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
        className="relative"
      >
        {/* Winding dashed trail */}
        <svg
          viewBox={TRAIL_VIEWBOX}
          className="block w-full"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            d={TRAIL_PATH_D}
            fill="none"
            stroke="var(--skin-border)"
            strokeWidth={3}
            strokeDasharray="9 8"
            strokeLinecap="round"
            opacity={0.55}
          />
        </svg>

        {/* Nodes */}
        {trail.nodes.map((node) => (
          <TrailNodeMarker
            key={node.level}
            node={node}
            markerEmoji={node.state === 'current' ? marker.emoji : null}
          />
        ))}

        {/* DONE stamp: a state, not a style. Overlaps the trail end. */}
        {trail.isComplete && (
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 z-10 -rotate-6 border-[3px] border-[var(--skin-border)] bg-[var(--skin-text)] px-3 py-1 font-display text-lg font-black uppercase italic leading-none tracking-tight text-[var(--skin-secondary)] shadow-[4px_4px_0_var(--skin-border)]"
          >
            Done!
          </div>
        )}
      </div>

      {/* Footer: next stop + the XP chip */}
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

function TrailNodeMarker({
  node,
  markerEmoji,
}: {
  node: TrailNode;
  markerEmoji: string | null;
}) {
  const isCurrent = node.state === 'current';
  const isPassed = node.state === 'passed';
  const isNext = node.state === 'next';
  // Top-row nodes wear their tag underneath so it stays on the map.
  const tagBelow = node.yPercent < 30;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${node.xPercent}%`, top: `${node.yPercent}%` }}
      role="img"
      aria-label={`Level ${node.level}: ${node.title}, ${node.state}`}
      data-trail-node={node.level}
      data-trail-state={node.state}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-[3px] border-[var(--skin-border)] font-mono font-black',
          isCurrent
            ? 'h-12 w-12 bg-[var(--skin-surface)] text-xl shadow-[3px_3px_0_var(--skin-border)]'
            : 'h-9 w-9 text-xs shadow-[2px_2px_0_var(--skin-border)]',
          isPassed && 'bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)]',
          isNext && 'border-dashed bg-[var(--skin-surface)] text-[var(--skin-text)]',
          node.state === 'locked' &&
            'bg-[var(--skin-surface-muted)] text-[var(--skin-text-muted)] opacity-70',
        )}
      >
        {isPassed ? (
          <Check className="h-4 w-4" strokeWidth={3.5} aria-hidden="true" />
        ) : markerEmoji ? (
          <span aria-hidden="true">{markerEmoji}</span>
        ) : (
          node.level
        )}
      </div>

      {isCurrent && (
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-[var(--skin-border)] bg-[var(--skin-secondary)] px-1.5 py-0.5 font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-on-secondary)] shadow-[2px_2px_0_var(--skin-border)]',
            tagBelow ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
          )}
        >
          You are here
        </span>
      )}
      {isNext && (
        <span
          className={cn(
            'absolute left-1/2 max-w-[110px] -translate-x-1/2 whitespace-nowrap border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-1.5 py-0.5 font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)] shadow-[2px_2px_0_var(--skin-border)]',
            tagBelow ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
          )}
        >
          {node.title}
        </span>
      )}
    </div>
  );
}
