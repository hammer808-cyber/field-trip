import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CompanionAvatar,
  resolveCompanionMotion,
  type CompanionMood,
} from '../components/CompanionAvatar';
import { BasecampCompanionBlock } from '../components/basecamp/BasecampCompanionBlock';
import { TrevorGuideView } from '../components/TrevorGuideView';
import { FIELD_TYPES, type FieldTypeId } from '../constants/fieldTypes';
import type { TrevorContext } from '../services/trevorContextService';
import {
  getTrevorRecommendation,
  type ResolvedTrevorRecommendation,
} from '../services/trevorRecommendationEngine';

const PERSONAS: FieldTypeId[] = [
  'captainClipboard',
  'mallRat',
  'mascota',
  'elondra',
  'theGobbler',
  'bigfoot',
];

function context(overrides: Partial<TrevorContext> = {}): TrevorContext {
  return {
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
    nearbyDeckIds: [],
    crewUnlocked: true,
    crewHasOpenTasks: false,
    votingPhase: 'submission',
    hasVotedThisCycle: false,
    profileCompleteness: 100,
    missingProfileFields: [],
    recentProofTypes: ['photo', 'note'],
    zineContentGaps: [],
    ...overrides,
  };
}

function recommendation(overrides: Partial<TrevorContext> = {}): ResolvedTrevorRecommendation {
  const result = getTrevorRecommendation(context(overrides));
  if (!result) throw new Error('Expected Trevor recommendation fixture');
  return result;
}

const noop = () => undefined;

function viewProps(overrides: Partial<TrevorContext> = {}, fieldType: FieldTypeId | null = 'mascota') {
  return {
    recommendation: recommendation(overrides),
    message: 'Pick the useful next move.',
    isExpanded: true as const,
    hasNewState: false,
    onOpen: noop,
    onCollapse: noop,
    onAction: noop,
    onSuppress: noop,
    fieldType,
  };
}

test('companion renders the correct avatar art for all six personas', () => {
  for (const id of PERSONAS) {
    const type = FIELD_TYPES[id];
    const html = renderToStaticMarkup(<CompanionAvatar fieldType={id} />);
    assert.ok(html.includes(type.avatarPath), `${id} avatarPath`);
    assert.ok(html.includes(`${type.name} companion`), `${id} alt text`);
    assert.ok(html.includes('data-testid="companion-avatar"'), `${id} testid`);
    assert.doesNotMatch(html, /full\.png/);
    assert.doesNotMatch(html, /card\.png/);
  }
});

test('companion renders nothing when unclassified, null, or without a provider', () => {
  assert.equal(renderToStaticMarkup(<CompanionAvatar fieldType={null} />), '');
  assert.equal(renderToStaticMarkup(<CompanionAvatar fieldType="unclassified" />), '');
  // No fieldType prop and no AppProvider: useApp throws, the companion
  // degrades to nothing instead of crashing the view.
  assert.equal(renderToStaticMarkup(<CompanionAvatar />), '');
});

test('companion sizes render fixed containers', () => {
  assert.match(renderToStaticMarkup(<CompanionAvatar fieldType="mascota" size="small" />), /h-8 w-8/);
  assert.match(renderToStaticMarkup(<CompanionAvatar fieldType="mascota" size="large" />), /h-10 w-10/);
  assert.match(renderToStaticMarkup(<CompanionAvatar fieldType="mascota" size="spotlight" />), /h-16 w-16/);
});

test('companion motion: moods map to loops, pop to entrance, reduced motion to static', () => {
  const moods: CompanionMood[] = ['idle', 'pop', 'celebrate', 'warn'];
  for (const mood of moods) {
    const resolved = resolveCompanionMotion(mood, 'none', false);
    assert.equal(resolved.entrance === null, mood !== 'pop', `${mood} entrance`);
    assert.equal(resolved.loop === null, mood === 'pop', `${mood} loop`);
    const reduced = resolveCompanionMotion(mood, 'pop', true);
    assert.equal(reduced.entrance, null, `${mood} reduced entrance`);
    assert.equal(reduced.loop, null, `${mood} reduced loop`);
  }
  const idle = resolveCompanionMotion('idle', 'none', false);
  assert.deepEqual((idle.loop?.animate as { y: number[] }).y, [0, -4, 0]);
  assert.equal(idle.loop?.transition.repeat, Infinity);
  const celebrate = resolveCompanionMotion('celebrate', 'none', false);
  assert.deepEqual((celebrate.loop?.animate as { y: number[] }).y, [0, -10, 0, -6, 0]);
  assert.equal(celebrate.loop?.transition.repeat, 1);
  const warn = resolveCompanionMotion('warn', 'none', false);
  assert.deepEqual((warn.loop?.animate as { x: number[] }).x, [0, -3, 3, -3, 0]);
  assert.equal(warn.loop?.transition.repeat, undefined);
  const pop = resolveCompanionMotion('pop', 'none', false);
  assert.deepEqual(pop.entrance?.initial, { scale: 0.6, opacity: 0 });
  assert.deepEqual(pop.entrance?.animate, { scale: 1, opacity: 1 });
  const panelEntrance = resolveCompanionMotion('idle', 'pop', false);
  assert.ok(panelEntrance.entrance !== null, 'panel pop entrance');
  assert.ok(panelEntrance.loop !== null, 'panel idle loop still applies');
});

test('Trevor panel companion mood follows the recommendation tone', () => {
  const cases: Array<{ overrides: Partial<TrevorContext>; mood: string; tone: string }> = [
    {
      overrides: { hasUnseenStarterUnlock: true, experienceStage: 'new_explorer' },
      mood: 'celebrate',
      tone: 'celebration',
    },
    { overrides: { needsMoreProofCount: 1 }, mood: 'warn', tone: 'warning' },
    { overrides: {}, mood: 'idle', tone: 'normal' },
  ];
  for (const { overrides, mood, tone } of cases) {
    const props = viewProps(overrides);
    assert.equal(props.recommendation.tone ?? 'normal', tone, tone);
    const html = renderToStaticMarkup(<TrevorGuideView {...props} />);
    assert.ok(html.includes(`data-companion-mood="${mood}"`), `${tone} -> ${mood}`);
    assert.ok(html.includes('/assets/characters/mascota/avatar.png'), `${tone} companion art`);
  }
});

test('Trevor launcher shows the duo only when classified', () => {
  const collapsed = (fieldType: FieldTypeId | null) => renderToStaticMarkup(
    <TrevorGuideView
      recommendation={recommendation()}
      message="Systems nominal."
      isExpanded={false}
      hasNewState={false}
      onOpen={noop}
      onCollapse={noop}
      onAction={noop}
      onSuppress={noop}
      fieldType={fieldType}
    />,
  );
  const withCompanion = collapsed('mascota');
  assert.ok(withCompanion.includes('/assets/characters/mascota/avatar.png'), 'duo has companion');
  assert.ok(withCompanion.includes('api.dicebear.com'), 'duo keeps Trevor');
  assert.equal((withCompanion.match(/<img/g) || []).length, 2, 'duo renders two avatars');
  // Regression (Nov 20, 2026): TrevorAvatar's span must be `block` with its
  // size classes. When the duo wrapped it in a plain span it went back to
  // inline, h-8/w-8 stopped applying, and the DiceBear SVG rendered at its
  // intrinsic size (~350px) over the page. The companion's span is `block`
  // too, for the same reason.
  assert.ok(
    withCompanion.includes('block shrink-0 overflow-hidden rounded-full border-2 border-on-surface bg-brand-cyan h-8 w-8'),
    'Trevor avatar is block-sized in the launcher',
  );
  assert.ok(
    withCompanion.includes('block shrink-0 overflow-hidden rounded-full border-2 border-on-surface bg-white h-8 w-8'),
    'companion avatar is block-sized in the launcher',
  );
  assert.equal((withCompanion.match(/aria-label="Open Trevor guide"/g) || []).length, 1);

  const withoutCompanion = collapsed(null);
  assert.doesNotMatch(withoutCompanion, /companion-avatar/);
  assert.equal((withoutCompanion.match(/<img/g) || []).length, 1, 'unclassified keeps Trevor alone');
  assert.ok(withoutCompanion.includes('api.dicebear.com'), 'Trevor still there');
});

test('Trevor panel without a persona is exactly as before', () => {
  const html = renderToStaticMarkup(<TrevorGuideView {...viewProps({}, null)} />);
  assert.doesNotMatch(html, /companion-avatar/);
  assert.equal((html.match(/role="dialog"/g) || []).length, 1);
  assert.match(html, /Trevor \/\/ Field guide/);
});

test('Basecamp companion block shows name, short label, and vibe — hidden when unclassified', () => {
  const html = renderToStaticMarkup(
    <BasecampCompanionBlock fieldType="mascota" onOpen={noop} />,
  );
  assert.ok(html.includes('Mascota — Hype Beast'), 'name and short label');
  assert.ok(html.includes('Performative, Energetic, Kitschy'), 'vibe line');
  assert.ok(html.includes('/assets/characters/mascota/avatar.png'), 'spotlight art');
  // The block takes onOpen as a callback; the destination itself
  // ('/profile?tab=overview') is wired in Basecamp.tsx.
  assert.ok(html.includes('Open your explorer type on your profile'), 'opens the profile field-type section');
  assert.equal(renderToStaticMarkup(<BasecampCompanionBlock fieldType={null} onOpen={noop} />), '');
  assert.equal(
    renderToStaticMarkup(<BasecampCompanionBlock fieldType="unclassified" onOpen={noop} />),
    '',
  );
});
