import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { BasecampNextActionPanel } from '../components/basecamp/BasecampNextActionPanel';
import { getDeckPackById } from '../data/deckPacks';

const noop = () => undefined;
const heatwavePack = getDeckPackById('heatwave-receipts');

// Nov 18, 2026: the draw-another state consolidates the Today board —
// the big draw panel + the active field card become ONE compact panel
// (deck thumb + name + subtitle + XP, pending line, button, View Proof
// Status), and the slim Active Deck row stays below it. The huge
// "DRAW ANOTHER MISSION" headline and the "Ready for another receipt."
// eyebrow are dropped; the button carries those words now.
function drawAnotherModel(overrides: Record<string, unknown> = {}) {
  return {
    eyebrow: 'Ready for another receipt.',
    title: 'Draw another mission',
    description: 'PENDING DOES NOT STOP YOU FROM DRAWING ANOTHER MISSION.',
    statusLabel: 'Proof in review',
    action: { label: 'Draw Another Mission', href: '/missions?pack=heatwave-receipts', intent: 'navigate' as const },
    secondaryAction: { label: 'View Proof Status', href: '/profile?tab=logbook', intent: 'navigate' as const },
    urgency: 'normal' as const,
    guidanceState: 'DRAW_MISSION' as const,
    deckId: 'heatwave-receipts',
    mission: {
      id: 'heat-1',
      title: 'Find the Coolest Shadow',
      description: 'Find and photograph a useful patch of shade.',
      deckId: 'heatwave-receipts',
      deckName: 'Heatwave Receipts',
      status: 'pending_review' as const,
      statusLabel: 'Proof in review',
      rewardXp: 125,
    },
    ...overrides,
  };
}

function renderPanel(model: ReturnType<typeof drawAnotherModel>) {
  return renderToStaticMarkup(
    <BasecampNextActionPanel model={model} pack={heatwavePack} onAction={noop} onSecondaryAction={noop} />,
  );
}

test('draw-another with a pending proof renders one compact panel, not the tall stack', () => {
  const html = renderPanel(drawAnotherModel());

  // Header bar and status stay.
  assert.match(html, /Today at Basecamp/i);
  assert.match(html, /Proof in review/);

  // Top row: deck cover thumb + name + subtitle + XP chip.
  assert.match(html, /\/assets\/decks\/heatwave-receipts\.jpg/i);
  assert.match(html, /aspect-square w-16/);
  assert.match(html, /Heatwave Receipts/);
  assert.match(html, /A Summer Fieldtrip Deck/);
  assert.match(html, /125 base XP/);

  // The two drops: no huge headline, no eyebrow.
  assert.doesNotMatch(html, /Draw another mission/);
  assert.doesNotMatch(html, /Ready for another receipt\./);
  assert.doesNotMatch(html, /text-4xl|text-5xl|text-6xl/);

  // Order inside the panel: pending line, then button, then View Proof Status.
  const pendingIdx = html.indexOf('PENDING DOES NOT STOP YOU FROM DRAWING ANOTHER MISSION.');
  const buttonIdx = html.indexOf('Draw Another Mission');
  const proofIdx = html.indexOf('View Proof Status');
  assert.ok(pendingIdx !== -1 && buttonIdx !== -1 && proofIdx !== -1);
  assert.ok(pendingIdx < buttonIdx, 'pending copy sits above the button');
  assert.ok(buttonIdx < proofIdx, 'View Proof Status sits under the button');

  // The button is the same CTA (paper, primary marker), full-width.
  // Nov 27, 2026 design elevation batch: the CTA moved from the skin
  // primary to the skin paper — same marker, same placement.
  assert.match(html, /data-basecamp-primary="true"/);
  assert.match(html, /basecamp-next-cta/);
  assert.match(html, /bg-\[var\(--skin-surface\)\]/);

  // No old two-column grid, no mission-summary side column.
  assert.doesNotMatch(html, /lg:grid-cols-\[minmax\(0,1\.45fr\)/);
  assert.doesNotMatch(html, /Active field card/);
  // The panel does not duplicate the Active Deck row — that row lives in
  // Basecamp.tsx, below the panel.
  assert.doesNotMatch(html, /Deck shelf/);
});

test('draw-another without a pending proof is compact too, with no secondary row', () => {
  const html = renderPanel(drawAnotherModel({
    description: 'FIELD SIGNAL READY',
    secondaryAction: null,
  }));
  assert.match(html, /Draw Another Mission/);
  assert.match(html, /FIELD SIGNAL READY/);
  assert.doesNotMatch(html, /View Proof Status/);
  assert.doesNotMatch(html, /Draw another mission/);
  assert.doesNotMatch(html, /Ready for another receipt\./);
  assert.doesNotMatch(html, /text-4xl|text-5xl|text-6xl/);
  assert.match(html, /Heatwave Receipts/);
  assert.match(html, /125 base XP/);
});

test('other next-action states keep the old two-column layout', () => {
  const html = renderToStaticMarkup(
    <BasecampNextActionPanel
      model={{
        eyebrow: 'Current mission',
        title: 'Find the Coolest Shadow',
        description: 'Find and photograph a useful patch of shade.',
        statusLabel: 'Mission active',
        action: { label: 'Continue Mission', href: '/capture?id=heat-1', intent: 'navigate' },
        secondaryAction: null,
        urgency: 'high',
        guidanceState: 'RESUME_ACTIVE_MISSION',
        deckId: 'heatwave-receipts',
        mission: {
          id: 'heat-1',
          title: 'Find the Coolest Shadow',
          description: 'Find and photograph a useful patch of shade.',
          deckId: 'heatwave-receipts',
          deckName: 'Heatwave Receipts',
          status: 'active',
          statusLabel: 'Mission active',
          rewardXp: 100,
        },
      }}
      pack={heatwavePack}
      onAction={noop}
    />,
  );
  assert.match(html, /Find the Coolest Shadow/);
  assert.match(html, /Continue Mission/);
  // Mission Log (Nov 21, 2026): the summary's "Active field card"
  // eyebrow became the journal-card header — ticket + sector line.
  assert.match(html, /Mission log/);
  assert.match(html, /Sector/);
  assert.match(html, /lg:grid-cols-\[minmax\(0,1\.45fr\)_minmax\(220px,0\.55fr\)\]/);
  assert.match(html, /class="flex flex-col justify-start gap-6 p-5 sm:p-7 lg:p-8"/);
});

test('the compact branch wires the same action handlers as the old branch', () => {
  // Both branches render the primary CTA with the same handler and the
  // same secondary wiring — the consolidation moves the buttons, it does
  // not rewire them.
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const source = readFileSync(join(repoRoot, 'src/components/basecamp/BasecampNextActionPanel.tsx'), 'utf8');
  assert.equal((source.match(/data-basecamp-primary="true"/g) || []).length, 2);
  assert.equal((source.match(/onClick=\{onAction\}/g) || []).length, 2);
  assert.equal((source.match(/onClick=\{onSecondaryAction\}/g) || []).length, 2);
});

test('Basecamp keeps the slim Active Deck row directly below the panel', () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const basecamp = readFileSync(join(repoRoot, 'src/pages/Basecamp.tsx'), 'utf8');
  const panelIdx = basecamp.indexOf('<BasecampNextActionPanel');
  const rowIdx = basecamp.indexOf('Active deck row');
  assert.ok(panelIdx !== -1 && rowIdx !== -1);
  assert.ok(panelIdx < rowIdx, 'the Active Deck row sits below the next-action panel');
  const row = basecamp.slice(rowIdx, basecamp.indexOf('</button>', rowIdx));
  assert.match(row, /Active deck/);
  assert.match(row, /Deck shelf →/);
  assert.match(row, /activeDeckApprovedCount/);
  assert.match(row, /activeDeckPendingCount/);
});
