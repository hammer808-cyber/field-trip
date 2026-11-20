import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const app = read('src/App.tsx');

test('frontlines: the route still exists so admins can reach the page', () => {
  assert.match(app, /<Route path="\/frontlines" element=\{<Frontlines \/>} \/>/);
});

test('frontlines: non-admin players are redirected to /big-board', () => {
  // P1-15 (Nov 20, 2026): players reach one scoreboard only (Big Board).
  // The guard sits in AppLayout after the auth gate, so it only fires for
  // logged-in users, and after the loading gate, so isAdmin is settled.
  assert.match(
    app,
    /if \(location\.pathname === '\/frontlines' && !isAdmin\) \{\s*return <Navigate to="\/big-board" replace \/>;\s*\}/,
  );
});

test('frontlines: admin access is unchanged', () => {
  // The AdminDevTools quick jump still links to /frontlines, and the
  // bottom nav still shows on /frontlines, so an admin's visit looks
  // exactly as it did before P1-15.
  const devTools = read('src/pages/AdminDevTools.tsx');
  assert.match(devTools, /\{ label: 'Frontlines', path: '\/frontlines', icon: Trophy \}/);
  assert.match(app, /'\/frontlines'/);
});

test('frontlines: no player-facing surface links to /frontlines', () => {
  // Walk every source file outside the allowlist and fail on any literal
  // '/frontlines' path. Allowlisted: App.tsx (the route + the redirect
  // guard), AdminDevTools.tsx (admin-only quick jump), Frontlines.tsx
  // itself, and the test files (which pin this behaviour).
  // Note: PlayerPageShell/departments.css use the bare department id
  // 'frontlines' (no leading slash) for the admin page's own skin — that
  // is not a link and is intentionally untouched.
  const allowed = new Set([
    'src/App.tsx',
    'src/pages/AdminDevTools.tsx',
    'src/pages/Frontlines.tsx',
  ]);
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = full.slice(repoRoot.length + 1);
      if (statSync(full).isDirectory()) {
        if (entry === '__tests__' || entry === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (!/\.(tsx?|css)$/.test(entry) || allowed.has(rel)) continue;
      if (readFileSync(full, 'utf8').includes('/frontlines')) offenders.push(rel);
    }
  };
  walk(join(repoRoot, 'src'));
  assert.deepEqual(offenders, [], 'player-facing files still linking to /frontlines');
});
