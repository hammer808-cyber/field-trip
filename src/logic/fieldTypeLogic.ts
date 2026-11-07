import { FieldTypeId } from '../constants';
import { QUIZ_QUESTIONS, TIE_BREAKER_PRIORITY } from '../data/personaQuiz';
import { QuizScore } from '../types/quiz';

/**
 * Assigns a field type based on quiz answers.
 * Uses the canonical three-question scoring model. The optional seed remains in
 * the signature for legacy callers, but no longer influences the result.
 */
export function assignFieldType(answers: Record<string, string>, _legacySeed?: string): FieldTypeId {
  const scores = getScores(answers);
  const answeredCount = QUIZ_QUESTIONS.filter(question => answers[question.id]).length;

  if (answeredCount === 0) {
    return 'unclassified';
  }

  const playableTypes = TIE_BREAKER_PRIORITY;
  const maxScore = Math.max(...playableTypes.map(type => scores[type]));
  const winners = playableTypes.filter(type => scores[type] === maxScore && maxScore > 0);

  if (winners.length === 0) {
    return 'unclassified';
  }
  if (winners.length === 1) {
    return winners[0];
  }

  // Canonical tie-break order: Question 3 primary, then Question 1 primary.
  for (const questionId of ['q3', 'q1']) {
    const primary = getPrimaryFieldType(questionId, answers[questionId]);
    if (primary && winners.includes(primary)) {
      return primary;
    }
  }

  // Defensive deterministic fallback for malformed legacy answer maps.
  return TIE_BREAKER_PRIORITY.find(type => winners.includes(type)) || winners[0];
}

export function getPrimaryFieldType(questionId: string, answerId?: string): FieldTypeId | null {
  if (!answerId) return null;
  const question = QUIZ_QUESTIONS.find(item => item.id === questionId);
  const answer = question?.answers.find(item => item.id === answerId);
  const primaryEntry = answer
    ? Object.entries(answer.personaWeights).find(([, weight]) => weight === 3)
    : undefined;
  return primaryEntry ? primaryEntry[0] as FieldTypeId : null;
}

export function getScores(answers: Record<string, string>): QuizScore {
  const scores: QuizScore = {
    captainClipboard: 0,
    mallRat: 0,
    mascota: 0,
    elondra: 0,
    theGobbler: 0,
    bigfoot: 0,
    unclassified: 0
  };

  QUIZ_QUESTIONS.forEach(q => {
    const selectedAnswerId = answers[q.id];
    if (!selectedAnswerId) return;

    const answer = q.answers.find(a => a.id === selectedAnswerId);
    if (answer) {
      Object.entries(answer.personaWeights).forEach(([personaId, weight]) => {
        if (personaId in scores) {
          scores[personaId as keyof QuizScore] += (weight || 0) * q.weight;
        }
      });
    }
  });

  return scores;
}
