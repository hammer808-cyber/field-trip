import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  consumeStaleChunkReload,
  isChunkLoadError,
  STALE_CHUNK_RELOAD_KEY_PREFIX,
  type StorageLike,
} from '../logic/staleChunk';
import {
  handleCaughtError,
  sanitizeClientErrorReport,
  type ClientErrorKind,
} from '../services/clientErrorService';
import { sanitizeClientErrorBody } from '../server/clientErrors';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

/** Map-backed sessionStorage stand-in. */
function memoryStorage(): StorageLike & { size: number; keys: () => string[] } {
  const map = new Map<string, string>();
  return {
    get size() {
      return map.size;
    },
    keys: () => [...map.keys()],
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

const CHUNK_MESSAGES = [
  'Failed to fetch dynamically imported module: https://field-trip-hn2e.onrender.com/assets/Deck-AbC123.js',
  'Importing a module script failed.',
  'Loading chunk 42 failed.',
  "Unexpected token '<', \"<!doctype \"... is not valid JSON",
];

test('stale chunks: isChunkLoadError matches every known chunk-load signature', () => {
  for (const message of CHUNK_MESSAGES) {
    const error = new Error(message);
    assert.equal(isChunkLoadError(error), true, message);
  }
  const named = new Error('something broke while loading');
  named.name = 'ChunkLoadError';
  assert.equal(isChunkLoadError(named), true, 'ChunkLoadError name');
});

test('stale chunks: isChunkLoadError rejects ordinary render errors and null', () => {
  const renderErrors = [
    "Cannot read properties of undefined (reading 'map')",
    'Objects are not valid as a React child (found: object with keys {})',
    'Rendered more hooks than during the previous render.',
    'Maximum update depth exceeded.',
  ];
  for (const message of renderErrors) {
    assert.equal(isChunkLoadError(new Error(message)), false, message);
  }
  assert.equal(isChunkLoadError(null), false);
  assert.equal(isChunkLoadError(undefined), false);
});

test('stale chunks: guard allows one reload per distinct message, then blocks', () => {
  const storage = memoryStorage();
  const first = CHUNK_MESSAGES[0];
  const second = CHUNK_MESSAGES[1];
  assert.equal(consumeStaleChunkReload(first, storage), true);
  assert.equal(consumeStaleChunkReload(first, storage), false, 'same message again');
  assert.equal(consumeStaleChunkReload(second, storage), true, 'different message');
  assert.equal(storage.size, 2, 'one key per distinct message');
});

test('stale chunks: guard keys live under the fieldtrip prefix', () => {
  const storage = memoryStorage();
  consumeStaleChunkReload(CHUNK_MESSAGES[0], storage);
  assert.equal(storage.size, 1);
  assert.ok(
    storage.keys()[0].startsWith(STALE_CHUNK_RELOAD_KEY_PREFIX),
    `key should start with ${STALE_CHUNK_RELOAD_KEY_PREFIX}`,
  );
});

test('stale chunks: guard never reloads without storage', () => {
  assert.equal(consumeStaleChunkReload(CHUNK_MESSAGES[0], null), false);
  assert.equal(consumeStaleChunkReload(CHUNK_MESSAGES[0], undefined), false);
});

test('stale chunks: handleCaughtError reloads once on a chunk error', async () => {
  const storage = memoryStorage();
  let reloads = 0;
  let reported: { kind: ClientErrorKind } | null = null;
  const opts = {
    storage,
    reload: () => {
      reloads++;
    },
    report: async (_error: Error | null | undefined, kind: ClientErrorKind) => {
      reported = { kind };
    },
  };
  await handleCaughtError(new Error(CHUNK_MESSAGES[0]), opts);
  assert.equal(reloads, 1, 'first chunk error reloads');
  assert.deepEqual(reported, { kind: 'chunk' });
  await handleCaughtError(new Error(CHUNK_MESSAGES[0]), opts);
  assert.equal(reloads, 1, 'same chunk error does not reload twice');
});

test('stale chunks: handleCaughtError never reloads on a render error', async () => {
  const storage = memoryStorage();
  let reloads = 0;
  let reported: { kind: ClientErrorKind } | null = null;
  await handleCaughtError(new Error("Cannot read properties of undefined (reading 'map')"), {
    storage,
    reload: () => {
      reloads++;
    },
    report: async (_error: Error | null | undefined, kind: ClientErrorKind) => {
      reported = { kind };
    },
  });
  assert.equal(reloads, 0);
  assert.deepEqual(reported, { kind: 'render' });
});

test('stale chunks: handleCaughtError still reloads when the report fails', async () => {
  const storage = memoryStorage();
  let reloads = 0;
  await handleCaughtError(new Error(CHUNK_MESSAGES[2]), {
    storage,
    reload: () => {
      reloads++;
    },
    report: async () => {
      throw new Error('network down');
    },
  });
  assert.equal(reloads, 1, 'a failed report must not block recovery');
});

test('client errors: client sanitizer caps lengths and defaults kind', () => {
  const report = sanitizeClientErrorReport({
    kind: 'nonsense',
    name: 'x'.repeat(500),
    message: 'y'.repeat(5000),
    stack: 'z'.repeat(9000),
    route: '/dex/zines?tab=personal'.repeat(50),
    userAgent: 'u'.repeat(900),
  });
  assert.equal(report.kind, 'render');
  assert.equal(report.name.length, 200);
  assert.equal(report.message.length, 1000);
  assert.equal(report.stack.length, 4000);
  assert.equal(report.route.length, 300);
  assert.equal(report.userAgent.length, 300);
  const chunk = sanitizeClientErrorReport({ kind: 'chunk', message: 'Failed to fetch dynamically imported module: x' });
  assert.equal(chunk.kind, 'chunk');
  assert.equal(chunk.name, '');
});

test('client errors: server sanitizer is authoritative on the same caps', () => {
  const record = sanitizeClientErrorBody({
    kind: 'chunk',
    name: 'n'.repeat(300),
    message: 'm'.repeat(2000),
    stack: 's'.repeat(5000),
    route: 'r'.repeat(400),
    userAgent: 'a'.repeat(400),
    uid: 'should-be-ignored',
  });
  assert.equal(record.kind, 'chunk');
  assert.equal(record.name.length, 200);
  assert.equal(record.message.length, 1000);
  assert.equal(record.stack.length, 4000);
  assert.equal(record.route.length, 300);
  assert.equal(record.userAgent.length, 300);
  assert.equal((record as Record<string, unknown>).uid, undefined, 'uid comes from auth, never the body');
  const empty = sanitizeClientErrorBody(null);
  assert.equal(empty.kind, 'render');
});

test('client errors: server registers POST /api/client-errors behind auth', () => {
  const server = read('server.ts');
  assert.match(server, /app\.post\(\s*"\/api\/client-errors",\s*authRateLimiter,\s*authenticate,/);
  assert.match(server, /createClientErrorHandler\(\(\) => \(dbAdmin \? createAdminClientErrorStore\(dbAdmin\) : null\)\)/);
  const clientErrors = read('src/server/clientErrors.ts');
  assert.match(clientErrors, /collection\('clientErrors'\)/);
});

test('client errors: ErrorBoundary reports and the route fallback shows the error', () => {
  const boundary = read('src/components/ErrorBoundary.tsx');
  assert.match(boundary, /handleCaughtError/);
  assert.match(boundary, /void handleCaughtError\(error\)/);
  const app = read('src/App.tsx');
  assert.match(app, /fallback=\{\(error: Error \| null\) => \(/);
  assert.match(app, /details=\{error \? `\$\{error\.name\}: \$\{error\.message\}` : undefined\}/);
  assert.match(app, /detailsId="error-details"/);
});
