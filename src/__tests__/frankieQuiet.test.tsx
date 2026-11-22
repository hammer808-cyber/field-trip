/**
 * Frankie quiet mode (Nov 21, 2026, Option B): Simple Words does not
 * only swap hard words for easy ones — it also hides secondary text,
 * so the page has fewer words and less clutter. `FrankieQuiet` renders
 * its children only when Frankie Mode is OFF; each surface below pins
 * its own hides by name, so a later edit cannot silently re-show
 * secondary text in Frankie mode.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FrankieQuiet } from '../components/FrankieQuiet';
import { PLAIN_CARD_COPY } from '../data/plainCardCopy';

const read = (rel: string) => readFileSync(rel, 'utf8');

test('FrankieQuiet renders its children when Simple Words is off', () => {
  const html = renderToStaticMarkup(
    <FrankieQuiet frankieMode={false}>
      <p>Helper line</p>
    </FrankieQuiet>,
  );
  assert.ok(html.includes('Helper line'), `children did not render when off: ${html}`);
});

test('FrankieQuiet renders nothing when Simple Words is on', () => {
  const html = renderToStaticMarkup(
    <FrankieQuiet frankieMode={true}>
      <p>Helper line</p>
    </FrankieQuiet>,
  );
  assert.equal(html, '', `FrankieQuiet rendered in Frankie mode: ${html}`);
});

test('plain descriptions stay one short sentence (max 30 words)', () => {
  for (const [id, copy] of Object.entries(PLAIN_CARD_COPY)) {
    const words = copy.plainDescription.trim().split(/\s+/).filter(Boolean);
    assert.ok(
      words.length <= 30,
      `${id}: plainDescription has ${words.length} words: "${copy.plainDescription}"`,
    );
  }
});

test('plain directions stay at most 3 short steps', () => {
  for (const [id, copy] of Object.entries(PLAIN_CARD_COPY)) {
    const steps = copy.plainDirections.split('\n').filter(Boolean);
    assert.ok(steps.length <= 3, `${id}: plainDirections has ${steps.length} steps`);
    for (const step of steps) {
      assert.ok(
        step.trim().split(/\s+/).length <= 20,
        `${id}: direction step too long: "${step}"`,
      );
    }
  }
});

test('MissionBriefing hides the Objective box, Lane/Reward tiles, eyebrow, chip, and save hint', () => {
  const src = read('src/pages/MissionBriefing.tsx');
  assert.ok(src.includes("import { FrankieQuiet } from '../components/FrankieQuiet'"), 'no FrankieQuiet import');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,800}The Objective/, 'Objective box not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,2000}Reward/, 'Lane/Reward tiles not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,200}Mission briefing/, 'eyebrow not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,400}Field Ready/, 'Field Ready chip not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,200}SAVE_FOR_LATER_RECOVERY_HINT/, 'save hint not quiet');
});

test('ChallengeCard hides the WHY IT IS FUN box and the WHERE IT GOES half', () => {
  const src = read('src/components/ChallengeCard.tsx');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,400}WHY IT'S FUN/, 'WHY IT IS FUN box not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,400}WHERE IT GOES/, 'WHERE IT GOES half not quiet');
  assert.ok(src.includes('+{baseXP} PTS'), 'the +PTS chip must stay visible');
});

test('FieldClipboard hides Trevor’s Take, the bonus description, step helpers, and submit helpers', () => {
  const src = read('src/components/FieldClipboard.tsx');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}Trevor's Take/, 'Trevor’s Take not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}appliedBonus\.description/, 'bonus description not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}Spot something that fits the mission/, 'Find-it helper not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}Take one clear proof photo/, 'Snap-it helper not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}Add a short field note explaining the moment/, 'Say-why helper not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}Tap one, or write your own/, 'note-chip helper not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}Your photo can appear in the weekly vote/, 'share helper not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}Setting up this mission before the camera opens/, 'camera setup helper not quiet');
});

test('MissionResultCard hides the math breakdown, evidence chips, footer repeat, and receipt meta', () => {
  const src = read('src/components/MissionResultCard.tsx');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}showMathWizard/, 'math breakdown not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,600}UPLINK_DETAILS/, 'evidence chips not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,400}PROOF_SENT/, 'footer repeat not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}Prints just this card/, 'print helper not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,500}BUREAU_TX_REF/, 'TX ref not quiet');
});

test('DeckLibrary hides the helper line under the archive heading', () => {
  const src = read('src/components/DeckLibrary.tsx');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,400}Beta: Submissions may require admin review/, 'archive helper line not quiet');
});

test('Deck hides the hero subtitle and the starter-state helper sentences', () => {
  const src = read('src/pages/Deck.tsx');
  assert.ok(src.includes("subtitle={frankieMode ? undefined : 'Draw a card. Take a photo. Bring back a receipt.'}"), 'hero subtitle not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}This one didn’t pass review/, 'rejected helper not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}The Bureau requires additional documentation/, 'needs-more-proof helper not quiet');
  assert.match(src, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}All three Starter Signals are in review/, 'pending-review helper not quiet');
});

test('MissionDecodedCard hides the deck subtitle; EntryCard hides the classified-XP teaser', () => {
  const decoded = read('src/components/MissionDecodedCard.tsx');
  assert.match(decoded, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,300}mission\.deckSubtitle/, 'deck subtitle not quiet');
  const entry = read('src/components/EntryCard.tsx');
  assert.match(entry, /<FrankieQuiet frankieMode=\{frankieMode\}>[\s\S]{0,600}XP remains classified/, 'classified-XP teaser not quiet');
});

test('Basecamp collapses in Frankie mode: next action + More, full board behind it', () => {
  const src = read('src/pages/Basecamp.tsx');
  assert.ok(src.includes('const [frankieShowMore, setFrankieShowMore]'), 'no show-more state');
  assert.ok(src.includes('const frankieCollapsed = frankieMode && !frankieShowMore'), 'no collapsed flag');
  assert.ok(src.includes("subtitle={frankieMode ? undefined : 'What matters today.'}"), 'hero subtitle not quiet');
  assert.ok(src.includes('seasonLine={headerSeasonLine ?? undefined}'), 'season line prop must stay literal (hero suppresses it in Frankie mode)');
  assert.ok(src.includes('hideSeasonLine={frankieMode}'), 'Basecamp must pass frankieMode to hideSeasonLine');
  const hero = read('src/components/FieldPageHero.tsx');
  assert.ok(hero.includes('seasonLine && !hideSeasonLine'), 'hero does not suppress the season line in Frankie mode');
  assert.ok(src.includes('{frankieCollapsed ? ('), 'no collapsed branch');
  assert.match(src, /onClick=\{\(\) => setFrankieShowMore\(true\)\}[\s\S]{0,800}\n\s*>\s*\n?\s*More/, 'no More button');
  assert.match(src, /onClick=\{\(\) => setFrankieShowMore\(false\)\}[\s\S]{0,800}\n\s*>\s*\n?\s*Less/, 'no Less button');
  assert.ok(src.includes('{nextActionPanel}'), 'next action must be shared between collapsed and full views');
});
