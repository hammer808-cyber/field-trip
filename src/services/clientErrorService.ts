/**
 * Client-error capture + stale-chunk auto-reload (Nov 21, 2026 — Option A).
 *
 * The error boundary used to log to console.error only, which is
 * invisible on a phone, so the "THIS PAGE DIDN'T LOAD" screen was a
 * mystery. Now every caught error is reported to POST /api/client-errors
 * (server writes one doc per error to the `clientErrors` collection),
 * and a chunk-load failure reloads once automatically instead of showing
 * the screen. Nothing here ever throws: a failed report just means that
 * one occurrence goes unrecorded.
 */
import { authenticatedFetch } from '../lib/api';
import {
  consumeStaleChunkReload,
  getSessionStorageLike,
  isChunkLoadError,
  type StorageLike,
} from '../logic/staleChunk';

export type ClientErrorKind = 'chunk' | 'render';

export interface ClientErrorReport {
  kind: ClientErrorKind;
  name: string;
  message: string;
  stack: string;
  route: string;
  userAgent: string;
}

const MAX_NAME = 200;
const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;
const MAX_ROUTE = 300;
const MAX_USER_AGENT = 300;

/** How long the reload waits for the report before going anyway. */
export const CLIENT_ERROR_REPORT_TIMEOUT_MS = 800;

function capString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.length > max ? value.slice(0, max) : value;
}

/** Client-side sanitizer. The server re-sanitizes (authoritative). */
export function sanitizeClientErrorReport(input: {
  kind?: unknown;
  name?: unknown;
  message?: unknown;
  stack?: unknown;
  route?: unknown;
  userAgent?: unknown;
}): ClientErrorReport {
  return {
    kind: input.kind === 'chunk' ? 'chunk' : 'render',
    name: capString(input.name, MAX_NAME),
    message: capString(input.message, MAX_MESSAGE),
    stack: capString(input.stack, MAX_STACK),
    route: capString(input.route, MAX_ROUTE),
    userAgent: capString(input.userAgent, MAX_USER_AGENT),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fire-and-forget report. Never throws and never rejects: callers do
 * not need to await it, and a failed report must not break the boundary.
 */
export async function reportClientError(
  error: Error | null | undefined,
  kind: ClientErrorKind,
): Promise<void> {
  try {
    const route =
      typeof window !== 'undefined' ? window.location.pathname : '';
    const userAgent =
      typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const report = sanitizeClientErrorReport({
      kind,
      name: error?.name,
      message: error?.message,
      stack: (error as Error | null)?.stack,
      route,
      userAgent,
    });
    await authenticatedFetch('/api/client-errors', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  } catch (err) {
    console.error('[clientError] report failed:', err);
  }
}

export interface HandleCaughtErrorOptions {
  /** Defaults to sessionStorage; pass null to disable auto-reload. */
  storage?: StorageLike | null;
  /** Defaults to window.location.reload(). Injectable for tests. */
  reload?: () => void;
  /** Defaults to reportClientError. Injectable for tests. */
  report?: (error: Error | null | undefined, kind: ClientErrorKind) => Promise<void>;
}

/**
 * Called from ErrorBoundary.componentDidCatch. Classifies the error,
 * reports it, and reloads once when it is a stale chunk. The reload
 * waits for the report with an 800ms race so a slow report never holds
 * the recovery hostage.
 */
export async function handleCaughtError(
  error: Error | null | undefined,
  opts: HandleCaughtErrorOptions = {},
): Promise<void> {
  const kind: ClientErrorKind = isChunkLoadError(error) ? 'chunk' : 'render';
  const reportFn = opts.report ?? reportClientError;
  // The report must never break recovery: a failed report resolves void.
  const reportPromise = reportFn(error, kind).catch(() => {});
  const storage =
    opts.storage !== undefined ? opts.storage : getSessionStorageLike();
  if (
    kind === 'chunk' &&
    consumeStaleChunkReload(String(error?.message || ''), storage)
  ) {
    await Promise.race([reportPromise, delay(CLIENT_ERROR_REPORT_TIMEOUT_MS)]);
    const reload =
      opts.reload ??
      (() => {
        if (typeof window !== 'undefined') window.location.reload();
      });
    reload();
    return;
  }
  // Non-chunk errors show the fallback screen; the report runs in the
  // background. Awaiting it here is harmless and keeps the promise from
  // floating unobserved.
  await reportPromise;
}
