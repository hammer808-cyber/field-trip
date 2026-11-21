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
 * 600x220 viewBox the SVG path is drawn in, so the map scales.
 */
const TRAIL_VIEWBOX_WIDTH = 600;
const TRAIL_VIEWBOX_HEIGHT = 220;

const TRAIL_NODE_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 60, y: 180 },
  { x: 165, y: 180 },
  { x: 270, y: 180 },
  { x: 375, y: 180 },
  { x: 480, y: 180 },
  { x: 480, y: 110 },
  { x: 375, y: 110 },
  { x: 270, y: 110 },
  { x: 165, y: 110 },
  { x: 60, y: 110 },
  { x: 60, y: 40 },
  { x: 165, y: 40 },
  { x: 270, y: 40 },
  { x: 375, y: 40 },
  { x: 480, y: 40 },
];

/** Dashed SVG path threading the 15 nodes in level order. */
export const TRAIL_PATH_D =
  'M 60 180 H 480 C 540 180 540 110 480 110 H 60 C 0 110 0 40 60 40 H 480';

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
