import { PLAYER_LEVELS, getLevelFromXp, getLevelProgress } from './playerLevel';

export type TrailNodeState = 'passed' | 'current' | 'next' | 'locked';

export interface TrailNode {
  level: number;
  title: string;
  minXp: number;
  state: TrailNodeState;
  /** Horizontal position as a percentage of the map width. */
  xPercent: number;
  /** Vertical position as a percentage of the map height. */
  yPercent: number;
}

export interface LevelTrail {
  nodes: TrailNode[];
  currentLevel: number;
  /** True once the player has reached level 15 (Local Folklore): the
      authored trail is done, even though the level system keeps counting
      past 15 (getLevelProgress hands back a level-16 next goal). */
  isComplete: boolean;
  nextNode: TrailNode | null;
  xpToNextLevel: number;
  progressPercent: number;
}

/**
 * The trail snakes up the map like a board-game path: levels 1-5 along
 * the bottom left to right, 6-10 across the middle right to left, 11-15
 * along the top left to right. Positions are percentages of the
 * 600x280 viewBox the SVG path is drawn in, so the map scales.
 *
 * Nov 21, 2026: the viewBox grew from 220 to 280 tall. At a 390px
 * phone the map is ~262px wide, so the old 70-unit rows sat only
 * ~31px apart while the nodes are 36px (48px current) — the circles
 * intersected. The 90-unit rows sit ~39px apart, so no two circles
 * touch at 390px. Basecamp's compact map is unaffected: it lays its
 * own single row and only reads states/titles from here.
 */
const TRAIL_VIEWBOX_WIDTH = 600;
const TRAIL_VIEWBOX_HEIGHT = 280;

const TRAIL_NODE_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 60, y: 230 },
  { x: 165, y: 230 },
  { x: 270, y: 230 },
  { x: 375, y: 230 },
  { x: 480, y: 230 },
  { x: 480, y: 140 },
  { x: 375, y: 140 },
  { x: 270, y: 140 },
  { x: 165, y: 140 },
  { x: 60, y: 140 },
  { x: 60, y: 50 },
  { x: 165, y: 50 },
  { x: 270, y: 50 },
  { x: 375, y: 50 },
  { x: 480, y: 50 },
];

/** Dashed SVG path threading the 15 nodes in level order. */
export const TRAIL_PATH_D =
  'M 60 230 H 480 C 540 230 540 140 480 140 H 60 C 0 140 0 50 60 50 H 480';

export const TRAIL_VIEWBOX = `0 0 ${TRAIL_VIEWBOX_WIDTH} ${TRAIL_VIEWBOX_HEIGHT}`;

export function buildLevelTrail(value: unknown): LevelTrail {
  const progress = getLevelProgress(value);
  const currentLevel = Math.min(getLevelFromXp(value), PLAYER_LEVELS.length);
  const isComplete = getLevelFromXp(value) >= PLAYER_LEVELS.length;

  const nodes: TrailNode[] = PLAYER_LEVELS.map((definition) => {
    const coords = TRAIL_NODE_COORDS[definition.level - 1];
    let state: TrailNodeState = 'locked';
    if (definition.level < currentLevel) state = 'passed';
    else if (definition.level === currentLevel) state = 'current';
    else if (definition.level === currentLevel + 1 && !isComplete) state = 'next';
    return {
      level: definition.level,
      title: definition.title,
      minXp: definition.minXp,
      state,
      xPercent: (coords.x / TRAIL_VIEWBOX_WIDTH) * 100,
      yPercent: (coords.y / TRAIL_VIEWBOX_HEIGHT) * 100,
    };
  });

  return {
    nodes,
    currentLevel,
    isComplete,
    nextNode: isComplete ? null : nodes[currentLevel] ?? null,
    xpToNextLevel: isComplete ? 0 : progress.xpToNextLevel,
    progressPercent: isComplete ? 100 : progress.progressPercent,
  };
}
