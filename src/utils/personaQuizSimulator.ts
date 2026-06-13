import { QUIZ_QUESTIONS, PERSONAS, TIE_BREAKER_PRIORITY } from '../data/personaQuiz';
import { assignFieldType, getScores } from '../logic/fieldTypeLogic';
import { FieldTypeId, FIELD_TYPES } from '../constants';
import { QuizQuestion, QuizAnswer } from '../types/quiz';
import { formatSafeDate } from '../lib/utils';

/**
 * Persona Quiz Simulator & Validator
 * For development-only simulation and integrity checking.
 */

// 1. validateQuestionIntegrity()
export function validateQuestionIntegrity() {
  console.group('🔍 Persona Quiz: Question Integrity Check');
  const errors: string[] = [];
  const validFieldTypes = ['captainClipboard', 'mallRat', 'elondra', 'mascota', 'theGobbler', 'bigfoot'];
  let totalAnswers = 0;

  QUIZ_QUESTIONS.forEach((q, qIndex) => {
    const qPrefix = `Question ${qIndex + 1} (${q.id || 'NO_ID'}):`;
    
    if (!q.id) errors.push(`${qPrefix} Missing unique ID.`);
    if (!q.prompt) errors.push(`${qPrefix} Missing prompt text.`);
    if (!q.answers || q.answers.length === 0) {
      errors.push(`${qPrefix} Has no answer options.`);
      return;
    }

    totalAnswers += q.answers.length;

    q.answers.forEach((a, aIndex) => {
      const aPrefix = `${qPrefix} Choice ${aIndex + 1} (${a.id || 'NO_ID'}):`;
      
      if (!a.id) errors.push(`${aPrefix} Missing ID.`);
      if (!a.text) errors.push(`${aPrefix} Missing text.`);
      
      if (!a.personaWeights || Object.keys(a.personaWeights).length === 0) {
        errors.push(`${aPrefix} Has empty or missing personaWeights.`);
      } else {
        Object.keys(a.personaWeights).forEach(personaId => {
          if (!validFieldTypes.includes(personaId)) {
            errors.push(`${aPrefix} Invalid field type weight detected: "${personaId}"`);
          }
          const weight = a.personaWeights[personaId as FieldTypeId];
          if (weight === undefined || weight === null) {
            errors.push(`${aPrefix} Weight for "${personaId}" is null or undefined.`);
          }
        });
      }
    });
  });

  const passed = errors.length === 0;
  if (passed) {
    console.log('%c✅ PASS: All questions meet integrity standards.', 'color: green; font-weight: bold;');
  } else {
    console.error(`❌ FAIL: ${errors.length} integrity issues found:`);
    errors.forEach(err => console.error(err));
  }
  console.groupEnd();
  
  return {
    passed,
    errors,
    questionCount: QUIZ_QUESTIONS.length,
    answerCount: totalAnswers
  };
}

// 2. validateQuizReachability()
export function validateQuizReachability() {
  console.group('🎯 Persona Quiz: Reachability & Fair Win States');
  const fieldTypes: FieldTypeId[] = ['captainClipboard', 'mallRat', 'elondra', 'mascota', 'theGobbler', 'bigfoot'];
  const reachable: Record<FieldTypeId, boolean> = {
    captainClipboard: false,
    mallRat: false,
    elondra: false,
    mascota: false,
    theGobbler: false,
    bigfoot: false,
    unclassified: false
  };

  // For each field type, try to construct a "perfect path"
  fieldTypes.forEach(target => {
    const perfectPath: Record<string, string> = {};
    
    QUIZ_QUESTIONS.forEach(q => {
      // Find the answer that gives the most points to this target
      let bestAnswer = q.answers[0];
      let maxWeight = -1;
      
      q.answers.forEach(a => {
        const w = (a.personaWeights[target] || 0) * q.weight;
        if (w > maxWeight) {
          maxWeight = w;
          bestAnswer = a;
        }
      });
      
      perfectPath[q.id] = bestAnswer.id;
    });

    const result = assignFieldType(perfectPath);
    if (result === target) {
      reachable[target] = true;
      console.log(`%c✔ Reachable: ${target} can win via optimized path.`, 'color: #4CAF50');
    } else {
      console.error(`%c✘ Unreachable: ${target} is impossible to win (Winner was ${result} even on optimized path). Check weights or tie-breakers.`, 'color: #F44336');
    }
  });

  const allReachable = fieldTypes.every(t => reachable[t]);
  console.groupEnd();
  return { allReachable, reachable };
}

// 3. runRandomPersonaSimulation(iterations)
export function runRandomPersonaSimulation(iterations: number = 1000) {
  console.group(`🎲 Persona Quiz Simulation: ${iterations} Random Trials`);
  const winCounts: Record<FieldTypeId | string, number> = {
    captainClipboard: 0,
    mallRat: 0,
    elondra: 0,
    mascota: 0,
    theGobbler: 0,
    bigfoot: 0,
    unclassified: 0
  };

  for (let i = 0; i < iterations; i++) {
    const randomAnswers: Record<string, string> = {};
    QUIZ_QUESTIONS.forEach(q => {
      const randomIndex = Math.floor(Math.random() * q.answers.length);
      randomAnswers[q.id] = q.answers[randomIndex].id;
    });

    const winner = assignFieldType(randomAnswers, `sim-user-${i}`);
    winCounts[winner]++;
  }

  const results = Object.entries(winCounts).map(([type, count]) => ({
    type,
    count,
    frequency: ((count / iterations) * 100).toFixed(1) + '%'
  })).sort((a, b) => b.count - a.count);

  console.table(results);

  // Health checks
  const warnings: string[] = [];
  const playableResults = results.filter(r => r.type !== 'unclassified');
  const maxFreq = Math.max(...playableResults.map(r => parseFloat(r.frequency)));
  const minFreq = Math.min(...playableResults.map(r => parseFloat(r.frequency)));

  if (maxFreq > 40) {
    const msg = `⚠️ BIAS DETECTED: ${playableResults[0].type} is dominating with ${maxFreq}% wins.`;
    console.warn(msg);
    warnings.push(msg);
  }
  if (minFreq < 5) {
    const msg = `⚠️ RARITY DETECTED: ${playableResults[playableResults.length - 1].type} is critically rare with only ${minFreq}% wins.`;
    console.warn(msg);
    warnings.push(msg);
  }

  console.groupEnd();
  return { results, warnings };
}

// 4. testFieldTypePath(fieldType)
export function testFieldTypePath(targetType: FieldTypeId) {
  console.group(`🛠️ Persona Quiz: Testing Path for [${targetType.toUpperCase()}]`);
  
  if (!FIELD_TYPES[targetType]) {
    console.error(`Invalid Field Type: ${targetType}`);
    console.groupEnd();
    return { winner: 'invalid', success: false };
  }

  const optimizedPath: Record<string, string> = {};
  const logs: any[] = [];

  QUIZ_QUESTIONS.forEach(q => {
    let bestAnswer = q.answers[0];
    let maxWeight = -1;
    
    q.answers.forEach(a => {
      const w = (a.personaWeights[targetType] || 0) * q.weight;
      if (w > maxWeight) {
        maxWeight = w;
        bestAnswer = a;
      }
    });

    optimizedPath[q.id] = bestAnswer.id;
    logs.push({
      Question: q.prompt.substring(0, 30) + '...',
      ChosenAnswer: bestAnswer.text,
      Weight: bestAnswer.personaWeights[targetType]
    });
  });

  const winner = assignFieldType(optimizedPath);
  const scores = getScores(optimizedPath);

  console.log(`Target: ${targetType}`);
  console.log(`Winner: ${winner}`);
  console.log(`Scores:`, scores);
  console.table(logs);

  const success = winner === targetType;
  if (success) {
    console.log(`%cSUCCESS: The optimized path correctly resulted in ${targetType}.`, 'color: green; font-weight: bold;');
  } else {
    console.error(`FAILURE: The optimized path resulted in ${winner} instead of ${targetType}. Check tie-breaker logic.`);
  }

  console.groupEnd();
  return { winner, scores, success };
}

export interface AuditSummary {
  timestamp: string;
  integrity: {
    passed: boolean;
    errors: string[];
    questionCount: number;
    answerCount: number;
  };
  reachability: {
    allReachable: boolean;
    reachable: Record<FieldTypeId, boolean>;
  };
  simulation: {
    iterations: number;
    results: { type: string; count: number; frequency: string }[];
  };
  warnings: string[];
  verdict: 'PASS' | 'WARNING' | 'FAIL';
}

/**
 * Convenience runner for all simulation suites
 */
export function runFullPersonaAudit(): AuditSummary {
  console.log('%c--- BUREAU PERSONA AUDIT INITIALIZING ---', 'background: #000; color: #fbbf24; padding: 4px 8px; font-weight: bold;');
  const integrity = validateQuestionIntegrity();
  const reachability = validateQuizReachability();
  const iterations = 5000;
  const sim = runRandomPersonaSimulation(iterations);
  
  const fieldTypes: FieldTypeId[] = ['captainClipboard', 'mallRat', 'elondra', 'mascota', 'theGobbler', 'bigfoot'];
  const testResults = fieldTypes.map(t => ({ type: t, ...testFieldTypePath(t) }));
  
  const allWarnings = [...sim.warnings];
  if (!integrity.passed) allWarnings.push('Integrity check failed: ' + integrity.errors[0]);
  if (!reachability.allReachable) allWarnings.push('Some field types are unreachable via optimized paths.');
  
  let verdict: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  if (!integrity.passed || !reachability.allReachable) verdict = 'FAIL';
  else if (allWarnings.length > 0) verdict = 'WARNING';

  console.log('%c--- AUDIT COMPLETE ---', 'background: #000; color: #4ade80; padding: 4px 8px; font-weight: bold;');

  return {
    timestamp: formatSafeDate(new Date()),
    integrity,
    reachability,
    simulation: {
      iterations,
      results: sim.results
    },
    warnings: allWarnings,
    verdict
  };
}

