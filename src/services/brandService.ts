import { ChallengeCard, BrandFit } from '../types/challenges';

/**
 * Validates a challenge candidate against Field Trip brand rules.
 */
export function validateChallengeBrandFit(challenge: Partial<ChallengeCard>): { status: BrandFit; reason?: string } {
  const { theAsk, title, safetyRules, proofRequirements, proofNeeded, tags } = challenge;

  if (!title || !theAsk) {
    return { status: 'needs_review', reason: 'Missing core identity fields (Title/Ask).' };
  }

  // Rule: Feelings - mysterious, playful, summery, evidence-based
  // (Heuristic check on tags or content)
  const brandKeywords = ['mysterious', 'playful', 'summer', 'evidence', 'urban', 'nature', 'secret', 'clue', 'survey', 'audit'];
  const content = (title + ' ' + theAsk).toLowerCase();
  const hasBrandVibe = brandKeywords.some(k => content.includes(k)) || tags?.some(t => brandKeywords.includes(t));

  // Rule: Rejections
  const forbiddenKeywords = ['embarrass', 'stranger', 'money', 'trespass', 'spend', 'buy', 'private property', 'private info'];
  const hasForbiddenContent = forbiddenKeywords.some(k => content.includes(k));

  if (hasForbiddenContent) {
    return { status: 'rejected', reason: 'Contains forbidden activity (Spending money, strangers, or trespassing).' };
  }

  // Rule: Simple enough but with layers
  if (!challenge.levels?.Explorer || !challenge.levels?.Legend) {
    return { status: 'needs_review', reason: 'Missing Explorer or Legend layers.' };
  }

  // Rule: Proof requirements
  if (!proofNeeded || !proofRequirements) {
    return { status: 'needs_review', reason: 'Vague proof requirements.' };
  }

  if (hasBrandVibe) {
    return { status: 'approved' };
  }

  return { status: 'needs_review', reason: 'Vibe check inconclusive. Requires human review.' };
}
