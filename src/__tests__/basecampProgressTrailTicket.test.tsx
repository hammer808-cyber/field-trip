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
