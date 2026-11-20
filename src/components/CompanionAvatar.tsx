import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'motion/react';
import type { FieldTypeId } from '../constants/fieldTypes';
import { FIELD_TYPES } from '../constants/fieldTypes';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

export type CompanionMood = 'idle' | 'pop' | 'celebrate' | 'warn';
export type CompanionSize = 'small' | 'large' | 'spotlight';
export type CompanionEntrance = 'pop' | 'none';

const SIZE_CLASSES: Record<CompanionSize, string> = {
  small: 'h-8 w-8',
  large: 'h-10 w-10',
  spotlight: 'h-16 w-16',
};

export interface CompanionMotion {
  entrance: { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition } | null;
  loop: { animate: TargetAndTransition; transition: Transition } | null;
}

/**
 * Pure motion selection for the companion, exported for tests. Reduced
 * motion always renders static: no entrance, no loop. The 'pop' mood is
 * itself an entrance (spring in on mount); the other moods are loops.
 */
export function resolveCompanionMotion(
  mood: CompanionMood,
  entrance: CompanionEntrance,
  reduceMotion: boolean | null,
): CompanionMotion {
  if (reduceMotion) return { entrance: null, loop: null };
  const showEntrance = entrance === 'pop' || mood === 'pop';
  const entranceProps = showEntrance
    ? {
        initial: { scale: 0.6, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring', stiffness: 260, damping: 18 } as Transition,
      }
    : null;
  let loop: CompanionMotion['loop'] = null;
  if (mood === 'idle') {
    loop = {
      animate: { y: [0, -4, 0] },
      transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
    };
  } else if (mood === 'celebrate') {
    loop = {
      animate: { y: [0, -10, 0, -6, 0] },
      transition: { duration: 0.8, repeat: 1, ease: 'easeOut' },
    };
  } else if (mood === 'warn') {
    loop = {
      animate: { x: [0, -3, 3, -3, 0] },
      transition: { duration: 0.4, ease: 'easeInOut' },
    };
  }
  return { entrance: entranceProps, loop };
}

interface CompanionAvatarProps {
  size?: CompanionSize;
  mood?: CompanionMood;
  /** Spring in on mount. The Trevor panel passes 'pop'; everywhere else defaults to 'none'. */
  entrance?: CompanionEntrance;
  /**
   * Explicit persona override (test seam). When undefined, the persona
   * resolves itself from useApp() fieldType.
   */
  fieldType?: FieldTypeId | null;
  className?: string;
}

/**
 * The quiz persona as an animated companion (Tier 1, Nov 20, 2026). Trevor
 * stays the main guide; the companion never speaks — it just shows up
 * beside him and reacts to the moment. Renders nothing when the player is
 * unclassified (or has no provider, e.g. standalone view tests), so the
 * Trevor panel and launcher are exactly as today until the quiz is done.
 * Avatar art only — the full-body files are 1.5–3MB and stay on Profile /
 * level-up. Reduced motion renders the static avatar only.
 */
export function CompanionAvatar({
  size = 'large',
  mood = 'idle',
  entrance = 'none',
  fieldType: fieldTypeProp,
  className,
}: CompanionAvatarProps) {
  const reduceMotion = useReducedMotion();
  // useApp throws outside AppProvider, so resolve defensively: no provider
  // means no companion, not a crash.
  let contextFieldType: FieldTypeId | null = null;
  try {
    contextFieldType = useApp().fieldType;
  } catch {
    contextFieldType = null;
  }
  const fieldType = fieldTypeProp !== undefined ? fieldTypeProp : contextFieldType;
  const type = fieldType && fieldType !== 'unclassified' ? FIELD_TYPES[fieldType] : null;
  if (!type) return null;

  const { entrance: entranceProps, loop } = resolveCompanionMotion(mood, entrance, reduceMotion);
  const frameClass = cn(
    'block shrink-0 overflow-hidden rounded-full border-2 border-on-surface bg-white',
    SIZE_CLASSES[size],
  );
  const img = (
    <img src={type.avatarPath} alt={`${type.name} companion`} className="h-full w-full object-cover" />
  );
  const inner = loop ? (
    <motion.span className="block h-full w-full" animate={loop.animate} transition={loop.transition}>
      {img}
    </motion.span>
  ) : (
    img
  );

  if (entranceProps) {
    return (
      <motion.span
        data-testid="companion-avatar"
        data-companion-mood={mood}
        data-companion-size={size}
        className={cn('block shrink-0', className)}
        initial={entranceProps.initial}
        animate={entranceProps.animate}
        transition={entranceProps.transition}
      >
        <span className={frameClass}>{inner}</span>
      </motion.span>
    );
  }
  return (
    <span
      data-testid="companion-avatar"
      data-companion-mood={mood}
      data-companion-size={size}
      className={cn(frameClass, className)}
    >
      {inner}
    </span>
  );
}
