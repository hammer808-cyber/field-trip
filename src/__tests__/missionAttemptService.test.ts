/**
 * Mission attempt service (Nov 21, 2026 — first-time-user blocker fix).
 *
 * The blocker was `POST /api/missions/attempts/start` 429ing with the
 * raw limiter string `TOO_MANY_AUTH_REQUESTS`, which Capture showed
 * verbatim in the attempt-error box — and with no attempt, the submit
 * itself was dead. A 429 is transient, so the service now throws a
 * friendly retry message instead; Capture already renders it with its
 * "Retry mission setup" button.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  RATE_LIMITED_MESSAGE,
  startOrResumeMissionAttempt,
} from '../services/missionAttemptService';

const ATTEMPT = {
  attemptId: 'attempt-1',
  userId: 'user-1',
  missionId: 'socal-01',
  deckId: null,
  status: 'active',
  startedAt: new Date().toISOString(),
  timezone: 'America/Los_Angeles',
  localEligibilityDate: '2026-11-21',
  potentialMaxScoreAfterHint: 100,
  eligibleBonuses: [],
  appliedBonus: null,
  rotationId: 'r1',
  hint: { shortText: 'Look around.', example: null },
};

function stubFetch(status: number, body: unknown) {
  const original = globalThis.fetch;
  (globalThis as any).fetch = async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  return () => {
    (globalThis as any).fetch = original;
  };
}

test('a 429 on attempts/start throws the friendly retry message', async () => {
  const restore = stubFetch(429, { error: 'TOO_MANY_AUTH_REQUESTS' });
  try {
    await assert.rejects(
      () => startOrResumeMissionAttempt('socal-01'),
      (error: unknown) =>
        error instanceof Error && error.message === RATE_LIMITED_MESSAGE
    );
    assert.equal(
      RATE_LIMITED_MESSAGE,
      'Too many requests right now. Give it a minute, then try again.'
    );
  } finally {
    restore();
  }
});

test('a successful attempts/start still returns the attempt record', async () => {
  const restore = stubFetch(200, ATTEMPT);
  try {
    const attempt = await startOrResumeMissionAttempt('socal-01');
    assert.equal(attempt.attemptId, 'attempt-1');
    assert.equal(attempt.status, 'active');
  } finally {
    restore();
  }
});

test('a non-429 failure still surfaces the server error', async () => {
  const restore = stubFetch(500, { error: 'SOMETHING_BROKE' });
  try {
    await assert.rejects(
      () => startOrResumeMissionAttempt('socal-01'),
      (error: unknown) => error instanceof Error && error.message === 'SOMETHING_BROKE'
    );
  } finally {
    restore();
  }
});
