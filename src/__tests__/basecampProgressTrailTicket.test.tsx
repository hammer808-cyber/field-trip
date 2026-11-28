import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { BasecampProgressPanel } from '../components/basecamp/BasecampProgressPanel';
import { BasecampTicketMeter } from '../components/basecamp/BasecampTicketMeter';
import { BasecampTrailMap } from '../components/basecamp/BasecampTrailMap';

const noop = () => undefined;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('trail map shows all 15 levels with the marker on the current one', () => {
  // Zach's live numbers: 314 XP, level 2, 18% into the level.
  const html = renderToStaticMarkup(<BasecampTrailMap xp={314} />);
  assert.equal((html.match(/data-trail-node=/g) || []).length, 15);
  assert.match(html, /data-trail-node="2" data-trail-state="current"/);
  assert.match(html, /data-trail-node="1" data-trail-state="passed"/);
  assert.match(html, /data-trail-node="3" data-trail-state="next"/);
  assert.match(html, /data-trail-node="15" data-trail-state="locked"/);
  assert.match(html, /Stage 2 of 15/);
  assert.match(html, /You are here/);
  assert.match(html, /Next stop: Junior Field Nuisance/);
  assert.match(html, /286 XP to go/);
  assert.match(html, /314 \/ 600 XP/);
  // Default marker is the scout footprint.
  assert.match(html, /👣/);
});

test('trail container is tall enough to hold the nodes (Nov 21 overlap fix)', () => {
  // The nodes are absolutely positioned at top 28px inside a 32px row,
  // so the container needs an explicit 60px height: with only padding
  // the container collapsed to 28px and the nodes ran through the
  // Next stop footer underneath.
  const source = read('src/components/basecamp/BasecampTrailMap.tsx');
  assert.match(source, /className="relative h-\[60px\]"/);
  const html = renderToStaticMarkup(<BasecampTrailMap xp={314} />);
  assert.match(html, /relative h-\[60px\]/);
  assert.match(html, /Next stop: Junior Field Nuisance/);
});

test('trail map honours the chosen marker sticker and the finished trail', () => {
  const owlHtml = renderToStaticMarkup(<BasecampTrailMap xp={314} markerStickerId="night-owl" />);
  assert.match(owlHtml, /🦉/);
  assert.doesNotMatch(owlHtml, /👣/);

  const doneHtml = renderToStaticMarkup(<BasecampTrailMap xp={22600} />);
  assert.match(doneHtml, /Trail complete/);
  assert.match(doneHtml, /Done/);
  assert.match(doneHtml, /22,600 XP total/);
});

test('ticket meter fills to the percent with a marker and a DONE stamp at 100%', () => {
  const html = renderToStaticMarkup(
    <BasecampTicketMeter percent={18} xpToNextLevel={286} nextLevel={3} />,
  );
  assert.match(html, /18% completed/);
  assert.match(html, /286 XP to level 3/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="18"/);
  assert.match(html, /width:18%/);
  assert.doesNotMatch(html, /Done/);

  const doneHtml = renderToStaticMarkup(
    <BasecampTicketMeter percent={100} xpToNextLevel={0} nextLevel={16} />,
  );
  assert.match(doneHtml, /100% completed/);
  assert.match(doneHtml, /Done/);
});

test('progress panel renders the trail and the ticket, not the dial and track', () => {
  const html = renderToStaticMarkup(
    <BasecampProgressPanel
      model={{
        xp: 700,
        level: 3,
        levelTitle: 'Junior Field Nuisance',
        nextLevel: 4,
        xpToNextLevel: 400,
        levelProgressPercent: 20,
        starterApprovedCount: 3,
        starterRequiredCount: 3,
        starterComplete: true,
        starterPercent: 100,
        activeDeckId: 'heatwave-receipts',
        activeDeckName: 'Heatwave Receipts',
        activeDeckApprovedCount: 1,
        activeDeckPendingCount: 1,
        activeDeckTotalCount: 25,
        activeDeckPercent: 4,
      }}
      onOpenProfile={noop}
    />,
  );
  assert.doesNotMatch(html, /basecamp-progress-dial/);
  assert.doesNotMatch(html, /basecamp-progress-track/);
  assert.match(html, /Stage 3 of 15/);
  assert.match(html, /Next stop: Scene Investigator/);
  assert.match(html, /20% completed/);
  assert.match(html, /400 XP to level 4/);
  // The level row and the stat tiles are unchanged.
  assert.match(html, /700 XP/i);
  assert.match(html, /3\/3/i);
  assert.match(html, /1 pending/i);
  assert.match(html, /Open Profile Progress/);
});

test('progress components sit on their own taped paper sheets', () => {
  const html = renderToStaticMarkup(
    <BasecampProgressPanel
      model={{
        xp: 700,
        level: 3,
        levelTitle: 'Junior Field Nuisance',
        nextLevel: 4,
        xpToNextLevel: 400,
        levelProgressPercent: 20,
        starterApprovedCount: 3,
        starterRequiredCount: 3,
        starterComplete: true,
        starterPercent: 100,
        activeDeckId: 'heatwave-receipts',
        activeDeckName: 'Heatwave Receipts',
        activeDeckApprovedCount: 1,
        activeDeckPendingCount: 1,
        activeDeckTotalCount: 25,
        activeDeckPercent: 4,
      }}
      onOpenProfile={noop}
    />,
  );
  // Exactly two sheets: trail sheet, ticket sheet. The stat tiles keep
  // their own boxes and are not sheets. (Count the class attribute:
  // "basecamp-sheet" is a substring of "basecamp-sheet--sticky", so
  // counting the bare class double-counts.)
  assert.equal((html.match(/class="basecamp-sheet/g) || []).length, 2);
  // Both sheets are sticky notes: amber, tilted opposite ways.
  assert.equal((html.match(/basecamp-sheet--sticky/g) || []).length, 2);
  assert.match(html, /basecamp-sheet--sticky -rotate-1/);
  assert.match(html, /basecamp-sheet--sticky rotate-1/);
  // Three tape strips: the card's own plus one per sheet. (Count the
  // position modifiers: "basecamp-tape" is a substring of
  // "basecamp-tape--left", so counting the bare class double-counts.)
  assert.equal((html.match(/basecamp-tape--left/g) || []).length, 2);
  assert.equal((html.match(/basecamp-tape--right/g) || []).length, 1);
  // The trail lives on the first sheet, the ticket on the second.
  // (Search for the class attribute: "basecamp-sheet--sticky" also
  // contains "basecamp-sheet", so a bare search lands in the same div.)
  const firstSheet = html.indexOf('class="basecamp-sheet');
  const secondSheet = html.indexOf('class="basecamp-sheet', firstSheet + 1);
  assert.ok(html.indexOf('Stage 3 of 15', firstSheet) !== -1);
  assert.ok(html.indexOf('Stage 3 of 15', firstSheet) < secondSheet);
  assert.ok(html.indexOf('20% completed', secondSheet) !== -1);

  // The sheet rule is plain paper on the grid card: surface, ink
  // border, hard shadow — vars only, no hard-coded hex in the rule.
  const css = read('src/pages/Basecamp.css');
  const ruleAt = css.indexOf('.skin-basecamp .basecamp-sheet');
  assert.ok(ruleAt !== -1, 'sheet rule must exist');
  const rule = css.slice(ruleAt, css.indexOf('}', ruleAt));
  assert.match(rule, /var\(--skin-surface\)/);
  assert.match(rule, /var\(--skin-border\)/);
  assert.match(rule, /box-shadow/);
  assert.doesNotMatch(rule, /#[0-9a-fA-F]{3,8}\b/);

  // The sticky variant is amber with no ink border, a soft lift
  // shadow, and a curled bottom-right corner — vars and color-mix
  // only, no hard-coded hex in either rule.
  const stickyAt = css.indexOf('.skin-basecamp .basecamp-sheet--sticky');
  assert.ok(stickyAt !== -1, 'sticky rule must exist');
  const stickyRule = css.slice(stickyAt, css.indexOf('}', stickyAt));
  assert.match(stickyRule, /var\(--color-heat-yellow\)/);
  assert.match(stickyRule, /border:none/);
  assert.match(stickyRule, /box-shadow/);
  assert.doesNotMatch(stickyRule, /#[0-9a-fA-F]{3,8}\b/);
  const curlAt = css.indexOf('.skin-basecamp .basecamp-sheet--sticky::after');
  assert.ok(curlAt !== -1, 'curl rule must exist');
  const curlRule = css.slice(curlAt, css.indexOf('}', curlAt));
  assert.match(curlRule, /linear-gradient\(to bottom right/);
  assert.match(curlRule, /color-mix/);
  assert.doesNotMatch(curlRule, /#[0-9a-fA-F]{3,8}\b/);
});

test('the new progress files carry no hard-coded hex', () => {
  for (const rel of [
    'src/components/basecamp/BasecampTrailMap.tsx',
    'src/components/basecamp/BasecampTicketMeter.tsx',
    'src/components/basecamp/BasecampProgressPanel.tsx',
  ]) {
    assert.doesNotMatch(read(rel), /#[0-9a-fA-F]{3,8}\b/, rel);
  }
  const css = read('src/pages/Basecamp.css');
  assert.doesNotMatch(css, /basecamp-progress-dial|basecamp-progress-track/);
});
