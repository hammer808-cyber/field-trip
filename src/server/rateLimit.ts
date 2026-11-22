/**
 * Auth rate limiter (Nov 21, 2026 — first-time-user blocker fix).
 *
 * The old limiter was IP-keyed at 120 requests / 15 min, shared across
 * EVERY authenticated endpoint. A new user doing the first three missions
 * back-to-back fires ~30 authenticated calls in minutes (draw, submit,
 * notify, link-entry, sticker evaluation, level-up, config reads) — and
 * on mobile carrier CGNAT that 120 bucket is shared with strangers on
 * the same public IP. Once tripped, EVERY authenticated call 429s with
 * TOO_MANY_AUTH_REQUESTS for the rest of the window, including
 * POST /api/missions/attempts/start — which blocks Capture from opening
 * the mission and blocks the submit. That is the "too many auth" dead
 * end Zach reported.
 *
 * The fix keys the bucket by authenticated user instead of by IP:
 *
 * - A request carrying a Bearer token gets the bucket
 *   `user:<uid>@<ip>` — one bucket per user, so another user's traffic
 *   (or a stranger behind the same CGNAT IP) can never drain yours.
 *   The uid comes from DECODING the JWT payload only (base64url, no
 *   signature check). Decoding is not verification: `authenticate` in
 *   server.ts still verifies the token before any handler runs, and a
 *   forged token only ever spends the attacker's own bucket, because
 *   the key also carries the request IP — a token claiming someone
 *   else's uid from a different IP lands in a different bucket.
 * - A request with no (or undecodable) Bearer token falls back to the
 *   plain IP bucket, so unauthenticated floods are still limited.
 *
 * Caps: an authenticated user gets 300 / 15 min (the same as the admin
 * limiter — a heavy first session is ~20-40 calls, so this is ~10x
 * headroom while still bounding a single-account flood). A token-less
 * request keeps the old 120 / 15 min per IP. The error string is
 * unchanged (TOO_MANY_AUTH_REQUESTS) so existing client handling does
 * not churn; the client maps it to a friendly retry message.
 *
 * express-rate-limit v8 validates custom keyGenerators: a generator
 * whose source mentions `req.ip` must also call the `ipKeyGenerator`
 * helper (IPv6 subnet masking), or the limiter throws at creation.
 * The IP part below goes through `ipKeyGenerator` for exactly that
 * reason — do not inline `req.ip` into the key string.
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/** Rate-limit window for authenticated endpoints. */
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Per-user cap: an authenticated user may make this many calls per window. */
export const AUTH_RATE_LIMIT_MAX_AUTHENTICATED = 300;

/** Per-IP cap for requests with no (or undecodable) Bearer token. */
export const AUTH_RATE_LIMIT_MAX_ANONYMOUS = 120;

/**
 * Decode the `sub` (Firebase uid) out of a Bearer ID token without
 * verifying it. Returns null when there is no token, it is not a
 * three-part JWT, the payload is not JSON, or it carries no `sub`.
 * Verification still happens in `authenticate`; this is bucketing only.
 */
export function decodeBearerSub(authorization: unknown): string | null {
  if (typeof authorization !== "string") return null;
  const match = /^Bearer\s+(\S+)$/.exec(authorization.trim());
  if (!match) return null;
  const parts = match[1].split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const sub = (payload as { sub?: unknown })?.sub;
    return typeof sub === "string" && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

/**
 * Bucket key for one request. Authenticated requests get their own
 * bucket per user (plus IP, so a forged token cannot spend someone
 * else's bucket from another IP); token-less requests share the IP
 * bucket.
 */
export function authRateLimitKey(req: any): string {
  const ipPart = ipKeyGenerator(req?.ip);
  const sub = decodeBearerSub(req?.headers?.authorization);
  return sub ? `user:${sub}@${ipPart}` : `${ipPart}`;
}

/** Authenticated users get the higher cap; token-less requests keep 120. */
export function authRateLimitMax(req: any): number {
  return decodeBearerSub(req?.headers?.authorization)
    ? AUTH_RATE_LIMIT_MAX_AUTHENTICATED
    : AUTH_RATE_LIMIT_MAX_ANONYMOUS;
}

/** The shared limiter for every authenticated player endpoint. */
export function createAuthRateLimiter() {
  return rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    max: authRateLimitMax,
    keyGenerator: authRateLimitKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "TOO_MANY_AUTH_REQUESTS" },
  });
}
