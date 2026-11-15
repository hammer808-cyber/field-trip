/**
 * AI-suggested rubric for the admin proof review queue (Option A).
 *
 * Pure mapping from the STORED Gemini analysis on a queue entry to suggested
 * rubric ratings. No new Gemini calls, no server round-trip: the suggestion
 * reuses the analysis that was already stored at submit time.
 *
 * Guardrails (non-negotiable, see docs/admin-console-audit.md §4):
 * - A suggestion is never an auto-approval. Nothing is submitted without
 *   the admin's tap; the suggestion only pre-fills ratings.
 * - No suggestion when the stored analysis is untrustworthy: a simulated
 *   fallback scan, an error fallback / network failure, or no analysis at
 *   all. Those cards show "AI didn't look at this one" and keep the blank
 *   default rubric.
 * - Fieldtrip Energy (5%) has no AI signal and is never suggested; it stays
 *   manual at the default 2.
 * - Low-confidence items (suggested weighted < 60, duplicate flag, or
 *   aiRiskScore >= 60) are flagged, not pre-filled with an approve-leaning
 *   suggestion. The button still works, but the flag is shown plainly.
 */
import {
  calculateProofRubricScore,
  DEFAULT_PROOF_RUBRIC_RATINGS,
  type ProofRubricRecommendation,
} from './proofRubric';
import { DEFAULT_FIELD_NOTE_TEXT, MIN_VOICE_NOTE_SECONDS } from './missionScoring';

export const AI_SUGGESTION_VERSION = 'ai-suggestion.v1' as const;

/** The Gemini analysis object as stored on the entry (aiAnalysisResult / proofCheckResult). */
export interface AiAnalysisInput {
  detectedSubject?: boolean | null;
  /** 0–1. Older stored values may be 0–100; normalized on read. */
  confidence?: number | null;
  /** 0–100. */
  missionMatchScore?: number | null;
  detectedItems?: string[] | null;
  missingItems?: string[] | null;
  displayTitle?: string | null;
  displayDetail?: string | null;
  reason?: string | null;
  /** e.g. "gemini-1.5-flash", "fallback_simulated_flash", "error_fallback". */
  modelUsed?: string | null;
  status?: string | null;
}

/** The trust signals evaluateProof stored on the linked proofReviews doc. */
export interface AiTrustInput {
  proofTrustScore?: number | null;
  aiRiskScore?: number | null;
  duplicateWarning?: 'exact_duplicate' | 'near_duplicate' | string | null;
  riskReasons?: string[] | null;
}

export type AiSuggestedCategoryId = 'missionMatch' | 'proofClarity' | 'authenticity' | 'fieldNoteQuality';

export interface AiSuggestedCategory {
  rating: number;
  reason: string;
}

export interface AiSuggestedRubric {
  version: typeof AI_SUGGESTION_VERSION;
  /** The four mappable categories. Fieldtrip Energy is deliberately absent: no AI signal exists for it. */
  ratings: Record<AiSuggestedCategoryId, number>;
  reasons: Record<AiSuggestedCategoryId, string>;
  /** Weighted 0–100 with Fieldtrip Energy held at the manual default (2). */
  weightedScore: number;
  recommendation: ProofRubricRecommendation;
  /** True when the suggestion leans away from approval or carries a risk flag. */
  flagged: boolean;
  flagReasons: string[];
  /** One-line draft for the admin note, editable. */
  summary: string;
  source: {
    modelUsed: string | null;
    detectedSubject: boolean | null;
    confidence: number | null;
    missionMatchScore: number | null;
    duplicateWarning: string | null;
  };
}

export type AiSuggestionResult =
  | { available: false; reason: string }
  | { available: true; suggestion: AiSuggestedRubric };

/** modelUsed values that are not a real AI verdict. */
const UNTRUSTWORTHY_MODEL_USED = new Set(['fallback_simulated_flash', 'error_fallback']);

/**
 * Normalize a stored confidence to 0–1. The server returns 0–1, but some
 * stored values may be 0–100 (proofService compares against 50 in one
 * place); anything above 1 is treated as a 0–100 score and divided by 100.
 */
export function normalizeAiConfidence(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 1) return Math.min(1, Math.max(0, parsed / 100));
  return Math.min(1, Math.max(0, parsed));
}

/** The analysis object as stored on a queue entry (aiAnalysisResult first, proofCheckResult as the mirror). */
export function extractAiAnalysis(entry: any): AiAnalysisInput | null {
  const raw = entry?.aiAnalysisResult ?? entry?.proofCheckResult ?? null;
  if (!raw || typeof raw !== 'object') return null;
  return {
    detectedSubject: raw.detectedSubject ?? null,
    confidence: raw.confidence ?? null,
    missionMatchScore: raw.missionMatchScore ?? null,
    detectedItems: Array.isArray(raw.detectedItems) ? raw.detectedItems : [],
    missingItems: Array.isArray(raw.missingItems) ? raw.missingItems : [],
    displayTitle: raw.displayTitle ?? null,
    displayDetail: raw.displayDetail ?? null,
    reason: raw.reason ?? null,
    modelUsed: raw.modelUsed ?? null,
    status: raw.status ?? null,
  };
}

/** The trust signals from the linked proofReviews doc's verification block. */
export function extractAiTrust(entry: any): AiTrustInput {
  const verification = entry?.verification && typeof entry.verification === 'object' ? entry.verification : {};
  return {
    proofTrustScore: verification.proofTrustScore ?? entry?.proofTrustScore ?? null,
    aiRiskScore: verification.aiRiskScore ?? entry?.aiRiskScore ?? null,
    duplicateWarning: verification.duplicateWarning ?? entry?.duplicateWarning ?? null,
    riskReasons: Array.isArray(verification.riskReasons)
      ? verification.riskReasons
      : Array.isArray(entry?.riskReasons)
        ? entry.riskReasons
        : [],
  };
}

/** The stored AI confidence as a 0–100 percent, or null when nothing is stored. */
export function aiConfidencePercent(entry: any): number | null {
  const confidence = normalizeAiConfidence(extractAiAnalysis(entry)?.confidence);
  return confidence == null ? null : Math.round(confidence * 100);
}

/**
 * Is the stored analysis a real AI verdict? False for the simulated
 * fallback scan (server fabricates a passing grade when GEMINI_API_KEY is
 * missing), for the client error fallback (network failure), and when no
 * analysis is stored at all. A "not detected" verdict is trustworthy — the
 * AI looked and said no — and still yields a (low) suggestion.
 */
export function isTrustworthyAiAnalysis(analysis: AiAnalysisInput | null | undefined): { ok: boolean; reason: string } {
  if (!analysis) {
    return { ok: false, reason: 'No AI analysis is stored on this submission.' };
  }
  const modelUsed = String(analysis.modelUsed || '').trim();
  if (
    UNTRUSTWORTHY_MODEL_USED.has(modelUsed) ||
    modelUsed.startsWith('fallback_') ||
    modelUsed.startsWith('error_')
  ) {
    return { ok: false, reason: `The stored scan is a ${modelUsed || 'fallback'} result, not a real AI verdict.` };
  }
  const confidence = normalizeAiConfidence(analysis.confidence);
  const missingItems = Array.isArray(analysis.missingItems) ? analysis.missingItems : [];
  if (confidence === 0 && missingItems.includes('NETWORK_COMM_FAILURE')) {
    return { ok: false, reason: 'The AI scan failed on the network — no verdict was produced.' };
  }
  return { ok: true, reason: '' };
}

function missionMatchCategory(
  missionMatchScore: number | null,
  detectedSubject: boolean | null,
): AiSuggestedCategory {
  if (missionMatchScore == null || !Number.isFinite(missionMatchScore)) {
    return detectedSubject === true
      ? { rating: 2, reason: 'AI confirmed the subject but stored no match score.' }
      : { rating: 0, reason: 'No match score stored and the subject was not detected.' };
  }
  const score = Math.round(missionMatchScore);
  if (score >= 90) return { rating: 4, reason: `Mission match ${score}/100 — nailed it.` };
  if (score >= 75) return { rating: 3, reason: `Mission match ${score}/100 — clearly matches.` };
  if (score >= 50) return { rating: 2, reason: `Mission match ${score}/100 — mostly there.` };
  if (score >= 25) return { rating: 1, reason: `Mission match ${score}/100 — weak match.` };
  return { rating: 0, reason: `Mission match ${score}/100 — wrong mission.` };
}

function proofClarityCategory(confidence: number | null): AiSuggestedCategory {
  if (confidence == null) return { rating: 0, reason: 'No AI confidence stored.' };
  if (confidence >= 0.85) return { rating: 4, reason: `AI confidence ${confidence.toFixed(2)} — crystal clear.` };
  if (confidence >= 0.7) return { rating: 3, reason: `AI confidence ${confidence.toFixed(2)} — clear.` };
  if (confidence >= 0.5) return { rating: 2, reason: `AI confidence ${confidence.toFixed(2)} — partly visible.` };
  if (confidence >= 0.3) return { rating: 1, reason: `AI confidence ${confidence.toFixed(2)} — very unclear.` };
  return { rating: 0, reason: `AI confidence ${confidence.toFixed(2)} — unusable.` };
}

function authenticityCategory(trust: AiTrustInput): AiSuggestedCategory {
  const duplicate = String(trust.duplicateWarning || '').toLowerCase();
  if (duplicate === 'exact_duplicate') {
    return { rating: 0, reason: 'Exact duplicate of another submission.' };
  }
  if (duplicate === 'near_duplicate') {
    return { rating: 1, reason: 'Near-duplicate of another submission.' };
  }
  const risk = trust.aiRiskScore == null ? null : Number(trust.aiRiskScore);
  if (risk != null && Number.isFinite(risk) && risk >= 60) {
    return { rating: 1, reason: `AI risk score ${Math.round(risk)}/100 — suspicious.` };
  }
  const trustScore = trust.proofTrustScore == null ? null : Number(trust.proofTrustScore);
  if (trustScore != null && Number.isFinite(trustScore) && trustScore >= 80) {
    return { rating: 4, reason: `Trust score ${Math.round(trustScore)}/100 — high trust.` };
  }
  if (trustScore != null && Number.isFinite(trustScore) && trustScore >= 60) {
    return { rating: 3, reason: `Trust score ${Math.round(trustScore)}/100 — credible.` };
  }
  return { rating: 2, reason: 'No trust flags stored — neutral.' };
}

function fieldNoteQualityCategory(
  note: string | null | undefined,
  voiceNoteSeconds: number | null,
  voiceNotePresent: boolean,
): AiSuggestedCategory {
  const text = String(note || '').trim();
  const voiceQualifies =
    voiceNotePresent || (voiceNoteSeconds != null && Number.isFinite(voiceNoteSeconds) && voiceNoteSeconds >= MIN_VOICE_NOTE_SECONDS);
  if (text === DEFAULT_FIELD_NOTE_TEXT) {
    return voiceQualifies
      ? { rating: 2, reason: 'Default stamped text, but a voice note (5s+) covers the field note.' }
      : { rating: 0, reason: 'Default stamped text — not a real field note.' };
  }
  if (text.length < 10) {
    return voiceQualifies
      ? { rating: 2, reason: 'Field note is shorter than 10 characters, but a voice note (5s+) covers it.' }
      : { rating: 0, reason: 'Field note is shorter than 10 characters.' };
  }
  if (text.length >= 100) {
    return { rating: 3, reason: `Field note is ${text.length} characters — thoughtful.` };
  }
  return { rating: 2, reason: `Field note is ${text.length} characters — basic context.` };
}

/**
 * The action the AI suggestion leans toward. Both non-approval bands map to
 * request_info: a suggestion that does not bless an approve should never be
 * read as silent permission to approve.
 */
export function suggestedActionForAiSuggestion(
  recommendation: ProofRubricRecommendation,
): 'approve' | 'request_info' {
  if (recommendation === 'strong_approval_candidate' || recommendation === 'approve_with_judgment') {
    return 'approve';
  }
  return 'request_info';
}

function recommendationLabel(recommendation: ProofRubricRecommendation): string {
  switch (recommendation) {
    case 'strong_approval_candidate':
      return 'strong approval candidate';
    case 'approve_with_judgment':
      return 'approve with judgment';
    case 'needs_closer_review':
      return 'needs closer review';
    case 'likely_insufficient':
      return 'likely needs more proof';
  }
}

/**
 * Build the AI-suggested rubric for one queue entry, or explain why there
 * is no trustworthy suggestion. Reads only stored signals: the entry's
 * aiAnalysisResult / proofCheckResult, the linked proofReviews doc's
 * verification block, the stored field note, and the stored voice-note
 * duration. Fieldtrip Energy is never suggested (no AI signal exists).
 */
export function suggestAiRubric(entry: any): AiSuggestionResult {
  const analysis = extractAiAnalysis(entry);
  const trust = extractAiTrust(entry);
  const check = isTrustworthyAiAnalysis(analysis);
  if (!check.ok || !analysis) {
    return { available: false, reason: check.reason };
  }

  const confidence = normalizeAiConfidence(analysis.confidence);
  const missionMatchScore =
    analysis.missionMatchScore != null && Number.isFinite(Number(analysis.missionMatchScore))
      ? Number(analysis.missionMatchScore)
      : entry?.verification?.missionMatchScore != null && Number.isFinite(Number(entry.verification.missionMatchScore))
        ? Number(entry.verification.missionMatchScore)
        : null;

  const missionMatch = missionMatchCategory(missionMatchScore, analysis.detectedSubject ?? null);
  const proofClarity = proofClarityCategory(confidence);
  const authenticity = authenticityCategory(trust);
  const noteText = entry?.fieldNote ?? entry?.note ?? '';
  const voiceSeconds = entry?.voiceNoteDurationSec != null ? Number(entry.voiceNoteDurationSec) : null;
  const fieldNoteQuality = fieldNoteQualityCategory(
    noteText,
    Number.isFinite(voiceSeconds as number) ? (voiceSeconds as number) : null,
    entry?.voiceNotePresent === true,
  );

  const ratings = {
    missionMatch: missionMatch.rating,
    proofClarity: proofClarity.rating,
    authenticity: authenticity.rating,
    fieldNoteQuality: fieldNoteQuality.rating,
  };
  const reasons = {
    missionMatch: missionMatch.reason,
    proofClarity: proofClarity.reason,
    authenticity: authenticity.reason,
    fieldNoteQuality: fieldNoteQuality.reason,
  };

  // Weighted with Fieldtrip Energy held at the manual default (2): the
  // suggestion never speaks for it.
  const score = calculateProofRubricScore({
    ...ratings,
    fieldtripEnergy: DEFAULT_PROOF_RUBRIC_RATINGS.fieldtripEnergy,
  });

  const flagReasons: string[] = [];
  if (score.weightedScore < 60) {
    flagReasons.push(`Suggested score ${score.weightedScore}/100 is below 60 — check closely before approving.`);
  }
  const duplicateWarning = trust.duplicateWarning ? String(trust.duplicateWarning) : null;
  if (duplicateWarning) {
    flagReasons.push(`Duplicate flag: ${duplicateWarning.replace(/_/g, ' ')}.`);
  }
  const risk = trust.aiRiskScore == null ? null : Number(trust.aiRiskScore);
  if (risk != null && Number.isFinite(risk) && risk >= 60) {
    flagReasons.push(`AI risk score ${Math.round(risk)}/100 — suspicious.`);
  }

  const summary = `AI read: subject ${analysis.detectedSubject === true ? 'detected' : 'not detected'}`
    + `${confidence != null ? ` (${confidence.toFixed(2)} confidence)` : ''}`
    + `${missionMatchScore != null ? `, match ${Math.round(missionMatchScore)}/100` : ''}`
    + `${duplicateWarning ? ', duplicate flag' : ''}.`
    + ` Suggested ${score.weightedScore}/100 — ${recommendationLabel(score.recommendation)}.`;

  return {
    available: true,
    suggestion: {
      version: AI_SUGGESTION_VERSION,
      ratings,
      reasons,
      weightedScore: score.weightedScore,
      recommendation: score.recommendation,
      flagged: flagReasons.length > 0,
      flagReasons,
      summary,
      source: {
        modelUsed: analysis.modelUsed ?? null,
        detectedSubject: analysis.detectedSubject ?? null,
        confidence,
        missionMatchScore,
        duplicateWarning,
      },
    },
  };
}
