/**
 * Client-error capture (Nov 21, 2026 — Option A, stale-chunk recovery).
 *
 * `POST /api/client-errors` records one doc per error caught by the
 * client ErrorBoundary in the `clientErrors` collection. Before this
 * build the boundary only logged to console.error, which is invisible
 * on a phone, so the "THIS PAGE DIDN'T LOAD" screen was a mystery. Now
 * the next occurrence — stale chunk or genuine render bug — is readable
 * in the Firebase console (collection `clientErrors`, newest first).
 *
 * Same rule as `voiceNoteTranscription.ts` / `stickerEvaluate.ts`: no
 * logic inline in `server.ts`. This module is dependency-injected — the
 * handler runs against a narrow `ClientErrorStore` interface, so unit
 * tests can run it with an in-memory fake instead of Firestore.
 * `server.ts` wires the real Admin SDK store.
 *
 * Honest limits (see `docs/stale-chunk-recovery-design.md`):
 * - The server re-sanitizes everything (authoritative); the client's
 *   caps are a courtesy, not a trust boundary.
 * - Writes are server-side via the Admin SDK, so no `firestore.rules`
 *   change. There is no admin UI in this build and no retention or
 *   cleanup — the collection is small (one doc per boundary catch).
 * - A failed report is invisible to the player by design: the client
 *   never throws on it, and a chunk error still reloads.
 */
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

export type ClientErrorKind = 'chunk' | 'render';

export interface ClientErrorRecord {
  uid: string;
  kind: ClientErrorKind;
  name: string;
  message: string;
  stack: string;
  route: string;
  userAgent: string;
}

export interface ClientErrorStore {
  add(record: ClientErrorRecord): Promise<string>;
}

export const MAX_CLIENT_ERROR_NAME = 200;
export const MAX_CLIENT_ERROR_MESSAGE = 1000;
export const MAX_CLIENT_ERROR_STACK = 4000;
export const MAX_CLIENT_ERROR_ROUTE = 300;
export const MAX_CLIENT_ERROR_USER_AGENT = 300;

function capString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.length > max ? value.slice(0, max) : value;
}

/** Server-side sanitizer (authoritative — the client caps are not trusted). */
export function sanitizeClientErrorBody(body: unknown): Omit<ClientErrorRecord, 'uid'> {
  const input = (body ?? {}) as Record<string, unknown>;
  return {
    kind: input.kind === 'chunk' ? 'chunk' : 'render',
    name: capString(input.name, MAX_CLIENT_ERROR_NAME),
    message: capString(input.message, MAX_CLIENT_ERROR_MESSAGE),
    stack: capString(input.stack, MAX_CLIENT_ERROR_STACK),
    route: capString(input.route, MAX_CLIENT_ERROR_ROUTE),
    userAgent: capString(input.userAgent, MAX_CLIENT_ERROR_USER_AGENT),
  };
}

export function createAdminClientErrorStore(db: Firestore): ClientErrorStore {
  return {
    async add(record: ClientErrorRecord): Promise<string> {
      const ref = await db.collection('clientErrors').add({
        ...record,
        createdAt: FieldValue.serverTimestamp(),
      });
      return ref.id;
    },
  };
}

export function createClientErrorHandler(getStore: () => ClientErrorStore | null) {
  return async (req: any, res: any) => {
    const callerUid = req.user?.uid;
    if (!callerUid) {
      return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in to report a client error.' });
    }
    const store = getStore();
    if (!store) {
      return res.status(500).json({ error: 'DB_ADMIN_NOT_READY' });
    }
    try {
      const record = sanitizeClientErrorBody(req.body);
      const id = await store.add({ ...record, uid: callerUid });
      return res.json({ success: true, id });
    } catch (error: any) {
      console.error('[CLIENT_ERROR] Failed:', error);
      return res.status(500).json({ error: 'CLIENT_ERROR_FAILED', message: error.message || String(error) });
    }
  };
}
