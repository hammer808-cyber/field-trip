import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { fileURLToPath } from 'node:url';
import { BasecampAttentionPanel } from '../components/basecamp/BasecampAttentionPanel';
import { BasecampCrewSummary } from '../components/basecamp/BasecampCrewSummary';
import { BasecampNextActionPanel } from '../components/basecamp/BasecampNextActionPanel';
import { BasecampNotifications } from '../components/basecamp/BasecampNotifications';
import { BasecampProgressPanel } from '../components/basecamp/BasecampProgressPanel';
import { BasecampQuickLinks } from '../components/basecamp/BasecampQuickLinks';
import { FieldPageHero } from '../components/FieldPageHero';
import { getDeckPackById } from '../data/deckPacks';

const noop = () => undefined;

test('the primary panel presents one canonical action and local deck artwork', () => {
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
      pack={getDeckPackById('heatwave-receipts')}
      onAction={noop}
    />,
  );
  assert.match(html, /Today at Basecamp/i);
  assert.match(html, /Continue Mission/i);
  assert.match(html, /\/assets\/decks\/heatwave-receipts\.jpg/i);
  assert.equal((html.match(/Continue Mission/g) || []).length, 1);
  // Dedupe (Nov 8): the hero used to print the mission title four times
  // (eyebrow, headline, CTA, card summary) and the signal line twice
  // (description + flavor). The title appears exactly once now, the
  // description once, and the duplicate flavor line is gone.
  assert.equal((html.match(/Find the Coolest Shadow/g) || []).length, 1);
  assert.equal((html.match(/Find and photograph a useful patch of shade\./g) || []).length, 1);
  assert.doesNotMatch(html, /basecamp-flavor/);
  assert.doesNotMatch(html, /Keep going:/i);
  assert.doesNotMatch(html, /COMMANDER_VOID|OPERATION VANGUARD|14,200|20,000/i);
});

test('proof attention distinguishes an actionable retry from pending review', () => {
  const actionableHtml = renderToStaticMarkup(
    <BasecampAttentionPanel
      model={{
        actionableCount: 1,
        pendingCount: 2,
        item: {
          entryId: 'entry-1',
          missionId: 'mission-1',
          deckId: 'heatwave-receipts',
          title: 'Night Receipt',
          status: 'needs_more_proof',
          statusLabel: 'Needs more proof',
          note: 'Show the whole object.',
          action: { label: 'Retry Mission', href: '/capture?id=mission-1', intent: 'retry-proof', missionId: 'mission-1' },
        },
      }}
      onAction={noop}
    />,
  );
  assert.match(actionableHtml, /Retry Mission/i);
  assert.match(actionableHtml, /2 proofs also in review/i);

  // Single next-action (Nov 20, 2026, option A): when the item is the
  // same mission the hero panel already routes to, Attention renders the
  // status with no second button — the panel's button is the only
  // capture route.
  const duplicateHtml = renderToStaticMarkup(
    <BasecampAttentionPanel
      model={{
        actionableCount: 1,
        pendingCount: 0,
        item: {
          entryId: 'entry-1',
          missionId: 'mission-1',
          deckId: 'heatwave-receipts',
          title: 'Night Receipt',
          status: 'needs_more_proof',
          statusLabel: 'Needs more proof',
          note: 'Show the whole object.',
          action: { label: 'Retry Mission', href: '/capture?id=mission-1', intent: 'retry-proof', missionId: 'mission-1' },
          duplicateOfNextAction: true,
        },
      }}
      onAction={noop}
    />,
  );
  assert.match(duplicateHtml, /Needs more proof/i);
  assert.match(duplicateHtml, /Night Receipt/i);
  assert.match(duplicateHtml, /Use the button above/i);
  assert.doesNotMatch(duplicateHtml, /<button/i);

  const pendingHtml = renderToStaticMarkup(
    <BasecampAttentionPanel model={{ actionableCount: 0, pendingCount: 1, item: null }} onAction={noop} />,
  );
  assert.match(pendingHtml, /No proof fixes are waiting/i);
  assert.match(pendingHtml, /You can keep playing while review is pending/i);
});

test('sidebar panels render honest progress, crew, and empty states', () => {
  const progressHtml = renderToStaticMarkup(
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
  assert.match(progressHtml, /700 XP/i);
  assert.match(progressHtml, /3\/3/i);
  assert.match(progressHtml, /1 pending/i);

  const crewHtml = renderToStaticMarkup(
    <BasecampCrewSummary model={{ hasCrew: false, crewId: null, crewName: 'Your Crew is empty', roleLabel: null, acceptedCount: 0, incomingCount: 0 }} onOpenCrew={noop} />,
  );
  assert.match(crewHtml, /Find Players/i);
  assert.match(crewHtml, /Fieldtrip starts solo/i);
  assert.doesNotMatch(crewHtml, /Crew rank|contribution/i);
});

test('quick links retain canonical Missions, Logbook, and Voting destinations', () => {
  const html = renderToStaticMarkup(
    <BasecampQuickLinks
      links={[
        { id: 'missions', label: 'Missions', description: 'Choose a deck.', href: '/missions' },
        { id: 'logbook', label: 'Logbook', description: '2 approved.', href: '/profile?tab=logbook' },
        { id: 'voting', label: 'Voting', description: 'Check the weekly state.', href: '/voting' },
      ]}
      onOpen={noop}
    />,
  );
  assert.match(html, /Missions/i);
  assert.match(html, /Logbook/i);
  assert.match(html, /Voting/i);
  assert.doesNotMatch(html, /Viewfinder/i);
});

test('the bulletin board no longer renders Updates — Notifications is the feed in the main column', () => {
  const html = renderToStaticMarkup(
    <BasecampNotifications items={[]} onOpen={noop} />,
  );
  assert.match(html, /Field notices/i);
  assert.match(html, /Notifications/);
  assert.match(html, /No notifications yet\./);
  assert.doesNotMatch(html, /Updates/);

  // Placement: Notifications sits in the board's main column, under the hero,
  // not buried in the sidebar — and Updates is gone from the page entirely.
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const source = readFileSync(join(repoRoot, 'src/pages/Basecamp.tsx'), 'utf8');
  assert.doesNotMatch(source, /BasecampRecentActivity/);
  const mainIdx = source.indexOf('main={(');
  const notifIdx = source.indexOf('<BasecampNotifications');
  const sidebarIdx = source.indexOf('sidebar={(');
  assert.ok(mainIdx !== -1 && notifIdx !== -1 && sidebarIdx !== -1);
  assert.ok(mainIdx < notifIdx && notifIdx < sidebarIdx);
});

test('progress and crew panels share the board paper treatment, not the dark gloss', () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
  const progress = read('src/components/basecamp/BasecampProgressPanel.tsx');
  const crew = read('src/components/basecamp/BasecampCrewSummary.tsx');
  const css = read('src/pages/Basecamp.css');

  // No dark-panel leftovers in either component: no white-on-dark text,
  // no gloss sweep, no glow blob — and both are pinned like the hero.
  for (const source of [progress, crew]) {
    assert.doesNotMatch(source, /text-white/);
    assert.match(source, /basecamp-tape/);
  }
  assert.doesNotMatch(progress, /basecamp-shine/);
  assert.doesNotMatch(crew, /basecamp-crew-glow/);

  // The shared panel rule is built from skin tokens, and the old dark
  // gradients are gone from the stylesheet entirely.
  assert.match(css, /\.skin-basecamp \.basecamp-progress, \.skin-basecamp \.basecamp-crew \{[^}]*var\(--skin-surface\)/);
  assert.match(css, /\.skin-basecamp \.basecamp-progress, \.skin-basecamp \.basecamp-crew \{[^}]*var\(--skin-card-shadow\)/);
  assert.doesNotMatch(css, /basecamp-shine|basecamp-crew-glow/);
  assert.doesNotMatch(css, /#080b13|#d91586|#342052/);
});

test('the season countdown lives in the Basecamp header, once', () => {
  // Nov 17, 2026: the countdown moved from the Active Deck row into the
  // header — same fact once, not stacked. The hero renders it under the
  // subtitle; without it, no season line renders.
  const withSeason = renderToStaticMarkup(
    <MemoryRouter>
      <FieldPageHero
        variant="editorial"
        eyebrow="FIELD_START"
        title="BASECAMP"
        subtitle="What matters today."
        seasonLine="GOBBLE AND GLOW ends in 53d 21h · Week 3"
      />
    </MemoryRouter>,
  );
  assert.match(withSeason, /What matters today\./);
  assert.match(withSeason, /GOBBLE AND GLOW ends in 53d 21h · Week 3/);
  assert.equal((withSeason.match(/GOBBLE AND GLOW ends in 53d 21h · Week 3/g) || []).length, 1);
  const withoutSeason = renderToStaticMarkup(
    <MemoryRouter>
      <FieldPageHero variant="editorial" eyebrow="FIELD_START" title="BASECAMP" subtitle="What matters today." />
    </MemoryRouter>,
  );
  assert.doesNotMatch(withoutSeason, /ends in \d+d \d+h/);
});

test('Basecamp passes its countdown to the header and the deck row no longer carries it', () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
  const basecamp = read('src/pages/Basecamp.tsx');
  assert.match(basecamp, /seasonLine=\{headerSeasonLine \?\? undefined\}/);
  assert.match(basecamp, /headerSeasonLine = seasonCountdown/);
  // The row keeps deck name + approved/pending counts only — the countdown
  // label and the Week suffix left with it.
  const rowAt = basecamp.indexOf('Active deck row');
  const row = basecamp.slice(rowAt, basecamp.indexOf('</button>', rowAt));
  assert.doesNotMatch(row, /seasonCountdown/);
  assert.doesNotMatch(row, /Week \{currentWeekNumber\}/);
  assert.match(row, /activeDeckApprovedCount/);
  assert.match(row, /Deck shelf →/);
});

test('the next-action panel hugs its content instead of forcing empty height', () => {
  // Nov 17, 2026: the text column forced min-h-[310px] with
  // justify-between on ~150px of content — ~160px of dead middle on the
  // board. The mission summary's 220px floor did the same on mobile.
  const html = renderToStaticMarkup(
    <BasecampNextActionPanel
      model={{
        eyebrow: 'Current mission',
        title: 'The Long Table',
        description: 'Find a holiday table set for a crowd.',
        statusLabel: 'Mission active',
        action: { label: 'Do This Mission', href: '/capture?id=holiday-01', intent: 'navigate' },
        secondaryAction: null,
        urgency: 'normal',
        guidanceState: 'RESUME_ACTIVE_MISSION',
        deckId: 'gobble-and-glow',
        mission: {
          id: 'holiday-01',
          title: 'The Long Table',
          description: 'Find a holiday table set for a crowd.',
          deckId: 'gobble-and-glow',
          deckName: 'Gobble & Glow',
          status: 'active',
          statusLabel: 'Mission active',
          rewardXp: 100,
        },
      }}
      pack={getDeckPackById('gobble-and-glow')}
      onAction={noop}
    />,
  );
  assert.match(html, /The Long Table/);
  assert.match(html, /Do This Mission/);
  assert.doesNotMatch(html, /min-h-\[310px\]/);
  assert.doesNotMatch(html, /min-h-\[220px\]/);
  // The text column hugs its content — justify-start, not the old
  // justify-between that spread ~150px of content across a 310px floor.
  // (The header bar above it still legitimately uses justify-between.)
  assert.match(html, /class="flex flex-col justify-start gap-6 p-5 sm:p-7 lg:p-8"/);
  // Desktop keeps stretching the summary to the row height.
  assert.match(html, /lg:min-h-full/);
});

test('the utility row renders for admins only', () => {
  // Nov 17, 2026: the row held only the admin-only console button, but
  // its div still took 12px of padding above the board for every player.
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const basecamp = readFileSync(join(repoRoot, 'src/pages/Basecamp.tsx'), 'utf8');
  const utilIdx = basecamp.indexOf('basecamp-utility');
  assert.ok(utilIdx !== -1, 'utility row must still exist for admins');
  const gateIdx = basecamp.lastIndexOf('{isAdmin && (', utilIdx);
  assert.ok(gateIdx !== -1, 'utility row must be gated on isAdmin');
  assert.ok(utilIdx - gateIdx < 200, 'the gate must wrap the utility div, not sit far above it');
  assert.match(basecamp, /Admin Console/);
});

test('the hero trim is a Basecamp-scoped prop, not a global change', () => {
  // Nov 17, 2026: FieldPageHero is shared by a dozen pages, so the
  // Basecamp gap trim rides on an opt-in `compact` prop — every other
  // page keeps the default padding.
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');
  const hero = read('src/components/FieldPageHero.tsx');
  assert.match(hero, /compact\?: boolean/);
  assert.match(hero, /compact \? 'pb-3 sm:pb-4' : 'pb-5 sm:pb-6'/);
  const basecamp = read('src/pages/Basecamp.tsx');
  assert.match(basecamp, /<FieldPageHero\s*\n\s*variant="editorial"\s*\n\s*compact/);
  const board = read('src/components/basecamp/BasecampBoard.tsx');
  assert.match(board, /py-3 sm:px-6 sm:py-4/);
  assert.doesNotMatch(board, /py-6 sm:px-6 sm:py-8/);
});
