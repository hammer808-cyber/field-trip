import type { TrevorContext } from '../services/trevorContextService';
import type {
  ResolvedTrevorRecommendation,
  TrevorMessageKey,
} from '../services/trevorRecommendationEngine';
import {
  getTrevorRecommendationDisplayCount,
  type TrevorHistoryEntry,
} from '../services/trevorHistoryService';

const TREVOR_DIALOGUE: Readonly<Record<TrevorMessageKey, readonly string[]>> = {
  legal_required: [
    'Finish setup, then we can play.',
  ],
  classification_required: [
    'Pick your Explorer Type so Fieldtrip knows how to talk to you.',
  ],
  proof_needs_more: [
    '{missionTitle} needs a clearer photo. Add more proof.',
    'Review wants more evidence for {missionTitle}. Fix that first.',
  ],
  starter_retry: [
    '{missionTitle} didn’t pass. Retry with a clearer photo.',
  ],
  starter_active: [
    '{missionTitle} is already in your hands. Finish it first.',
  ],
  starter_incomplete: [
    'Draw your next Starter mission. {starterRemaining} left.',
    'Starter progress is {starterApprovedCount}/{starterRequiredCount}. Draw the next one.',
  ],
  starter_pending: [
    'Your Starter proofs are in review. Check the Logbook.',
  ],
  active_mission: [
    '{missionTitle} is still open. Resume it.',
    'Finish {missionTitle} before drawing another.',
  ],
  voting_open: [
    'Your vote is ready.',
    'Weekly voting is open. Cast it now.',
  ],
  starter_complete_unlock: [
    'Starter done. New decks are open — draw one.',
  ],
  near_level: [
    'You are {xp} XP from {nextLevelTitle}. One mission should do it.',
    '{xp} XP left to the next level.',
  ],
  weekly_rank: [
    'Rank {rank}. {pointsToNextRank} points to the next spot.',
  ],
  crew_action: [
    'Your crew has an open field action.',
  ],
  profile_incomplete: [
    'Your profile is missing {profileField}.',
  ],
  zine_gap: [
    'Your zine is thin on {zineGap}. Try a different kind of mission.',
    'Add more {zineGap} to the archive.',
  ],
  proof_variety: [
    'Try something beyond {proofType} so the story changes.',
  ],
  mission_discovery: [
    '{deckName} is still waiting. Go make it specific.',
  ],
  fallback_draw: [
    'Nothing urgent. Draw a mission when you’re ready.',
    'Systems calm. A fresh mission is the useful next tap.',
  ],
  fallback_standings: [
    'Nothing urgent. Check the Big Board if you want to look around.',
  ],
};

export function renderTrevorDialogue(
  recommendation: ResolvedTrevorRecommendation,
  context: TrevorContext,
  history: readonly TrevorHistoryEntry[] = [],
): string {
  const variants = TREVOR_DIALOGUE[recommendation.messageKey];
  const displayCount = getTrevorRecommendationDisplayCount(recommendation.id, history);
  const template = variants[displayCount % variants.length];
  const replacements = getDialogueReplacements(context);
  return template.replace(/\{([a-zA-Z]+)\}/g, (_match, key: string) => replacements[key] ?? '');
}

function getDialogueReplacements(context: TrevorContext): Record<string, string> {
  const starterRemaining = Math.max(0, context.starterRequiredCount - context.starterApprovedCount);
  return {
    xp: context.xpToNextLevel.toLocaleString(),
    rank: String(context.weeklyRank ?? ''),
    pointsToNextRank: context.pointsToNextRank?.toLocaleString() ?? '',
    levelTitle: context.levelTitle,
    nextLevelTitle: `Level ${context.level + 1}`,
    missionTitle: context.proofNeedingMoreEvidence?.missionTitle
      || context.rejectedProof?.missionTitle
      || context.activeMission?.title
      || 'that mission',
    starterRemaining: String(starterRemaining),
    starterPlural: starterRemaining === 1 ? '' : 's',
    starterApprovedCount: String(context.starterApprovedCount),
    starterRequiredCount: String(context.starterRequiredCount),
    proofType: readableToken(context.repeatedProofType || 'photo'),
    profileField: readableToken(context.missingProfileFields[0] || 'profile details'),
    zineGap: readableToken(context.zineContentGaps[0] || 'field material'),
    deckName: readableToken(context.recommendedDeckId || 'the mission deck'),
  };
}

function readableToken(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}
