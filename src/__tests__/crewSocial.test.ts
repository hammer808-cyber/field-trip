/**
 * Crew clubhouse (Nov 20, 2026): pure-logic tests.
 *
 * Pins the social rules the server and client share — comment/chat text
 * limits, @-mention matching, local-day math — plus the notification
 * copy for the three crew types and the Firestore rules that gate the
 * new collections (read by active members, server-only writes, delete
 * by author or captain).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  MAX_CREW_CHAT_LENGTH,
  MAX_CREW_COMMENT_LENGTH,
  countUnreadChatMessages,
  crewChatMessageMillis,
  entryLocalDay,
  parseChatMentions,
  todayLocalDay,
  validateCrewChatText,
  validateCrewCommentText,
} from '../logic/crewSocial';
import {
  crewChatMentionCopy,
  crewCommentCopy,
  crewMemberJoinedCopy,
} from '../logic/playerNotifications';

const members = [
  { userId: 'u-zach', username: 'zachhammer', displayName: 'Zach Hammer' },
  { userId: 'u-mascota', username: 'mascota', displayName: 'Mascota' },
  { userId: 'u-elondra', username: 'elondra', displayName: 'Elondra' },
];

test('comment text: empty is rejected, over 500 is rejected, the rest is trimmed', () => {
  assert.deepEqual(validateCrewCommentText(''), { ok: false, code: 'EMPTY' });
  assert.deepEqual(validateCrewCommentText('   '), { ok: false, code: 'EMPTY' });
  assert.deepEqual(validateCrewCommentText(null), { ok: false, code: 'EMPTY' });
  assert.deepEqual(validateCrewCommentText('x'.repeat(MAX_CREW_COMMENT_LENGTH + 1)), { ok: false, code: 'TOO_LONG' });
  assert.deepEqual(validateCrewCommentText('  Nice shot!  '), { ok: true, text: 'Nice shot!' });
  assert.deepEqual(validateCrewCommentText('x'.repeat(MAX_CREW_COMMENT_LENGTH)), { ok: true, text: 'x'.repeat(MAX_CREW_COMMENT_LENGTH) });
});

test('chat text: empty is rejected, over 1000 is rejected, the rest is trimmed', () => {
  assert.deepEqual(validateCrewChatText(''), { ok: false, code: 'EMPTY' });
  assert.deepEqual(validateCrewChatText('x'.repeat(MAX_CREW_CHAT_LENGTH + 1)), { ok: false, code: 'TOO_LONG' });
  assert.deepEqual(validateCrewChatText('  hello crew  '), { ok: true, text: 'hello crew' });
  assert.equal(MAX_CREW_CHAT_LENGTH, 1000);
  assert.equal(MAX_CREW_COMMENT_LENGTH, 500);
});

test('@-mentions match by username or first name, case-insensitively, deduped', () => {
  assert.deepEqual(parseChatMentions('hey @zachhammer look', members), ['u-zach']);
  assert.deepEqual(parseChatMentions('hey @Zach look', members), ['u-zach']);
  assert.deepEqual(parseChatMentions('@mascota and @elondra, go!', members), ['u-mascota', 'u-elondra']);
  // First-name match: @zach finds Zach Hammer.
  assert.deepEqual(parseChatMentions('@zach @zachhammer', members), ['u-zach']);
  // Unknown handles and bare @ match nobody.
  assert.deepEqual(parseChatMentions('hey @nobody and @ here', members), []);
  assert.deepEqual(parseChatMentions('no mentions at all', members), []);
  assert.deepEqual(parseChatMentions('@zach', []), []);
});

test('chat message millis: Timestamp seconds, Date, and null behave', () => {
  assert.equal(crewChatMessageMillis({ seconds: 1700000000 }), 1700000000000);
  assert.equal(crewChatMessageMillis(new Date('2026-11-20T12:00:00.000Z')), new Date('2026-11-20T12:00:00.000Z').getTime());
  assert.equal(crewChatMessageMillis(null), 0);
  assert.equal(crewChatMessageMillis(undefined), 0);
  assert.equal(crewChatMessageMillis('not a date'), 0);
});

test('unread badge count: only messages newer than last-seen count', () => {
  // The Nov 20 unread-badge fix: the count lives on the Crew page, so it
  // stays live on every tab — the chat panel only renders and marks seen.
  const messages = [
    { createdAt: { seconds: 100 } },
    { createdAt: { seconds: 200 } },
    { createdAt: { seconds: 300 } },
  ];
  assert.equal(countUnreadChatMessages([], 0), 0);
  assert.equal(countUnreadChatMessages(messages, 0), 3);
  assert.equal(countUnreadChatMessages(messages, 150_000), 2);
  // Stamped exactly at the marker is already seen, not unread.
  assert.equal(countUnreadChatMessages(messages, 200_000), 1);
  assert.equal(countUnreadChatMessages(messages, 300_000), 0);
  // An unreadable timestamp never counts as new.
  assert.equal(countUnreadChatMessages([{ createdAt: null }, { createdAt: { seconds: 400 } }], 0), 1);
});

test('local-day math: Timestamp seconds, Date, and null behave', () => {
  // 2026-11-20 19:30 UTC is 11:30 PST — the day is the DEVICE's day.
  const seconds = Math.floor(new Date('2026-11-20T19:30:00.000Z').getTime() / 1000);
  const day = entryLocalDay({ seconds });
  assert.match(day || '', /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(entryLocalDay(null), null);
  assert.equal(entryLocalDay(undefined), null);
  assert.match(todayLocalDay(new Date('2026-11-20T12:00:00')), /^2026-11-20$/);
});

test('crew notification copy reads like a person talking to you', () => {
  assert.deepEqual(
    crewCommentCopy({ actorName: 'Mascota', missionTitle: 'The Park Oasis', preview: 'That bench is legendary.' }),
    { title: 'Mascota commented on The Park Oasis', detail: 'That bench is legendary.' },
  );
  assert.deepEqual(
    crewChatMentionCopy({ actorName: 'Zach Hammer', preview: '@mascota draw a card!' }),
    { title: 'Zach Hammer mentioned you in the crew chat', detail: '@mascota draw a card!' },
  );
  assert.deepEqual(
    crewMemberJoinedCopy({ memberName: 'Elondra', crewName: 'The Parking Lot Legends' }),
    { title: 'Elondra joined The Parking Lot Legends', detail: 'Say hi in the crew chat.' },
  );
  // Empty names never render blank.
  assert.equal(crewCommentCopy({ actorName: '', missionTitle: '', preview: '' }).title, 'A crewmate commented on your crew photo');
});

test('firestore.rules gates the clubhouse collections', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /match \/crewFeedComments\/\{commentId\}/);
  assert.match(rules, /match \/crews\/\{crewId\}\/messages\/\{messageId\}/);
  // Reads are active members; creates/updates are server-only.
  assert.match(rules, /crewFeedComments[\s\S]*?allow create, update: if false;/);
  assert.match(rules, /messages\/\{messageId\}[\s\S]*?allow create, update: if false;/);
  // Deletes are the author or the captain.
  assert.match(rules, /resource\.data\.get\('authorId', ''\) == request\.auth\.uid \|\| isCrewCaptainOf/);
});

test('server exposes the clubhouse endpoints', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.match(server, /app\.post\("\/api\/crew\/feed\/comments"/);
  assert.match(server, /app\.post\("\/api\/crew\/chat\/messages"/);
  assert.match(server, /notifyCrewMemberJoined/);
});
