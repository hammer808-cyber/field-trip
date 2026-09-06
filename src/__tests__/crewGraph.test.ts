import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCrewGraphSnapshot,
  composeCrewSocialFeed,
  deriveCrewRelationshipState,
  getCrewConnectionId,
  getCrewSocialExclusionReasons,
  isAcceptedCrewWith,
  isPermittedInCrewSocialFeed,
  isValidPlayerSearchQuery,
  pendingRequestIsNotAcceptedCrew,
  publicPlayerIdentityHasPrivateLeak,
  resolveCrewConnectionWrite,
  toPublicPlayerIdentity,
  type CrewConnectionRecord,
} from '../logic/crewGraph';

function connection(overrides: Partial<CrewConnectionRecord> = {}): CrewConnectionRecord {
  return {
    id: getCrewConnectionId('player-a', 'player-b'),
    userLow: 'player-a',
    userHigh: 'player-b',
    participants: ['player-a', 'player-b'],
    requesterId: 'player-a',
    addresseeId: 'player-b',
    status: 'pending',
    ...overrides,
  };
}

test('pair ids are deterministic and independent of request direction', () => {
  assert.equal(getCrewConnectionId('player-b', 'player-a'), getCrewConnectionId('player-a', 'player-b'));
  assert.equal(getCrewConnectionId('aaa', 'zzz').includes('::'), true);
});

test('relationship state distinguishes none, outgoing, incoming, accepted, and blocked', () => {
  assert.equal(deriveCrewRelationshipState({ viewerUserId: 'player-a' }), 'none');
  assert.equal(deriveCrewRelationshipState({ viewerUserId: 'player-a', connection: connection({ status: 'declined' }) }), 'none');
  assert.equal(deriveCrewRelationshipState({ viewerUserId: 'player-a', connection: connection({ status: 'removed' }) }), 'none');
  assert.equal(deriveCrewRelationshipState({ viewerUserId: 'player-a', connection: connection() }), 'outgoing_request');
  assert.equal(deriveCrewRelationshipState({ viewerUserId: 'player-b', connection: connection() }), 'incoming_request');
  assert.equal(deriveCrewRelationshipState({ viewerUserId: 'player-a', connection: connection({ status: 'accepted' }) }), 'accepted');
  assert.equal(deriveCrewRelationshipState({
    viewerUserId: 'player-a',
    connection: connection({ status: 'accepted' }),
    blockedUserIds: ['player-b'],
  }), 'blocked');
  assert.equal(deriveCrewRelationshipState({
    viewerUserId: 'player-a',
    connection: connection({ status: 'blocked' }),
  }), 'blocked');
});

test('pending request is not accepted Crew', () => {
  assert.equal(pendingRequestIsNotAcceptedCrew(connection()), true);
  assert.equal(pendingRequestIsNotAcceptedCrew(connection({ status: 'accepted' })), false);
  assert.equal(isAcceptedCrewWith(connection(), 'player-a', 'player-b'), false);
  assert.equal(isAcceptedCrewWith(connection({ status: 'accepted' }), 'player-a', 'player-b'), true);
});

test('duplicate send is idempotent and mutual requests accept', () => {
  const first = resolveCrewConnectionWrite({
    actorId: 'player-a',
    targetId: 'player-b',
    action: 'send_request',
    existing: null,
  });
  assert.equal(first.ok, true);
  assert.equal(first.idempotent, false);
  assert.equal(first.next?.status, 'pending');

  const duplicate = resolveCrewConnectionWrite({
    actorId: 'player-a',
    targetId: 'player-b',
    action: 'send_request',
    existing: connection(),
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.idempotent, true);
  assert.equal(duplicate.next?.status, 'pending');

  const mutual = resolveCrewConnectionWrite({
    actorId: 'player-b',
    targetId: 'player-a',
    action: 'send_request',
    existing: connection(),
  });
  assert.equal(mutual.ok, true);
  assert.equal(mutual.idempotent, false);
  assert.equal(mutual.next?.status, 'accepted');
});

test('accept and decline only work for the addressee', () => {
  const accept = resolveCrewConnectionWrite({
    actorId: 'player-b',
    targetId: 'player-a',
    action: 'accept',
    existing: connection(),
  });
  assert.equal(accept.ok, true);
  assert.equal(accept.next?.status, 'accepted');

  const doubleAccept = resolveCrewConnectionWrite({
    actorId: 'player-b',
    targetId: 'player-a',
    action: 'accept',
    existing: connection({ status: 'accepted' }),
  });
  assert.equal(doubleAccept.ok, true);
  assert.equal(doubleAccept.idempotent, true);

  const requesterCannotAccept = resolveCrewConnectionWrite({
    actorId: 'player-a',
    targetId: 'player-b',
    action: 'accept',
    existing: connection(),
  });
  assert.equal(requesterCannotAccept.ok, false);

  const decline = resolveCrewConnectionWrite({
    actorId: 'player-b',
    targetId: 'player-a',
    action: 'decline',
    existing: connection(),
  });
  assert.equal(decline.ok, true);
  assert.equal(decline.next?.status, 'declined');
});

test('remove clears accepted Crew and declined/removed can be requested again', () => {
  const remove = resolveCrewConnectionWrite({
    actorId: 'player-a',
    targetId: 'player-b',
    action: 'remove',
    existing: connection({ status: 'accepted' }),
  });
  assert.equal(remove.ok, true);
  assert.equal(remove.next?.status, 'removed');

  const rerequest = resolveCrewConnectionWrite({
    actorId: 'player-a',
    targetId: 'player-b',
    action: 'send_request',
    existing: connection({ status: 'removed' }),
  });
  assert.equal(rerequest.ok, true);
  assert.equal(rerequest.next?.status, 'pending');
});

test('blocked relationships cannot send or accept Crew requests', () => {
  const blockedSend = resolveCrewConnectionWrite({
    actorId: 'player-a',
    targetId: 'player-b',
    action: 'send_request',
    existing: null,
    actorBlockedTarget: true,
  });
  assert.equal(blockedSend.ok, false);
  assert.equal(blockedSend.error, 'BLOCKED');

  const blockedExisting = resolveCrewConnectionWrite({
    actorId: 'player-b',
    targetId: 'player-a',
    action: 'send_request',
    existing: connection({ status: 'blocked', blockedBy: 'player-a' }),
  });
  assert.equal(blockedExisting.ok, false);
  assert.equal(blockedExisting.error, 'BLOCKED');
});

test('self connections and missing ids are rejected', () => {
  assert.equal(resolveCrewConnectionWrite({
    actorId: 'player-a',
    targetId: 'player-a',
    action: 'send_request',
    existing: null,
  }).error, 'CANNOT_CONNECT_SELF');
});

test('graph snapshot groups accepted, incoming, and outgoing without duplicates', () => {
  const snapshot = buildCrewGraphSnapshot('player-a', [
    connection(),
    connection({
      id: getCrewConnectionId('player-a', 'player-c'),
      userLow: 'player-a',
      userHigh: 'player-c',
      participants: ['player-a', 'player-c'],
      requesterId: 'player-c',
      addresseeId: 'player-a',
    }),
    connection({
      id: getCrewConnectionId('player-a', 'player-d'),
      userLow: 'player-a',
      userHigh: 'player-d',
      participants: ['player-a', 'player-d'],
      requesterId: 'player-a',
      addresseeId: 'player-d',
      status: 'accepted',
    }),
  ]);
  assert.equal(snapshot.acceptedCount, 1);
  assert.equal(snapshot.incomingCount, 1);
  assert.equal(snapshot.outgoingCount, 1);
  assert.deepEqual(snapshot.acceptedUserIds, ['player-d']);
});

test('social feed includes own and accepted Crew activity, not unrelated or pending', () => {
  const own = { id: 'own', userId: 'player-a', feedVisibility: 'crew_only' };
  const crew = { id: 'crew', userId: 'player-c', feedVisibility: 'crew_only' };
  const pending = { id: 'pending', userId: 'player-d', feedVisibility: 'crew_only' };
  const unrelated = { id: 'stranger', userId: 'player-b', feedVisibility: 'crew_only' };
  const blocked = { id: 'blocked', userId: 'player-e', feedVisibility: 'crew_only' };
  const featured = { id: 'public', userId: 'player-b', feedVisibility: 'public_discovery' };
  const privateCrew = { id: 'private', userId: 'player-c', feedVisibility: 'private' };
  const scope = {
    viewerUserId: 'player-a',
    acceptedCrewUserIds: ['player-c'],
    blockedUserIds: ['player-e'],
  };

  assert.equal(isPermittedInCrewSocialFeed(own, scope), true);
  assert.equal(isPermittedInCrewSocialFeed(crew, scope), true);
  assert.equal(isPermittedInCrewSocialFeed(pending, scope), false);
  assert.equal(isPermittedInCrewSocialFeed(unrelated, scope), false);
  assert.equal(isPermittedInCrewSocialFeed(blocked, scope), false);
  assert.equal(isPermittedInCrewSocialFeed(featured, scope), true);
  assert.equal(isPermittedInCrewSocialFeed(privateCrew, scope), false);
  assert.ok(getCrewSocialExclusionReasons(unrelated, scope).includes('outside_social_scope'));

  const composed = composeCrewSocialFeed([own, crew, pending, unrelated, blocked, featured, privateCrew], scope);
  assert.deepEqual(composed.map(entry => entry.id).sort(), ['crew', 'own', 'public']);
});

test('public player identity strips private fields and search requires intent', () => {
  const identity = toPublicPlayerIdentity({
    id: 'player-b',
    displayName: 'Bravo',
    username: 'socialb',
    email: 'secret@example.com',
    isAdmin: true,
    role: 'admin',
    fieldType: 'the-gobbler',
    fieldTypeName: 'The Gobbler',
    level: 4,
    levelTitle: 'Person of Mild Interest',
  }, 'player-b');
  assert.equal(identity.displayName, 'Bravo');
  assert.equal(identity.username, 'socialb');
  assert.equal(identity.fieldTypeName, 'The Gobbler');
  assert.equal(publicPlayerIdentityHasPrivateLeak(identity as unknown as Record<string, unknown>), false);
  assert.equal(isValidPlayerSearchQuery('s'), false);
  assert.equal(isValidPlayerSearchQuery('socialb'), true);
  assert.equal(isValidPlayerSearchQuery('  '), false);
});
