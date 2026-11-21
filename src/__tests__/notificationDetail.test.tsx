import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BasecampNotifications, NOTIFICATIONS_VISIBLE_BATCH } from '../components/basecamp/BasecampNotifications';
import { NotificationDetailModal } from '../components/basecamp/NotificationDetailModal';
import type { BasecampNotificationItem, BasecampNotificationKind } from '../logic/basecampViewModel';

const noop = () => {};

function item(overrides: Partial<BasecampNotificationItem> = {}): BasecampNotificationItem {
  return {
    id: 'notification-notif-1',
    notificationId: 'notif-1',
    kind: 'decision',
    title: 'Proof approved',
    detail: 'Find the Coolest Shadow · +75 XP',
    timeLabel: '5:00 PM',
    timestamp: 1784300000000,
    unread: true,
    href: '/profile?tab=logbook',
    ...overrides,
  };
}

test('notification detail card: shows the full detail, art for awards, and Take me there', () => {
  const sticker = item({
    kind: 'sticker',
    title: 'Sticker unlocked',
    detail: 'Fresh Meat · common',
    href: '/dex/stickers',
    imageUrl: '/assets/stickers/achievement/01_fresh_meat.png',
  });
  const html = renderToStaticMarkup(
    <NotificationDetailModal item={sticker} onClose={noop} onTakeMeThere={noop} />,
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /Sticker unlocked/);
  assert.match(html, /Fresh Meat · common/);
  assert.match(html, /\/assets\/stickers\/achievement\/01_fresh_meat\.png/);
  assert.match(html, /Take me there/);
  assert.match(html, /New/, 'unread card carries the red New pill');

  const decision = item({ imageUrl: undefined });
  const decisionHtml = renderToStaticMarkup(
    <NotificationDetailModal item={decision} onClose={noop} onTakeMeThere={noop} />,
  );
  assert.doesNotMatch(decisionHtml, /<img/, 'decisions have no art to show');
  assert.match(decisionHtml, /Take me there/);

  const readHtml = renderToStaticMarkup(
    <NotificationDetailModal item={item({ unread: false })} onClose={noop} onTakeMeThere={noop} />,
  );
  assert.doesNotMatch(readHtml, />New</, 'read card has no New pill');
});

test('notification detail card: null item renders nothing', () => {
  const html = renderToStaticMarkup(
    <NotificationDetailModal item={null} onClose={noop} onTakeMeThere={noop} />,
  );
  assert.equal(html, '');
});

test('notifications list: seven at a time with a Show more button', () => {
  assert.equal(NOTIFICATIONS_VISIBLE_BATCH, 7, 'Zach’s call: six or seven at a time');
  const kinds: BasecampNotificationKind[] = ['decision', 'sticker', 'submission', 'power_hour', 'crew', 'decision', 'sticker', 'submission', 'power_hour', 'crew'];
  const items = kinds.map((kind, i) => item({ id: `notification-n${i}`, notificationId: `n${i}`, kind, title: `Notice ${i}` }));
  const html = renderToStaticMarkup(<BasecampNotifications items={items} onOpen={noop} />);
  // Only the first 7 rows render; the rest wait behind Show more. (Titles
  // appear twice per row — aria-label + visible text — so count the rows.)
  assert.equal((html.match(/<li>/g) || []).length, 7);
  assert.match(html, /Show more \(3 remaining\)/);

  const few = renderToStaticMarkup(<BasecampNotifications items={items.slice(0, 7)} onOpen={noop} />);
  assert.doesNotMatch(few, /Show more/, 'no button when everything fits');
});

test('notifications list: each kind has its own tile color and unread rows carry the red dot', () => {
  const items = [
    item({ kind: 'decision', title: 'Decision row' }),
    item({ kind: 'sticker', title: 'Sticker row' }),
    item({ kind: 'submission', title: 'Submission row' }),
    item({ kind: 'power_hour', title: 'Power Hour row' }),
    item({ kind: 'crew', title: 'Crew row', unread: false }),
  ];
  const html = renderToStaticMarkup(<BasecampNotifications items={items} onOpen={noop} />);
  assert.match(html, /bg-brand-cyan/, 'decisions are cyan');
  assert.match(html, /bg-brand-lime/, 'stickers are lime');
  assert.match(html, /bg-brand-orange/, 'submissions are orange');
  assert.match(html, /bg-heat-yellow/, 'Power Hour is heat yellow');
  assert.match(html, /bg-brand-purple/, 'crew is purple');
  // Unread rows carry the red dot (error red #FF003D); the read crew row has none.
  assert.equal((html.match(/bg-error/g) || []).length, 4, 'four unread rows, four red dots');
});
