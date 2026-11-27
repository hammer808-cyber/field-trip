import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatBypassPlayerOption } from '../services/stickerAdminService';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

/**
 * Grant Starter Bypass player picker (Nov 27, 2026 — Zach's ask: "the
 * bypass starter missions button on the q needs to be a drop-down menu of
 * all the players so that I can click on a player and not have to memorize
 * their big long number").
 *
 * The picker lists every player by name (and persona where known) with the
 * UID visible in the option, and grants to the selected player — the grant
 * itself (endpoint, reason prompt, report) is unchanged.
 */

test('bypass picker option shows name, handle, persona, and UID', () => {
  assert.equal(
    formatBypassPlayerOption({
      uid: 'oae0GwP7mpcUX7i93AeDGd22VNu2',
      email: 'hammer808@gmail.com',
      username: 'Zacking_off',
      displayName: 'Zach Hammer',
      photoURL: null,
      starterApprovedCount: 3,
      totalXP: 530,
      createdAt: null,
      lastLoginAt: null,
      fieldType: 'elondra',
      fieldTypeName: 'Elondra',
    }),
    'Zach Hammer (@Zacking_off) - Elondra - oae0GwP7mpcUX7i93AeDGd22VNu2',
  );
});

test('bypass picker option omits a redundant handle and an unknown persona', () => {
  assert.equal(
    formatBypassPlayerOption({
      uid: 'ap05XX3Wl5gQzsYWhRWnlHTogWf2',
      email: null,
      username: 'mexmax73',
      displayName: 'mexmax73',
      photoURL: null,
      starterApprovedCount: 0,
      totalXP: 0,
      createdAt: null,
      lastLoginAt: null,
      fieldType: null,
      fieldTypeName: null,
    }),
    'mexmax73 - ap05XX3Wl5gQzsYWhRWnlHTogWf2',
  );
});

test('bypass picker option falls back to Unknown player with the UID still visible', () => {
  assert.equal(
    formatBypassPlayerOption({
      uid: 'some-uid-only',
      email: null,
      username: '',
      displayName: '',
      photoURL: null,
      starterApprovedCount: 0,
      totalXP: 0,
      createdAt: null,
      lastLoginAt: null,
    }),
    'Unknown player - some-uid-only',
  );
});

test('bypass picker: server lists all players through the admin-only endpoint', () => {
  const server = read('server.ts');
  const start = server.indexOf('app.get("/api/admin/players"');
  assert.notEqual(start, -1, 'GET /api/admin/players route exists');
  const route = server.slice(start, server.indexOf('app.post("/api/admin/decks/', start));
  assert.match(route, /checkIsAdmin\(req\.user\)/);
  assert.match(route, /ADMIN_ONLY/);
  assert.match(route, /collection\('users'\)/);
  assert.match(route, /limit\(500\)/);
  assert.match(route, /serializeAdminUserLookup/);
  // The serializer carries the persona the picker shows.
  assert.match(server, /fieldType: data\.fieldType \|\| null/);
  assert.match(server, /fieldTypeName: data\.fieldTypeName \|\| data\.fieldType \|\| null/);
});

test('bypass picker: client lists players from the new endpoint, sorted by name', () => {
  const service = read('src/services/stickerAdminService.ts');
  assert.match(service, /export async function listAdminPlayers/);
  assert.match(service, /authenticatedFetch\('\/api\/admin\/players'\)/);
  assert.match(service, /localeCompare/);
});

test('bypass picker: the queue page renders a dropdown and grants to the selected player', () => {
  const page = read('src/pages/AdminProofReview.tsx');
  // A native select, populated from the fetched player list, with the UID
  // in every option label.
  assert.match(page, /id="starter-bypass-player"/);
  assert.match(page, /bypassPlayers\.map\(\(player\) =>/);
  assert.match(page, /formatBypassPlayerOption\(player\)/);
  // The selected player is verified on screen before granting.
  assert.match(page, /Selected: \{selectedBypassPlayer\.displayName/);
  assert.match(page, /UID \{selectedBypassPlayer\.uid\}/);
  // Grant is disabled until a player is picked, and sends the selected UID.
  assert.match(page, /disabled=\{grantingBypass \|\| !selectedBypassUid\}/);
  assert.match(page, /const targetUid = selectedBypassUid\.trim\(\)/);
  assert.match(page, /grantStarterSignalsBypass\(targetUid, reason\)/);
  // No more memorizing a UID: the UID prompt is gone, the reason prompt
  // (the confirmation step) stays.
  assert.doesNotMatch(page, /window\.prompt\('User UID/);
  assert.match(page, /window\.prompt\('Reason for bypass'/);
  // Loading, empty, and error states are plain.
  assert.match(page, /Loading players…/);
  assert.match(page, /No players found/);
  assert.match(page, /Player list failed/);
});
