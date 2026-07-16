import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActiveDeckPanel } from '../components/missions/ActiveDeckPanel';
import { DeckShelfPanel, type DeckShelfSection } from '../components/missions/DeckShelfPanel';
import { MissionActionPanel } from '../components/missions/MissionActionPanel';
import { MissionLogbookPanel } from '../components/missions/MissionLogbookPanel';
import type { DeckPack } from '../types/deckPacks';

const starterPack: DeckPack = {
  packId: 'starter-signals',
  packName: 'Starter: First Signals',
  shortName: 'Starter',
  description: 'Three real starter missions.',
  missionIds: ['starter-1', 'starter-2', 'starter-3'],
  unlockRule: 'immediate',
  visibility: 'public',
  isActive: true,
  fallbackIcon: 'Zap',
  sortOrder: 1,
  coverImage: '/assets/decks/starter-signals.jpg',
};

const noop = () => undefined;

test('active deck panel renders supplied canonical progress without Stitch placeholders', () => {
  const html = renderToStaticMarkup(
    <ActiveDeckPanel
      pack={starterPack}
      displayName="Starter: First Signals"
      approvedCount={1}
      pendingCount={1}
      totalCount={3}
      approvedPercent={33}
      pendingPercent={33}
      locked={false}
      onCoverAction={noop}
    />,
  );

  assert.match(html, /Starter: First Signals/i);
  assert.match(html, /1\/3 approved/i);
  assert.match(html, /1 pending/i);
  assert.doesNotMatch(html, /Neon Sprint|Commander_Void|14,200|20,000/i);
});

test('restricted teaser decks present only the safe lock reason and cannot be selected', () => {
  const privatePack: DeckPack = {
    ...starterPack,
    packId: 'private-assignment',
    packName: 'Private Assignment',
    shortName: 'Private',
    visibility: 'assigned_users',
    showLockedTeaser: true,
  };
  const sections: DeckShelfSection[] = [{
    id: 'always-on',
    label: 'Always-On Decks',
    items: [{
      pack: privatePack,
      completed: 0,
      total: 3,
      percent: 0,
      locked: true,
      lockReason: 'Private field assignment',
      selected: false,
    }],
  }];

  const html = renderToStaticMarkup(
    <DeckShelfPanel
      open
      onOpenChange={noop}
      activeDeckLabel="Starter"
      sections={sections}
      onSelect={noop}
    />,
  );

  assert.match(html, /Private Assignment/i);
  assert.match(html, /Private field assignment/i);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /assignedUserIds|inviteCode/i);
});

test('Logbook renders an honest empty state and canonical count labels', () => {
  const html = renderToStaticMarkup(
    <MissionLogbookPanel
      open
      onOpenChange={noop}
      counts={{
        totalSubmitted: 0,
        pendingReview: 0,
        approvedVerified: 0,
        rejectedOrNeedsMoreProof: 0,
        communityEligible: 0,
      }}
      items={[]}
      onOpenFullLogbook={noop}
    />,
  );

  assert.match(html, /No submitted field logs/i);
  assert.match(html, /No field logs yet/i);
  assert.match(html, /Open full Logbook/i);
});

test('Logbook preserves proof state labels and review actions supplied by the controller', () => {
  const html = renderToStaticMarkup(
    <MissionLogbookPanel
      open
      onOpenChange={noop}
      counts={{
        totalSubmitted: 2,
        pendingReview: 0,
        approvedVerified: 1,
        rejectedOrNeedsMoreProof: 1,
        communityEligible: 1,
      }}
      items={[
        {
          id: 'approved-entry',
          title: 'Receipt One',
          status: 'approved',
          statusLabel: 'Verified (+100 XP)',
          filedLabel: 'Filed 7/16/2026',
          fieldNote: 'A real note.',
        },
        {
          id: 'retry-entry',
          title: 'Receipt Two',
          status: 'needs_more_proof',
          statusLabel: 'Needs proof',
          filedLabel: 'Filed 7/16/2026',
          fieldNote: 'Needs another angle.',
          adminNote: 'Show the full object.',
          onRetry: noop,
        },
      ]}
      onOpenFullLogbook={noop}
    />,
  );

  assert.match(html, /Verified \(\+100 XP\)/i);
  assert.match(html, /Needs proof/i);
  assert.match(html, /Show the full object/i);
  assert.match(html, /Retry mission/i);
});

test('mission action panel exposes the controller-supplied title and state', () => {
  const html = renderToStaticMarkup(
    <MissionActionPanel eyebrow="Current assignment" title="Find the strange sign" status="Pending review">
      <p>Mission content</p>
    </MissionActionPanel>,
  );

  assert.match(html, /Current assignment/i);
  assert.match(html, /Find the strange sign/i);
  assert.match(html, /Pending review/i);
  assert.match(html, /Mission content/i);
});
