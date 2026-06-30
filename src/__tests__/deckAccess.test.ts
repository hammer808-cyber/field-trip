import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeckAccess } from '../logic/deckAccess';
import { DeckPack } from '../types/deckPacks';

const baseDeck: DeckPack = {
  packId: 'private-deck',
  packName: 'Private Deck',
  shortName: 'Private',
  description: 'Restricted deck',
  missionIds: ['mission-1'],
  unlockRule: 'immediate',
  visibility: 'public',
  isActive: true,
  fallbackIcon: 'Lock',
  sortOrder: 1
};

test('public decks are visible and playable', () => {
  const access = getDeckAccess(baseDeck, { userId: 'u1', profile: { id: 'u1' } });
  assert.equal(access.visible, true);
  assert.equal(access.playable, true);
});

test('assigned user decks allow assigned users and hide unassigned users by default', () => {
  const deck = { ...baseDeck, visibility: 'assigned_users' as const, assignedUserIds: ['u1'] };
  assert.equal(getDeckAccess(deck, { userId: 'u1', profile: { id: 'u1' } }).playable, true);
  const denied = getDeckAccess(deck, { userId: 'u2', profile: { id: 'u2' } });
  assert.equal(denied.visible, false);
  assert.equal(denied.playable, false);
});

test('locked teasers are visible but not playable and do not grant access', () => {
  const deck = { ...baseDeck, visibility: 'assigned_users' as const, assignedUserIds: ['u1'], showLockedTeaser: true };
  const access = getDeckAccess(deck, { userId: 'u2', profile: { id: 'u2' } });
  assert.equal(access.visible, true);
  assert.equal(access.playable, false);
  assert.equal(access.reason, 'Private field assignment');
});

test('crew-only decks allow only members of allowed crews', () => {
  const deck = { ...baseDeck, visibility: 'crew_only' as const, allowedCrewIds: ['crew-a'] };
  assert.equal(getDeckAccess(deck, { userId: 'u1', profile: { id: 'u1', crewId: 'crew-a' } }).playable, true);
  assert.equal(getDeckAccess(deck, { userId: 'u1', profile: { id: 'u1', crewId: 'crew-b' } }).playable, false);
});

test('invite-code decks unlock after profile redemption', () => {
  const deck = { ...baseDeck, visibility: 'invite_code' as const, inviteCode: 'FT-SECRET' };
  assert.equal(getDeckAccess(deck, { userId: 'u1', profile: { id: 'u1' } }).playable, false);
  assert.equal(getDeckAccess(deck, {
    userId: 'u1',
    profile: { id: 'u1', deckInviteRedemptions: { 'private-deck': { redeemedAt: 'now' } } }
  }).playable, true);
});

test('expired decks are not playable', () => {
  const deck = { ...baseDeck, accessEndsAt: '2026-01-01T00:00:00Z', showLockedTeaser: true };
  const access = getDeckAccess(deck, {
    userId: 'u1',
    profile: { id: 'u1' },
    now: new Date('2026-06-01T00:00:00Z')
  });
  assert.equal(access.visible, true);
  assert.equal(access.playable, false);
});

test('admins can access every deck visibility', () => {
  const deck = { ...baseDeck, visibility: 'admin_only' as const };
  const access = getDeckAccess(deck, { userId: 'admin', profile: { id: 'admin' }, isAdmin: true });
  assert.equal(access.visible, true);
  assert.equal(access.playable, true);
});
