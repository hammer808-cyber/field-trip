import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BasecampAttentionPanel } from '../components/basecamp/BasecampAttentionPanel';
import { BasecampCrewSummary } from '../components/basecamp/BasecampCrewSummary';
import { BasecampNextActionPanel } from '../components/basecamp/BasecampNextActionPanel';
import { BasecampProgressPanel } from '../components/basecamp/BasecampProgressPanel';
import { BasecampQuickLinks } from '../components/basecamp/BasecampQuickLinks';
import { BasecampRecentActivity } from '../components/basecamp/BasecampRecentActivity';
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

  const pendingHtml = renderToStaticMarkup(
    <BasecampAttentionPanel model={{ actionableCount: 0, pendingCount: 1, item: null }} onAction={noop} />,
  );
  assert.match(pendingHtml, /No proof fixes are waiting/i);
  assert.match(pendingHtml, /You can keep playing while review is pending/i);
});

test('sidebar panels render honest progress, crew, activity, and empty states', () => {
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
    <BasecampCrewSummary model={{ hasCrew: false, crewId: null, crewName: 'No active crew', roleLabel: null }} onOpenCrew={noop} />,
  );
  assert.match(crewHtml, /Find a Crew/i);
  assert.doesNotMatch(crewHtml, /Crew rank|contribution/i);

  const activityHtml = renderToStaticMarkup(<BasecampRecentActivity items={[]} />);
  assert.match(activityHtml, /No recent personal activity yet/i);
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
