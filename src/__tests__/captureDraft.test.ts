import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CAPTURE_DRAFT_VERSION,
  clearCaptureDraft,
  captureDraftKey,
  downscalePhotoDataUrl,
  loadCaptureDraft,
  saveCaptureDraft,
  type CaptureDraft,
} from '../logic/captureDraft';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// P1-3 (audit §12): leaving Capture mid-way used to lose the photo and
// the note text — only booleans reach Firestore through tripProgress.
// A draft is the evidence itself, kept locally per user + mission.

/** In-memory localStorage stand-in; node:test has no DOM storage. */
function installFakeStorage(options?: { throwOnPhoto?: boolean; throwAlways?: boolean }) {
  const store = new Map<string, string>();
  const fake = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (options?.throwAlways) throw new Error('QuotaExceededError');
      if (options?.throwOnPhoto && value.includes('"photoDataUrl":"data:')) {
        throw new Error('QuotaExceededError');
      }
      store.set(key, value);
    },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  (globalThis as any).localStorage = fake;
  return store;
}

const baseDraft = (overrides: Partial<CaptureDraft> = {}): CaptureDraft => ({
  version: CAPTURE_DRAFT_VERSION,
  userId: 'user-1',
  missionId: 'socal-09',
  savedAt: 1_700_000_000_000,
  note: 'The fountain was still running at dusk.',
  photoDataUrl: 'data:image/jpeg;base64,/9j/4AAQAAAA',
  photoTakenAt: '2026-11-20T01:00:00.000Z',
  photoSource: 'camera',
  trustLevel: 'verifiedCamera',
  stickerId: 'mall_rat_sunglasses',
  stickerPlacement: { x: 50, y: 50 },
  submissionAttemptId: null,
  shareWithCommunity: null,
  ...overrides,
});

test('draft: key is per user + mission, mission lowercased', () => {
  assert.equal(captureDraftKey('user-1', 'SOCAL-09'), 'fieldtrip_capture_draft:user-1:socal-09');
  assert.notEqual(captureDraftKey('user-1', 'socal-09'), captureDraftKey('user-2', 'socal-09'));
  assert.notEqual(captureDraftKey('user-1', 'socal-09'), captureDraftKey('user-1', 'socal-10'));
});

test('draft: save + load round-trips the note, photo, sticker, and metadata', () => {
  installFakeStorage();
  const draft = baseDraft();
  assert.equal(saveCaptureDraft(draft), 'saved');
  const loaded = loadCaptureDraft('user-1', 'socal-09');
  assert.deepEqual(loaded, draft);
});

test('draft: load rejects a stale version, another user, another mission, and corrupt JSON', () => {
  const store = installFakeStorage();
  saveCaptureDraft(baseDraft());
  assert.equal(loadCaptureDraft('user-1', 'socal-09')?.note, 'The fountain was still running at dusk.');

  store.set(captureDraftKey('user-1', 'socal-09'), JSON.stringify(baseDraft({ version: 0 as any })));
  assert.equal(loadCaptureDraft('user-1', 'socal-09'), null);

  store.set(captureDraftKey('user-1', 'socal-09'), JSON.stringify(baseDraft({ userId: 'user-2' })));
  assert.equal(loadCaptureDraft('user-1', 'socal-09'), null);

  store.set(captureDraftKey('user-1', 'socal-09'), JSON.stringify(baseDraft({ missionId: 'socal-10' })));
  assert.equal(loadCaptureDraft('user-1', 'socal-09'), null);

  store.set(captureDraftKey('user-1', 'socal-09'), '{not json');
  assert.equal(loadCaptureDraft('user-1', 'socal-09'), null);
});

test('draft: a quota error keeps the note and drops the photo', () => {
  const store = installFakeStorage({ throwOnPhoto: true });
  assert.equal(saveCaptureDraft(baseDraft()), 'saved-note-only');
  const loaded = loadCaptureDraft('user-1', 'socal-09');
  assert.equal(loaded?.note, 'The fountain was still running at dusk.');
  assert.equal(loaded?.photoDataUrl, null);
  assert.equal(store.get(captureDraftKey('user-1', 'socal-09'))?.includes('"photoDataUrl":null'), true);
});

test('draft: a note-only draft saves even when storage throws on photos', () => {
  installFakeStorage({ throwOnPhoto: true });
  assert.equal(saveCaptureDraft(baseDraft({ photoDataUrl: null })), 'saved');
});

test('draft: total storage failure reports failed, never throws', () => {
  installFakeStorage({ throwAlways: true });
  assert.equal(saveCaptureDraft(baseDraft()), 'failed');
  assert.equal(loadCaptureDraft('user-1', 'socal-09'), null);
  assert.doesNotThrow(() => clearCaptureDraft('user-1', 'socal-09'));
});

test('draft: clear removes only that mission’s draft', () => {
  const store = installFakeStorage();
  saveCaptureDraft(baseDraft());
  saveCaptureDraft(baseDraft({ missionId: 'socal-10' }));
  clearCaptureDraft('user-1', 'socal-09');
  assert.equal(loadCaptureDraft('user-1', 'socal-09'), null);
  assert.equal(loadCaptureDraft('user-1', 'socal-10')?.missionId, 'socal-10');
  assert.equal(store.size, 1);
});

test('draft: downscale passes small images through (Node has no canvas)', async () => {
  const small = 'data:image/jpeg;base64,/9j/4AAQAAAA';
  assert.equal(await downscalePhotoDataUrl(small), small);
});

test('draft: Capture wires the draft in — restore, persist, and clear on submit', () => {
  const capture = read('src/pages/Capture.tsx');
  assert.ok(capture.includes("from '../logic/captureDraft'"), 'Capture does not import the draft module');
  assert.ok(capture.includes('loadCaptureDraft(user.uid, tripIdParam)'), 'no draft load on mount');
  assert.ok(capture.includes('initialDraft?.photoDataUrl'), 'photo is not seeded from the draft');
  assert.ok(capture.includes("initialDraft?.note ?? ''"), 'note is not seeded from the draft');
  assert.ok(capture.includes("if (initialDraft?.photoDataUrl) return 'developing_polaroid'"), 'draft photo does not land on the clipboard state');
  assert.ok(capture.includes('downscalePhotoDataUrl(url)'), 'photo is not downscaled before saving');
  assert.ok(capture.includes('setTimeout(() => { persistDraft(); }, 500)'), 'note is not saved debounced');
  assert.ok(capture.includes('Draft restored'), 'no draft-restored notice in the UI');
  assert.ok(capture.includes('clearCaptureDraft(user.uid, tripIdParam)'), 'draft is never cleared');
  // The clear must sit in the success branch (next to the submitted
  // marker), not only in the guard — a stale draft must not resurrect.
  // (setSubmissionStatus('submitted') also appears in two unrelated
  // effects, so anchor on the success branch's own setFcState line.)
  const successIdx = capture.indexOf("setFcState('result'); // MOVE TO SUCCESS STEP");
  const submittedIdx = capture.indexOf("setSubmissionStatus('submitted')", successIdx);
  const clearIdx = capture.indexOf('clearCaptureDraft(user.uid, tripIdParam)', submittedIdx);
  assert.ok(successIdx > 0 && submittedIdx > successIdx && clearIdx > submittedIdx, 'missing submit-success or draft-clear marker');
  assert.ok(clearIdx - successIdx < 600, 'draft clear is not in the submit-success branch');
});
