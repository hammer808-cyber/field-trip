import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QUIZ_QUESTIONS, TIE_BREAKER_PRIORITY } from '../data/personaQuiz';
import { FIELD_TYPES } from '../constants/fieldTypes';
import { assignFieldType } from '../logic/fieldTypeLogic';
import { TrevorGuideView } from '../components/TrevorGuideView';
import { getTrevorRecommendation } from '../services/trevorRecommendationEngine';
import type { TrevorContext } from '../services/trevorContextService';

// --- Quiz plain layer (Oct 21, 2026 onboarding simplification) ---
// The rule: every question gets a plain headline, every answer gets a short
// plain lead, and NOTHING about the original wording or scoring changes —
// the leads are a scan layer on top of Zach's copy, never a replacement.

test('every quiz question has a short plain headline and keeps its Trevor line', () => {
  for (const question of QUIZ_QUESTIONS) {
    assert.ok(question.plainHeadline, `${question.id} needs a plainHeadline`);
    assert.ok(question.plainHeadline!.length <= 60, `${question.id} headline too long`);
    assert.notEqual(question.plainHeadline, question.prompt, `${question.id} headline must not just copy the flavor prompt`);
    assert.ok(question.trevorVoice || question.stickyNote, `${question.id} lost its Trevor line`);
  }
});

test('every quiz answer has a short plain lead, original text untouched', () => {
  for (const question of QUIZ_QUESTIONS) {
    for (const answer of question.answers) {
      assert.ok(answer.shortLead, `${answer.id} needs a shortLead`);
      assert.ok(answer.shortLead!.split(' ').length <= 5, `${answer.id} lead too long: ${answer.shortLead}`);
      assert.notEqual(answer.shortLead, answer.text, `${answer.id} lead must not replace the original text`);
      assert.ok(answer.text.length > answer.shortLead!.length, `${answer.id} original flavor text should stay the longer line`);
    }
  }
  // Spot-check one original answer survives verbatim.
  const q1a1 = QUIZ_QUESTIONS[0].answers.find(a => a.id === 'q1-a1');
  assert.equal(q1a1?.text, 'The snack spot. I need to know what the regulars know.');
});

test('scoring is unchanged: every Explorer Type still reachable by its primary path', () => {
  for (const fieldType of TIE_BREAKER_PRIORITY) {
    const answers = Object.fromEntries(QUIZ_QUESTIONS.map(question => {
      const match = question.answers.find(answer => answer.personaWeights[fieldType] === 3);
      assert.ok(match, `${fieldType} needs a primary answer in ${question.id}`);
      return [question.id, match.id];
    }));
    assert.equal(assignFieldType(answers), fieldType);
  }
});

test('scoring sweep: all 216 answer combinations resolve to a real type, never unclassified-by-accident', () => {
  const ids = QUIZ_QUESTIONS.map(q => q.answers.map(a => a.id));
  let combos = 0;
  for (const a of ids[0]) for (const b of ids[1]) for (const c of ids[2]) {
    const result = assignFieldType({ q1: a, q2: b, q3: c });
    assert.ok((TIE_BREAKER_PRIORITY as string[]).includes(result), `combo ${a}/${b}/${c} -> ${result}`);
    combos++;
  }
  assert.equal(combos, 216);
});

// --- Result page plain lead ---

test('every Explorer Type has a plain summary for the result page lead', () => {
  for (const [id, type] of Object.entries(FIELD_TYPES)) {
    assert.ok(type.plainSummary, `${id} needs a plainSummary`);
    assert.ok(type.plainSummary!.length <= 130, `${id} plainSummary too long`);
    assert.notEqual(type.plainSummary, type.description, `${id} plainSummary must not copy the flavor description`);
  }
});

// --- Trevor panel: permanent opt-out renders only when wired ---

function trevorFixture() {
  // Same known-good context shape as trevorGuide.test.tsx.
  const context: TrevorContext = {
    userId: 'guide-user',
    currentRoute: '/basecamp',
    explorerType: 'mallRat',
    legalComplete: true,
    fieldClassificationComplete: true,
    onboardingComplete: true,
    experienceStage: 'established_explorer',
    starterApprovedCount: 3,
    starterRequiredCount: 3,
    starterSubmittedCount: 3,
    starterComplete: true,
    hasUnseenStarterUnlock: false,
    level: 5,
    levelTitle: 'Licensed Side-Quester',
    currentXp: 2000,
    xpForNextLevel: 900,
    xpToNextLevel: 700,
    levelProgressPercent: 22,
    pendingProofCount: 0,
    needsMoreProofCount: 0,
    approvedProofCount: 10,
    accessibleDeckIds: ['heatwave-receipts'],
    recentlyUsedDeckIds: ['heatwave-receipts'],
    recommendedDeckId: 'heatwave-receipts',
    crewUnlocked: true,
    crewHasOpenTasks: false,
    votingPhase: 'submission',
    hasVotedThisCycle: false,
    profileCompleteness: 100,
    missingProfileFields: [],
    recentProofTypes: ['photo', 'note'],
    zineContentGaps: [],
  };
  const rec = getTrevorRecommendation(context);
  assert.ok(rec, 'expected a Trevor recommendation fixture');
  return rec!;
}

const noop = () => undefined;

test('expanded Trevor panel shows "Stop showing these tips" only when onDisable is provided', () => {
  const rec = trevorFixture();
  const withDisable = renderToStaticMarkup(
    React.createElement(TrevorGuideView, {
      recommendation: rec, message: 'Do the thing.', isExpanded: true, hasNewState: false,
      onOpen: noop, onCollapse: noop, onAction: noop, onSuppress: noop, onDisable: noop,
    }),
  );
  assert.match(withDisable, /Stop showing these tips/);
  assert.match(withDisable, /Hide for this session/);

  const withoutDisable = renderToStaticMarkup(
    React.createElement(TrevorGuideView, {
      recommendation: rec, message: 'Do the thing.', isExpanded: true, hasNewState: false,
      onOpen: noop, onCollapse: noop, onAction: noop, onSuppress: noop,
    }),
  );
  assert.doesNotMatch(withoutDisable, /Stop showing these tips/);
  // Default view never steals focus: the focus prop defaults off, and the
  // panel source must opt in explicitly (container passes user-open only).
  assert.match(withoutDisable, /Hide for this session/);
});
