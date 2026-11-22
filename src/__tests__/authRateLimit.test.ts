/**
 * Auth rate limiter (Nov 21, 2026 — first-time-user blocker fix).
 *
 * The old limiter was IP-keyed at 120 requests / 15 min across every
 * authenticated endpoint. A new user doing the first three missions
 * back-to-back fires ~30 authenticated calls in minutes — and on mobile
 * carrier CGNAT that bucket is shared with strangers on the same public
 * IP. Once tripped, EVERY authenticated call 429s with
 * TOO_MANY_AUTH_REQUESTS, including POST /api/missions/attempts/start,
 * which blocks Capture from opening the mission and blocks the submit.
 *
 * These tests drive the REAL express-rate-limit middleware with mock
 * request/response objects: the first-time burst must pass, two users
 * on one IP must not share a bucket, and the abuse protection must
 * still hold (per-user cap, and the old 120 cap for token-less floods).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import {
  AUTH_RATE_LIMIT_MAX_ANONYMOUS,
  AUTH_RATE_LIMIT_MAX_AUTHENTICATED,
  authRateLimitKey,
  authRateLimitMax,
  createAuthRateLimiter,
  decodeBearerSub
} from '../server/rateLimit';

const IP_A = '203.0.113.7';
const IP_B = '198.51.100.23';

function fakeJwt(sub: string): string {
  const payload = Buffer.from(JSON.stringify({ sub })).toString('base64url');
  return `header.${payload}.sig`;
}

function makeReq(ip: string, sub: string | null) {
  return {
    ip,
    headers: sub ? { authorization: `Bearer ${fakeJwt(sub)}` } : {},
  };
}

function makeRes() {
  const res: any = {
    headersSent: false,
    headers: {} as Record<string, string>,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    getHeader(key: string) {
      return this.headers[key];
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res;
}

async function drive(limiter: any, req: any): Promise<{ allowed: boolean; statusCode: number }> {
  const res = makeRes();
  let nextCalled = false;
  await limiter(req, res, () => {
    nextCalled = true;
  });
  return { allowed: nextCalled, statusCode: res.statusCode };
}

/**
 * The authenticated API calls of a first-time user's first three
 * missions back-to-back: session config reads, the starter-pack and
 * first-draw evaluations, then per mission attempts/start,
 * notify-submitted, link-entry, and ONE batched submit evaluation,
 * plus the level-up evaluation when mission 3 crosses level 2.
 * 17 requests total — the shape that used to trip the old bucket.
 */
function firstTimeBurst(sub: string, ip: string) {
  const reqs: any[] = [];
  const push = () => reqs.push(makeReq(ip, sub));
  push(); // GET /api/decks/access-configs (session start)
  push(); // GET /api/challenges/accessible (session start)
  push(); // POST /api/stickers/evaluate — starter_pack (quiz)
  push(); // POST /api/stickers/evaluate — first_draw
  for (let mission = 0; mission < 3; mission++) {
    push(); // POST /api/missions/attempts/start
    push(); // POST /api/entries/:id/notify-submitted
    push(); // POST /api/missions/attempts/link-entry
    push(); // POST /api/stickers/evaluate — submit bundle (was 5 calls)
  }
  push(); // POST /api/stickers/evaluate — level_up
  return reqs;
}

test('decodeBearerSub: reads sub from a Bearer JWT, null otherwise', () => {
  assert.equal(decodeBearerSub(`Bearer ${fakeJwt('user-1')}`), 'user-1');
  assert.equal(decodeBearerSub(undefined), null);
  assert.equal(decodeBearerSub('Bearer not-a-jwt'), null);
  assert.equal(decodeBearerSub('Bearer a.b.c'), null);
  const noSub = `header.${Buffer.from(JSON.stringify({ iss: 'x' })).toString('base64url')}.sig`;
  assert.equal(decodeBearerSub(`Bearer ${noSub}`), null);
});

test('keying: one bucket per user, not per IP', () => {
  const userA = authRateLimitKey(makeReq(IP_A, 'user-a'));
  const userAOtherIp = authRateLimitKey(makeReq(IP_B, 'user-a'));
  const userB = authRateLimitKey(makeReq(IP_A, 'user-b'));
  assert.notEqual(userA, userB, 'different users on one IP get different buckets');
  assert.notEqual(userA, userAOtherIp, 'the same user on a different IP is a different bucket');
  assert.equal(authRateLimitKey(makeReq(IP_A, null)), ipKeyGenerator(IP_A), 'token-less requests fall back to the IP bucket');
  assert.equal(authRateLimitKey(makeReq(IP_A, null)), authRateLimitKey(makeReq(IP_A, null)), 'the IP fallback is stable');
});

test('caps: authenticated users get 300, token-less requests keep 120', () => {
  assert.equal(authRateLimitMax(makeReq(IP_A, 'user-a')), AUTH_RATE_LIMIT_MAX_AUTHENTICATED);
  assert.equal(AUTH_RATE_LIMIT_MAX_AUTHENTICATED, 300);
  assert.equal(authRateLimitMax(makeReq(IP_A, null)), AUTH_RATE_LIMIT_MAX_ANONYMOUS);
  assert.equal(AUTH_RATE_LIMIT_MAX_ANONYMOUS, 120);
});

test('burst: a first-time user doing three missions back-to-back does not 429', async () => {
  const limiter = createAuthRateLimiter();
  for (const req of firstTimeBurst('user-a', IP_A)) {
    const result = await drive(limiter, req);
    assert.equal(result.allowed, true, 'every call in the first-time burst passes');
    assert.equal(result.statusCode, 200);
  }
});

test('burst: two users on one carrier IP do not share a bucket', async () => {
  const limiter = createAuthRateLimiter();
  const both = [...firstTimeBurst('user-a', IP_A), ...firstTimeBurst('user-b', IP_A)];
  for (const req of both) {
    const result = await drive(limiter, req);
    assert.equal(result.allowed, true, 'a second user on the same IP still passes');
  }
});

test('repro: the old IP-keyed 120 cap trips on the same traffic', async () => {
  const oldLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'TOO_MANY_AUTH_REQUESTS' },
  });
  // Two first-time bursts (34 calls) plus ordinary browsing traffic on
  // the same carrier IP — the shape that blocked Zach's new user.
  const traffic = [...firstTimeBurst('user-a', IP_A), ...firstTimeBurst('user-b', IP_A)];
  for (let i = 0; i < 90; i++) traffic.push(makeReq(IP_A, `user-bg-${i % 5}`));
  let blocked = 0;
  for (const req of traffic) {
    const result = await drive(oldLimiter, req);
    if (!result.allowed) blocked++;
  }
  assert.ok(blocked > 0, `the old 120/IP bucket must trip on ${traffic.length} calls from one IP (blocked ${blocked})`);
  // The same traffic passes under the new limiter.
  const limiter = createAuthRateLimiter();
  for (const req of traffic) {
    const result = await drive(limiter, req);
    assert.equal(result.allowed, true, 'the same traffic passes once keyed per user');
  }
});

test('abuse: one user still hits a cap at 300', async () => {
  const limiter = createAuthRateLimiter();
  for (let i = 0; i < 300; i++) {
    const result = await drive(limiter, makeReq(IP_A, 'user-a'));
    assert.equal(result.allowed, true, `call ${i + 1} of 300 passes`);
  }
  const over = await drive(limiter, makeReq(IP_A, 'user-a'));
  assert.equal(over.allowed, false, 'call 301 is rate-limited');
  assert.equal(over.statusCode, 429);
});

test('abuse: token-less floods from one IP still hit the 120 cap', async () => {
  const limiter = createAuthRateLimiter();
  for (let i = 0; i < 120; i++) {
    const result = await drive(limiter, makeReq(IP_A, null));
    assert.equal(result.allowed, true, `anonymous call ${i + 1} of 120 passes`);
  }
  const over = await drive(limiter, makeReq(IP_A, null));
  assert.equal(over.allowed, false, 'anonymous call 121 is rate-limited');
  assert.equal(over.statusCode, 429);
});

test('wiring: server.ts uses the per-user limiter on the evaluate route', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.ok(
    server.includes('import { createAuthRateLimiter } from "./src/server/rateLimit"'),
    'server.ts imports the limiter factory'
  );
  assert.ok(server.includes('createAuthRateLimiter()'), 'server.ts builds the limiter from the factory');
  assert.ok(
    server.includes('app.post("/api/stickers/evaluate", authRateLimiter, authenticate,'),
    'evaluate stays behind authRateLimiter + authenticate'
  );
});
