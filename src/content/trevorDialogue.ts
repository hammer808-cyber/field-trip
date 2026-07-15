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
    'The paperwork is blocking the door. Finish setup, then we can resume making questionable field decisions.',
  ],
  classification_required: [
    'Your Explorer Type is still unfiled. Pick one so the Bureau knows what kind of problem it hired.',
  ],
  proof_needs_more: [
    '{missionTitle} needs one clearer receipt. Fix that before we add another mystery to the pile.',
    'The review desk wants more evidence for {missionTitle}. Annoying, but specific. Let us repair it.',
  ],
  starter_retry: [
    'One Starter receipt did not hold up. Retry {missionTitle} with clearer evidence and less interpretive fog.',
  ],
  starter_active: [
    '{missionTitle} is already in your hands. Finish that signal before drawing another tiny obligation.',
  ],
  starter_incomplete: [
    '{starterRemaining} Starter Signal{starterPlural} left. The larger map stays dramatically unavailable until those approvals land.',
    'Starter clearance is {starterApprovedCount}/{starterRequiredCount}. One honest receipt at a time.',
  ],
  starter_pending: [
    'Your Starter receipts are at the review desk. Check the Logbook; drawing duplicates will not improve bureaucracy.',
  ],
  active_mission: [
    '{missionTitle} is still active. Resume it before it becomes decorative paperwork.',
    'You already have {missionTitle} in motion. The field would like an ending.',
  ],
  voting_open: [
    'Voting is open, and apparently democracy once again requires your participation.',
    'The weekly ballot is live. Vote now; the receipts cannot judge themselves responsibly.',
  ],
  starter_complete_unlock: [
    'Starter clearance confirmed. New decks, levels, voting, crews, and zines are live. We will inspect one thing at a time.',
  ],
  near_level: [
    'You are {xp} XP from {nextLevelTitle}. A normal mission should finish the paperwork.',
    '{xp} XP separates you from the next dubious promotion. Mildly dramatic.',
  ],
  weekly_rank: [
    'You are ranked {rank}, and {pointsToNextRank} points separate you from the next spot. This is almost a plot.',
  ],
  crew_action: [
    'Your crew has an open field action. Group projects have returned, but at least this one has receipts.',
  ],
  profile_incomplete: [
    'Your profile is missing {profileField}. Give the archive enough detail to identify its newest local legend.',
  ],
  zine_gap: [
    'The zine is thin on {zineGap}. Try a mission that gives the story a different shape.',
    'Your archive could use more {zineGap}. The next receipt should bring actual material.',
  ],
  proof_variety: [
    'You have submitted the same kind of proof three times. Try something beyond {proofType} so the zine gets an actual story.',
  ],
  mission_discovery: [
    '{deckName} has not appeared in your recent fieldwork. Go make that suspiciously specific.',
  ],
  fallback_draw: [
    'No urgent fires. Open {deckName}, find one interesting thing, and bring back a receipt.',
    'Systems nominal. A fresh mission is currently the least ridiculous useful option.',
  ],
  fallback_standings: [
    'No urgent field action found. Check the standings and see what everyone else has been doing outside.',
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
