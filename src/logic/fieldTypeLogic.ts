import { FieldTypeId } from '../constants';
import { QUIZ_QUESTIONS, TIE_BREAKER_PRIORITY } from '../data/personaQuiz';
import { QuizScore } from '../types/quiz';

/**
 * Assigns a field type based on quiz answers.
 * Uses weighted scoring from personaQuiz data and respects tie-breaker priority.
 */
export function assignFieldType(answers: Record<string, string>, seed?: string): FieldTypeId {
  const scores: QuizScore = {
    captainClipboard: 0,
    mallRat: 0,
    mascota: 0,
    elondra: 0,
    theGobbler: 0,
    bigfoot: 0,
    unclassified: 0
  };

  const selectedAnswers: { qId: string; answerId: string; timestamp: number }[] = [];
  let index = 0;
  let answeredCount = 0;

  QUIZ_QUESTIONS.forEach(q => {
    const selectedAnswerId = answers[q.id];
    if (!selectedAnswerId) {
      index++;
      return;
    }

    answeredCount++;
    selectedAnswers.push({ qId: q.id, answerId: selectedAnswerId, timestamp: index });
    const answer = q.answers.find(a => a.id === selectedAnswerId);
    if (answer) {
      Object.entries(answer.personaWeights).forEach(([personaId, weight]) => {
        if (personaId in scores) {
          scores[personaId as keyof QuizScore] += (weight || 0) * q.weight;
        }
      });
    }
    index++;
  });

  // If no answers provided, return unclassified
  if (answeredCount === 0) {
    return 'unclassified';
  }

  // Find winner(s)
  let maxScore = -1;
  let winners: FieldTypeId[] = [];

  Object.entries(scores).forEach(([id, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winners = [id as FieldTypeId];
    } else if (score === maxScore && score > 0) {
      // Only include as winner if score > 0
      winners.push(id as FieldTypeId);
    }
  });

  // If still no winners (all scores zero despite answeredCount > 0)
  if (winners.length === 0) {
    return 'unclassified';
  }

  // Handle tie or single winner
  if (winners.length === 1) {
    return winners[0];
  }

  // Tie breaker 1: Choice that appeared most recently as a PRIMARY score (+2)
  // We'll iterate backwards through answers to find which winner was a primary choice last
  for (let i = selectedAnswers.length - 1; i >= 0; i--) {
    const selection = selectedAnswers[i];
    const question = QUIZ_QUESTIONS.find(q => q.id === selection.qId);
    const answer = question?.answers.find(a => a.id === selection.answerId);
    
    if (answer) {
      // Find the primary type for this answer (+2)
      const primaryEntry = Object.entries(answer.personaWeights).find(([_, weight]) => weight === 2);
      if (primaryEntry && winners.includes(primaryEntry[0] as FieldTypeId)) {
        return primaryEntry[0] as FieldTypeId;
      }
    }
  }

  // Final deterministic but user-specific tie-breaker when still tied
  // Construct a stable string based on answer inputs and optional seed
  const answerString = Object.keys(answers)
    .sort()
    .map(k => `${k}:${answers[k]}`)
    .join(',') + (seed ? `:${seed}` : '');

  // DJB2 hash of the answer pattern + seed
  let hash = 5381;
  for (let i = 0; i < answerString.length; i++) {
    hash = (hash * 33) ^ answerString.charCodeAt(i);
  }
  const absoluteHash = Math.abs(hash);

  const fallbackPriority: FieldTypeId[] = [
    'captainClipboard',
    'mallRat',
    'mascota',
    'elondra',
    'theGobbler',
    'bigfoot'
  ];

  // Pull only tied winners in fallbackPriority order to ensure stable order
  const sortedWinners = fallbackPriority.filter(p => winners.includes(p));

  // Exclude unclassified from tie-breaks just in case
  const filteredWinners = sortedWinners.filter(w => w !== 'unclassified');
  if (filteredWinners.length > 0) {
    return filteredWinners[absoluteHash % filteredWinners.length];
  }

  return sortedWinners[0] || winners[0];
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
