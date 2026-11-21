import React from 'react';
import { FieldStamp, type FieldStampTone } from './FieldStamp';

export interface FieldDoodleStamp {
  label: string;
  tone?: FieldStampTone;
}

/**
 * Decorative stamps + pen marks — Field Manual chrome, round 2
 * (Nov 21, 2026). A small set of FieldStamps and hand-drawn pen
 * marks (SVG only, no words) layered over a page.
 *
 * PLACEMENT RULE (why it never covers a control, by construction):
 * the layer is `hidden lg:block`, absolute over the whole page, and
 * holds only two clusters. (1) The stamp cluster sits in the page's
 * top-right corner (`right-3 top-3`): on every page that mounts this
 * layer the hero's top-right holds only the faint background icon —
 * the title is left-aligned, the back button (when present) is left
 * or in-flow, and the info card is anchored to the hero's bottom
 * edge. (2) The margin pen marks sit in the empty side gutters at
 * mid-page (`hidden 2xl:block`): at 2xl every mounting page has a
 * centred content column (max-w-6xl, Basecamp max-w-7xl), so the
 * gutters are >= 128px of empty paper and a ~24px mark at `left-3`
 * / `right-3` cannot reach the content. There are deliberately NO
 * bottom-corner elements: no mounting page guarantees empty bottom
 * padding, so a bottom stamp could land on a real button.
 *
 * DETERMINISM: positions and rotations come from a tiny FNV-1a hash
 * of the page key — never a random call at render — so the layer is
 * identical on every render. Same key, same doodles.
 *
 * TRUTH: stamps are passed in by the mounting page and must be true
 * on that page (the page knows its own facts — e.g. Big Board only
 * stamps 1ST when the viewer is actually rank 1). Pen marks are
 * graphical only: a hand-drawn circle around the first stamp, a
 * squiggle underline beneath the second, a checkmark and an arrow
 * in the margins pointing at the content column. They circle /
 * underline real content; they never invent words or annotations.
 *
 * VARIANT: 'paper' is the default (light heroes, pen strokes in
 * --skin-text). 'chrome' is for dark heroes (Big Board): pen strokes
 * use --skin-surface so they stay visible on the dark paper, and
 * callers should pass primary-tone stamps only — the dark-ink text
 * tone would vanish on a dark hero.
 */

export function doodleSeed(pageKey: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < pageKey.length; i++) {
    hash ^= pageKey.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface DoodlePlacements {
  /** Rotation of the first stamp (and its circling ellipse), degrees. */
  rotation: number;
  /** Rotation of the second stamp (and its squiggle underline), degrees. */
  rotation2: number;
  /** Whole-cluster jitter, px. */
  nudgeX: number;
  nudgeY: number;
  checkRotation: number;
  arrowRotation: number;
  /** Mid-page margin marks, % of page height. */
  marginTopLeft: number;
  marginTopRight: number;
}

export function doodlePlacements(pageKey: string): DoodlePlacements {
  const seed = doodleSeed(pageKey);
  return {
    rotation: (seed % 17) - 8,
    rotation2: (((seed >>> 4) % 13) - 6),
    nudgeX: (seed % 9) - 4,
    nudgeY: (((seed >>> 8) % 7) - 3),
    checkRotation: (((seed >>> 12) % 15) - 7),
    arrowRotation: (((seed >>> 16) % 15) - 7),
    marginTopLeft: 40 + (seed % 7),
    marginTopRight: 56 + ((seed >>> 3) % 7),
  };
}

interface FieldDoodlesProps {
  pageKey: string;
  stamps?: FieldDoodleStamp[];
  variant?: 'paper' | 'chrome';
}

export function FieldDoodles({ pageKey, stamps = [], variant = 'paper' }: FieldDoodlesProps) {
  const p = doodlePlacements(pageKey);
  const stroke = variant === 'chrome' ? 'var(--skin-surface)' : 'var(--skin-text)';
  const [first, second] = stamps;

  return (
    <div
      aria-hidden="true"
      data-testid={`field-doodles-${pageKey}`}
      className="pointer-events-none absolute inset-0 z-10 hidden lg:block"
    >
      {/* Stamp cluster — top-right corner of the page (hero zone). */}
      {stamps.length > 0 && (
        <div
          className="absolute right-3 top-3 flex items-start gap-3"
          style={{ transform: `translate(${p.nudgeX}px, ${p.nudgeY}px)` }}
        >
          {first && (
            <span className="relative inline-block" style={{ transform: `rotate(${p.rotation}deg)` }}>
              <FieldStamp label={first.label} tone={first.tone ?? 'primary'} />
              {/* Hand-drawn circle around the stamp — the pen mark
                  circles real content (the stamp itself). */}
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2"
                viewBox="0 0 120 48"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M10,26 C18,8 96,4 112,20 C116,34 92,44 58,44 C26,44 4,40 8,26"
                  stroke={stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            </span>
          )}
          {second && (
            <span className="relative inline-block" style={{ transform: `rotate(${p.rotation2}deg)` }}>
              <FieldStamp label={second.label} tone={second.tone ?? 'primary'} />
              {/* Hand-drawn squiggle underline beneath the stamp. */}
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M2,8 C15,3 25,11 38,7 C52,3 62,11 75,7 C85,4 92,8 98,6"
                  stroke={stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            </span>
          )}
        </div>
      )}

      {/* Margin pen marks — empty side gutters only, 2xl and up. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-3 hidden h-6 w-6 2xl:block"
        style={{ top: `${p.marginTopLeft}%`, transform: `rotate(${p.checkRotation}deg)` }}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M4,13 L10,19 L21,5"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      </svg>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-3 hidden h-6 w-8 2xl:block"
        style={{ top: `${p.marginTopRight}%`, transform: `rotate(${p.arrowRotation}deg)` }}
        viewBox="0 0 36 24"
        fill="none"
      >
        <path
          d="M32,6 C22,8 12,13 5,19 M11,14 L4,20 L11,21"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}
