/**
 * Field Manual chrome — kit, Trevor's Log, Mission Log (Nov 21, 2026).
 * The mocks reuse the same journal pieces everywhere: ticket labels,
 * rubber stamps, folder tabs, taped polaroids. The kit is one shared
 * implementation in skin tokens; the two cards reframe existing
 * Basecamp content instead of inventing new facts.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FieldTicket } from '../components/FieldTicket';
import { FieldStamp } from '../components/FieldStamp';
import { FieldHeroTabs } from '../components/FieldHeroTabs';
import { TrevorsLogCard } from '../components/basecamp/TrevorsLogCard';
import { BasecampMissionSummary } from '../components/basecamp/BasecampMissionSummary';

const read = (path: string) => readFileSync(path, 'utf8');

test('kit: the ticket renders its label in the tone colour with a dashed inner rule', () => {
  const html = renderToStaticMarkup(<FieldTicket label="Mission log" tone="secondary" />);
  assert.ok(html.includes('Mission log'), `ticket has no label: ${html}`);
  assert.ok(html.includes('bg-[var(--skin-secondary)]'), 'secondary ticket is not lime');
  assert.ok(html.includes('border-dashed'), 'ticket has no perforated inner rule');
});

test('kit: the ticket defaults to the orange primary tone', () => {
  const html = renderToStaticMarkup(<FieldTicket label="Round active" />);
  assert.ok(html.includes('bg-[var(--skin-primary)]'), 'default ticket is not orange');
});

test('kit: the stamp is decorative, double-bordered, and aria-hidden', () => {
  const html = renderToStaticMarkup(<FieldStamp label="1ST" />);
  assert.ok(html.includes('1ST'), `stamp has no label: ${html}`);
  assert.ok(html.includes('aria-hidden="true"'), 'stamp is not marked decorative');
  assert.ok(html.includes('border-[var(--skin-primary)]'), 'stamp is not orange');
});

test('kit: no chrome-kit file introduces a hard-coded hex (P2-1)', () => {
  for (const path of [
    'src/components/FieldTicket.tsx',
    'src/components/FieldStamp.tsx',
    'src/components/FieldHeroTabs.tsx',
    'src/components/BigBoardStandingsTable.tsx',
    'src/components/basecamp/TrevorsLogCard.tsx',
    'src/components/basecamp/BasecampMissionSummary.tsx',
  ]) {
    assert.doesNotMatch(read(path), /#[0-9a-fA-F]{3,8}\b/, `${path} has a hard-coded hex`);
  }
});

test('kit: the hero tab strip renders tabs with roles, selection, and locked state', () => {
  const html = renderToStaticMarkup(
    <FieldHeroTabs
      tabs={[
        { id: 'decks', label: 'Decks' },
        { id: 'stickers', label: 'Stickers', locked: true },
      ]}
      activeTab="decks"
      onTabChange={() => {}}
      variant="editorial"
      title="Dex"
    />,
  );
  assert.ok(html.includes('role="tablist"'), 'tab strip has no tablist role');
  assert.ok(html.includes('role="tab"'), 'tab strip has no tab roles');
  assert.ok(html.includes('aria-selected="true"'), 'active tab is not selected');
  assert.ok(html.includes('disabled'), 'locked tab is not disabled');
  assert.ok(html.includes('Decks') && html.includes('Stickers'), 'tab labels missing');
});

test('kit: the card-variant tab strip keeps the big rounded-top folder tabs', () => {
  const html = renderToStaticMarkup(
    <FieldHeroTabs
      tabs={[{ id: 'decks', label: 'Decks' }]}
      activeTab="decks"
      onTabChange={() => {}}
      variant="card"
      title="Dex"
    />,
  );
  assert.ok(html.includes('rounded-t-3xl'), 'card tabs lost their folder shape');
  assert.ok(html.includes('bg-[var(--skin-surface)]'), 'active card tab is not the surface colour');
});

test('kit: an empty tab list renders nothing', () => {
  const html = renderToStaticMarkup(
    <FieldHeroTabs tabs={[]} activeTab="decks" onTabChange={() => {}} variant="editorial" title="Dex" />,
  );
  assert.equal(html, '');
});

test('kit: FieldPageHero renders tabs through the shared kit, not inline copies', () => {
  const hero = read('src/components/FieldPageHero.tsx');
  assert.ok(hero.includes("import { FieldHeroTabs } from './FieldHeroTabs'"), 'hero does not import the kit');
  assert.match(hero, /<FieldHeroTabs/, 'hero does not render the kit tab strip');
  assert.doesNotMatch(hero, /bg-\[#E8E2D2\]/, 'hero still hard-codes the old inactive-tab hex');
  assert.doesNotMatch(hero, /🔒/, 'hero still uses the lock emoji in a tab');
});

test('log card: the latest approved proof renders as a taped polaroid with its note', () => {
  const html = renderToStaticMarkup(
    <TrevorsLogCard
      latestApproved={{
        photoUrl: 'https://example.com/proof.jpg',
        note: 'Heard something big crash through the brush.',
        missionTitle: 'Snack Evidence',
        dateLabel: 'Nov 20, 2026',
      }}
    />,
  );
  assert.ok(html.includes('Trevor'), 'log card has no Trevor header');
  assert.ok(html.includes('https://example.com/proof.jpg'), 'log card has no polaroid photo');
  assert.ok(html.includes('Heard something big crash through the brush.'), 'log card has no field-note quote');
  assert.ok(html.includes('Snack Evidence'), 'log card has no mission caption');
  assert.ok(html.includes('Nov 20, 2026'), 'log card has no date caption');
});

test('log card: with no approved proof it says so instead of inventing one', () => {
  const html = renderToStaticMarkup(<TrevorsLogCard latestApproved={null} />);
  assert.ok(html.includes('No entries logged yet'), `empty log card invents content: ${html}`);
  // The header avatar is an <img>, so the polaroid is checked by its
  // figure, not by the absence of images.
  assert.ok(!html.includes('<figure'), 'empty log card renders a polaroid');
  assert.ok(!html.includes('Latest approved proof'), 'empty log card claims a proof');
});

test('log card: Basecamp feeds it the latest approved entry, newest first', () => {
  const basecamp = read('src/pages/Basecamp.tsx');
  assert.match(
    basecamp,
    /<TrevorsLogCard latestApproved=\{latestApprovedLogEntry\} \/>/,
    'Basecamp does not render the log card',
  );
  assert.ok(
    basecamp.includes("normalizeEntryStatus(entry.status) === 'approved'"),
    'Basecamp does not filter the log entry to approved proofs',
  );
});

const reconPack = {
  packId: 'urban-recon',
  deckCode: 'FT-09',
  packName: 'Urban Recon',
  deckSubtitle: 'A location-adaptive fieldtrip deck.',
  description: 'A location-adaptive fieldtrip deck.',
} as any;

const activeMission = {
  id: 'urban-14',
  title: 'Taco Truck Run',
  description: 'Grab a specialty drink at a taco truck with some friends.',
  deckId: 'urban-recon',
  deckName: 'Urban Recon',
  status: 'active',
  statusLabel: 'Mission active',
  rewardXp: 125,
} as any;

test('mission log: the card is a journal card with a ticket, a sector line, and the mission text', () => {
  const html = renderToStaticMarkup(
    <BasecampMissionSummary mission={activeMission} pack={reconPack} />,
  );
  assert.ok(html.includes('Mission log'), 'mission card has no MISSION LOG ticket');
  assert.ok(html.includes('Sector FT-09 // Urban Recon'), `mission card has no sector line: ${html}`);
  assert.ok(
    html.includes('Grab a specialty drink at a taco truck with some friends.'),
    'mission card does not show the mission description',
  );
  assert.ok(
    !html.includes('A location-adaptive fieldtrip deck.'),
    'mission card repeats the deck subtitle instead of the mission text',
  );
});

test('mission log: when the mission text is the panel description it falls back to the subtitle', () => {
  // Nov 8 dedupe rule: the panel prints one fact once. The panel's
  // description sits in the left column, so the card must not repeat it.
  const html = renderToStaticMarkup(
    <BasecampMissionSummary
      mission={activeMission}
      pack={reconPack}
      panelDescription="Grab a specialty drink at a taco truck with some friends."
    />,
  );
  assert.ok(html.includes('Mission log'), 'mission card has no MISSION LOG ticket');
  assert.ok(html.includes('A location-adaptive fieldtrip deck.'), 'card did not fall back to the subtitle');
  assert.equal(
    (html.match(/Grab a specialty drink at a taco truck with some friends\./g) || []).length,
    0,
    'card repeats the panel description',
  );
});

test('mission log: with no mission the deck subtitle stays', () => {
  const html = renderToStaticMarkup(
    <BasecampMissionSummary mission={null} pack={reconPack} />,
  );
  assert.ok(html.includes('Mission log'), 'deck card has no MISSION LOG ticket');
  assert.ok(html.includes('A location-adaptive fieldtrip deck.'), 'deck card lost the subtitle');
});
