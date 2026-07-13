import assert from 'node:assert/strict';
import test from 'node:test';
import { QUIZ_QUESTIONS, TIE_BREAKER_PRIORITY } from '../data/personaQuiz';
import { assignFieldType, getPrimaryFieldType, getScores } from '../logic/fieldTypeLogic';
import { resolveOnboardingDestination } from '../logic/onboardingFlow';

test('classification quiz has exactly three questions with six 3+1 answers each', () => {
  assert.equal(QUIZ_QUESTIONS.length, 3);

  for (const question of QUIZ_QUESTIONS) {
    assert.equal(question.answers.length, 6, question.id);
    for (const answer of question.answers) {
      const weights = Object.values(answer.personaWeights).sort((left, right) => Number(left) - Number(right));
      assert.deepEqual(weights, [1, 3], answer.id);
      assert.equal(Object.values(answer.personaWeights).filter(weight => weight === 3).length, 1, answer.id);
      assert.equal(Object.values(answer.personaWeights).filter(weight => weight === 1).length, 1, answer.id);
    }
  }
});

test('every Explorer Type is reachable through a primary-answer path', () => {
  for (const fieldType of TIE_BREAKER_PRIORITY) {
    const answers = Object.fromEntries(QUIZ_QUESTIONS.map(question => {
      const matchingAnswer = question.answers.find(answer => answer.personaWeights[fieldType] === 3);
      assert.ok(matchingAnswer, `${fieldType} needs a primary answer in ${question.id}`);
      return [question.id, matchingAnswer.id];
    }));

    assert.equal(assignFieldType(answers), fieldType);
  }
});

test('Question 3 primary resolves a tied highest score', () => {
  const answers = {
    q1: 'q1-a1', // mallRat 3, bigfoot 1
    q2: 'q2-a2', // mascota 3, mallRat 1
    q3: 'q3-a3'  // bigfoot 3, mascota 1
  };
  const scores = getScores(answers);

  assert.equal(scores.mallRat, 4);
  assert.equal(scores.mascota, 4);
  assert.equal(scores.bigfoot, 4);
  assert.equal(getPrimaryFieldType('q3', answers.q3), 'bigfoot');
  assert.equal(assignFieldType(answers), 'bigfoot');
});

test('Question 1 primary resolves a tie when Question 3 primary is not tied for first', () => {
  const answers = {
    q1: 'q1-a4', // captainClipboard 3, mallRat 1
    q2: 'q2-a1', // mallRat 3, captainClipboard 1
    q3: 'q3-a5'  // elondra 3, theGobbler 1
  };
  const scores = getScores(answers);

  assert.equal(scores.captainClipboard, 4);
  assert.equal(scores.mallRat, 4);
  assert.equal(getPrimaryFieldType('q3', answers.q3), 'elondra');
  assert.equal(getPrimaryFieldType('q1', answers.q1), 'captainClipboard');
  assert.equal(assignFieldType(answers), 'captainClipboard');
});

test('all complete response combinations are deterministic and classified', () => {
  for (const first of QUIZ_QUESTIONS[0].answers) {
    for (const second of QUIZ_QUESTIONS[1].answers) {
      for (const third of QUIZ_QUESTIONS[2].answers) {
        const answers = { q1: first.id, q2: second.id, q3: third.id };
        const withoutSeed = assignFieldType(answers);
        const scores = getScores(answers);
        const maxScore = Math.max(...TIE_BREAKER_PRIORITY.map(type => scores[type]));
        const tiedTypes = TIE_BREAKER_PRIORITY.filter(type => scores[type] === maxScore);
        if (tiedTypes.length > 1) {
          const questionThreePrimary = getPrimaryFieldType('q3', third.id);
          const questionOnePrimary = getPrimaryFieldType('q1', first.id);
          const expectedTieWinner = questionThreePrimary && tiedTypes.includes(questionThreePrimary)
            ? questionThreePrimary
            : questionOnePrimary;
          assert.ok(expectedTieWinner && tiedTypes.includes(expectedTieWinner), 'every valid tie must resolve through Question 3 or Question 1');
          assert.equal(withoutSeed, expectedTieWinner);
        }
        assert.notEqual(withoutSeed, 'unclassified');
        assert.equal(assignFieldType(answers, 'user-a'), withoutSeed);
        assert.equal(assignFieldType(answers, 'user-b'), withoutSeed);
      }
    }
  }
});

test('changing an answer replaces its score instead of accumulating it', () => {
  const initial = getScores({ q1: 'q1-a1' });
  const changed = getScores({ q1: 'q1-a4' });

  assert.equal(initial.mallRat, 3);
  assert.equal(changed.mallRat, 1);
  assert.equal(changed.captainClipboard, 3);
  assert.equal(changed.bigfoot, 0);
});

test('partial or empty answers never mark classification complete in scoring logic', () => {
  assert.equal(assignFieldType({}), 'unclassified');
  assert.equal(Object.values(getScores({})).reduce((total, score) => total + score, 0), 0);
});

test('onboarding destinations preserve new, returning, and completed user behavior', () => {
  const baseState = {
    hasConfirmedLegal: true,
    fieldClassificationComplete: false,
    hasSeenFieldTypeResults: false,
    onboardingCompleted: false,
    starterApprovedCount: 0
  };

  assert.equal(resolveOnboardingDestination({ ...baseState, hasConfirmedLegal: false }), '/');
  assert.equal(resolveOnboardingDestination(baseState), '/classification');
  assert.equal(resolveOnboardingDestination({ ...baseState, fieldClassificationComplete: true }), '/field-type');
  assert.equal(resolveOnboardingDestination({
    ...baseState,
    fieldClassificationComplete: true,
    hasSeenFieldTypeResults: true
  }), '/missions');
  assert.equal(resolveOnboardingDestination({
    ...baseState,
    fieldClassificationComplete: true,
    hasSeenFieldTypeResults: true,
    onboardingCompleted: true,
    starterApprovedCount: 3
  }), '/basecamp');
});
