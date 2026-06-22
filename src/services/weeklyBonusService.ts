import { Entry } from '../types/game';
import { TripCard } from '../types/challenges';
import { getWeeklyBonusForWeek, WEEKLY_BONUSES, WeeklyBonus } from '../data/weeklyBonuses';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface WeeklyBonusRule {
  id: string;
  title: string;
  description: string;
  type: 'points' | 'xp' | 'tokens' | 'multiplier' | 'shield';
  amount: number;
  oncePerWeek: boolean;
}

export const WEEKLY_BONUS_RULES: Record<string, WeeklyBonusRule> = {
  'bonus-urban-uplink': {
    id: 'bonus-urban-uplink',
    title: 'Urban Uplink',
    description: 'Double points on the first approved submission of the week.',
    type: 'multiplier',
    amount: 2.0,
    oncePerWeek: true
  },
  'bonus-heatwave-receipts': {
    id: 'bonus-heatwave-receipts',
    title: 'Heatwave Receipts Booster',
    description: '+25 bonus XP for completing any Heatwave Receipts mission this week.',
    type: 'xp',
    amount: 25,
    oncePerWeek: false
  },
  'bonus-noontime-sync': {
    id: 'bonus-noontime-sync',
    title: 'Noontime Sync',
    description: '+15 bonus points for submitting any mission between 11:00 AM and 1:00 PM local time.',
    type: 'points',
    amount: 15,
    oncePerWeek: false
  },
  'bonus-scout-armor': {
    id: 'bonus-scout-armor',
    title: 'Scout Armor Shield',
    description: '+1 streak protection this week. Your multiplier is shielded.',
    type: 'shield',
    amount: 1,
    oncePerWeek: true
  },
  'bonus-radar-sweep': {
    id: 'bonus-radar-sweep',
    title: 'Radar Sweep',
    description: 'Hidden object missions earn +20 bonus XP.',
    type: 'xp',
    amount: 20,
    oncePerWeek: false
  },
  'bonus-token-multiplier': {
    id: 'bonus-token-multiplier',
    title: 'Archive Token Boost',
    description: 'First approved mission of the week rewards double tokens for the Season Archive.',
    type: 'multiplier',
    amount: 2.0,
    oncePerWeek: true
  },
  'bonus-expressive-flare': {
    id: 'bonus-expressive-flare',
    title: 'Expressive Flare',
    description: 'Mood Object or atmospheric missions reward +15 bonus XP.',
    type: 'xp',
    amount: 15,
    oncePerWeek: false
  },
  'bonus-ocular-capture': {
    id: 'bonus-ocular-capture',
    title: 'Ocular Capture Multiplier',
    description: 'Photo-proof missions receive a 1.2x overall XP boost this week.',
    type: 'multiplier',
    amount: 1.2,
    oncePerWeek: false
  },
  'bonus-transmission-leak': {
    id: 'bonus-transmission-leak',
    title: 'Transmission Leak',
    description: 'Missions completed during high heat solar hours (2 PM - 4 PM) award +20 XP.',
    type: 'xp',
    amount: 20,
    oncePerWeek: false
  },
  'bonus-archive-sweep': {
    id: 'bonus-archive-sweep',
    title: 'Archive Retry Bonus',
    description: 'Retry and resubmission success rewards an extra 10 XP on approved logs this week.',
    type: 'xp',
    amount: 10,
    oncePerWeek: false
  },
  'bonus-transit-sync': {
    id: 'bonus-transit-sync',
    title: 'Transit Node Sync',
    description: 'Missions located near transit-hubs, platforms, or bus stops reward +15 tokens.',
    type: 'tokens',
    amount: 15,
    oncePerWeek: false
  },
  'bonus-flora-finder': {
    id: 'bonus-flora-finder',
    title: 'Flora Finder Overlay',
    description: 'Nature-based, overgrown urban, or floral observations yield +20 XP extra.',
    type: 'xp',
    amount: 20,
    oncePerWeek: false
  },
  'bonus-retro-scan': {
    id: 'bonus-retro-scan',
    title: 'Retro Scan Sync',
    description: 'Legacy technology, older signs, or antique object observations score double tokens.',
    type: 'tokens',
    amount: 10, // Let's give 10 bonus tokens as a solid boost
    oncePerWeek: false
  },
  'bonus-overgrowth-echo': {
    id: 'bonus-overgrowth-echo',
    title: 'Overgrowth Echo',
    description: 'Missions capturing overgrowth, weeds cracking through concrete, or alleys award +15 XP.',
    type: 'xp',
    amount: 15,
    oncePerWeek: false
  },
  'bonus-dusk-surveillance': {
    id: 'bonus-dusk-surveillance',
    title: 'Dusk Scout Protocol',
    description: 'Missions submitted and approved during dusk hours (6 PM - 8 PM) secure dynamic streak-shields.',
    type: 'shield',
    amount: 1,
    oncePerWeek: true
  }
};

/**
 * Checks if a specific user has already applied a once-per-week bonus this week.
 * Query looks for approved entry under this week containing weeklyBonusApplied: true.
 */
export async function hasUserEarnedWeeklyBonusThisWeek(
  userId: string, 
  weekNumber: number, 
  weeklyBonusId: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'entries'),
      where('userId', '==', userId),
      where('status', '==', 'approved'),
      where('weekNumber', '==', weekNumber),
      where('weeklyBonusApplied', '==', true),
      where('weeklyBonusId', '==', weeklyBonusId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[weeklyBonusService] Error checking weekly bonus usage:', error);
    return false;
  }
}

/**
 * Returns the currently active weekly bonus config for display and logic.
 */
export function getActiveWeeklyBonus(weekNumber: number): WeeklyBonus & { rule?: WeeklyBonusRule } {
  const bonus = getWeeklyBonusForWeek(weekNumber);
  const rule = WEEKLY_BONUS_RULES[bonus.id];
  return {
    ...bonus,
    rule
  };
}

/**
 * Central rule processor checking does the given weekly bonus apply to a submission.
 */
export function doesBonusApplyToSubmission(
  bonusId: string,
  entry: Partial<Entry>,
  challenge: Partial<TripCard>,
  isFirstApprovedSubmissionOfWeek: boolean = false
): boolean {
  const rule = WEEKLY_BONUS_RULES[bonusId];
  if (!rule) return false;

  const submittedTime = entry.createdAt && (entry.createdAt as any).toDate 
    ? (entry.createdAt as any).toDate() 
    : new Date();
  const hr = submittedTime.getHours();

  switch (bonusId) {
    case 'bonus-urban-uplink':
      return isFirstApprovedSubmissionOfWeek;

    case 'bonus-heatwave-receipts':
      // Heatwave deck or tag summer or id matches
      const isSummerDeck = (challenge as any).packId === 'heatwave-receipts' || 
                           challenge.tags?.some((t: string) => t.toLowerCase().includes('summer')) ||
                           (challenge.id && !['starter-1', 'starter-2', 'starter-3'].includes(challenge.id));
      return !!isSummerDeck;

    case 'bonus-noontime-sync':
      return hr >= 11 && hr < 13;

    case 'bonus-scout-armor':
      return isFirstApprovedSubmissionOfWeek;

    case 'bonus-radar-sweep':
      const isRadar = challenge.tags?.some((t: string) => ['hidden', 'radar', 'scan', 'find', 'micr', 'covert'].some(kw => t.toLowerCase().includes(kw))) || 
                      challenge.title?.toLowerCase().includes('hidden') || 
                      challenge.description?.toLowerCase().includes('hidden') || 
                      challenge.title?.toLowerCase().includes('radar');
      return !!isRadar;

    case 'bonus-token-multiplier':
      return isFirstApprovedSubmissionOfWeek;

    case 'bonus-expressive-flare':
      const isVibe = challenge.tags?.some((t: string) => ['mood', 'atmosphere', 'flare', 'journal', 'vibe', 'retro', 'aesthetic'].some(kw => t.toLowerCase().includes(kw))) ||
                     challenge.title?.toLowerCase().includes('mood') ||
                     challenge.description?.toLowerCase().includes('mood') ||
                     challenge.title?.toLowerCase().includes('vibe');
      return !!isVibe;

    case 'bonus-ocular-capture':
      return !!entry.proofImage;

    case 'bonus-transmission-leak':
      return hr >= 14 && hr < 16;

    case 'bonus-archive-sweep':
      return !!entry.isRetry || !!(entry as any).originalEntryId;

    case 'bonus-transit-sync':
      const isTransit = challenge.tags?.some((t: string) => ['transit', 'hub', 'platform', 'bus', 'stop', 'train', 'metro', 'subway'].some(kw => t.toLowerCase().includes(kw))) ||
                        challenge.title?.toLowerCase().includes('transit') ||
                        challenge.description?.toLowerCase().includes('transit') ||
                        challenge.description?.toLowerCase().includes('subway');
      return !!isTransit;

    case 'bonus-flora-finder':
      const isFlora = challenge.tags?.some((t: string) => ['nature', 'flora', 'plant', 'overgrown', 'weed', 'garden', 'green'].some(kw => t.toLowerCase().includes(kw))) ||
                      challenge.title?.toLowerCase().includes('flora') ||
                      challenge.description?.toLowerCase().includes('plant') ||
                      challenge.description?.toLowerCase().includes('nature');
      return !!isFlora;

    case 'bonus-retro-scan':
      const isRetro = challenge.tags?.some((t: string) => ['legacy', 'tech', 'sign', 'antique', 'retro', 'old', 'vintage'].some(kw => t.toLowerCase().includes(kw))) ||
                      challenge.title?.toLowerCase().includes('legacy') ||
                      challenge.description?.toLowerCase().includes('retro') ||
                      challenge.description?.toLowerCase().includes('vintage');
      return !!isRetro;

    case 'bonus-overgrowth-echo':
      const isConcreteOvergrowth = challenge.tags?.some((t: string) => ['overgrowth', 'alley', 'weed', 'concrete', 'plant', 'brick', 'crack'].some(kw => t.toLowerCase().includes(kw))) ||
                                   challenge.description?.toLowerCase().includes('overgrowth') ||
                                   challenge.title?.toLowerCase().includes('overgrowth') ||
                                   challenge.description?.toLowerCase().includes('weed');
      return !!isConcreteOvergrowth;

    case 'bonus-dusk-surveillance':
      return hr >= 18 && hr < 20;

    default:
      return false;
  }
}

/**
 * Calculates the bonus point breakdown to return points, xp, tokens, shield status.
 */
export function calculateWeeklyBonusReward(
  bonusId: string,
  entry: Partial<Entry>,
  challenge: Partial<TripCard>,
  baseXP: number,
  isFirstApprovedSubmissionOfWeek: boolean = false
) {
  const applies = doesBonusApplyToSubmission(bonusId, entry, challenge, isFirstApprovedSubmissionOfWeek);
  const rule = WEEKLY_BONUS_RULES[bonusId];

  if (!applies || !rule) {
    return {
      applied: false,
      bonusId,
      bonusTitle: rule?.title || '',
      points: 0,
      xp: 0,
      tokens: 0,
      multiplier: 1.0,
      shield: false
    };
  }

  let points = 0;
  let xp = 0;
  let tokens = 0;
  let multiplier = 1.0;
  let shield = false;

  switch (rule.type) {
    case 'points':
      points = rule.amount;
      break;
    case 'xp':
      xp = rule.amount;
      break;
    case 'tokens':
      tokens = rule.amount;
      break;
    case 'multiplier':
      multiplier = rule.amount;
      break;
    case 'shield':
      shield = true;
      break;
  }

  return {
    applied: true,
    bonusId,
    bonusTitle: rule.title,
    points,
    xp,
    tokens,
    multiplier,
    shield
  };
}
