import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveCommunityShareDefault,
  resolveCommunityShareFields,
} from '../logic/communityShare';
import {
  clearCaptureDraft,
  loadCaptureDraft,
  saveCaptureDraft,
} from '../logic/captureDraft';

/** In-memory localStorage stand-in; node:test has no DOM storage. */
function installFakeStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  return store;
}

installFakeStorage();

test('share default: an explicit private choice starts OFF', () => {
  assert.equal(
    resolveCommunityShareDefault({ feedVisibility: 'private' }),
    false
  );
  assert.equal(
    resolveCommunityShareDefault({ privateApprovedPhotos: true }),
    false
  );
  assert.equal(
    resolveCommunityShareDefault({
      feedVisibility: 'public_discovery',
      privateApprovedPhotos: true,
    }),
    false
  );
});

test('share default: everything else starts ON so ballots can populate', () => {
  assert.equal(resolveCommunityShareDefault({}), true);
  assert.equal(
    resolveCommunityShareDefault({ feedVisibility: 'crew_only' }),
    true
  );
  assert.equal(
    resolveCommunityShareDefault({ feedVisibility: 'public_discovery' }),
    true
  );
  assert.equal(
    resolveCommunityShareDefault({ privateApprovedPhotos: false }),
    true
  );
});

test('share fields: ON makes the photo community-visible and ballot-eligible', () => {
  assert.deepEqual(resolveCommunityShareFields(true), {
    showInCommunityFeed: true,
    isPublic: true,
    communityVisible: true,
    feedVisibilityOverride: 'public_discovery',
  });
});

test('share fields: OFF keeps the photo out of the community (no feed override)', () => {
  assert.deepEqual(resolveCommunityShareFields(false), {
    showInCommunityFeed: false,
    isPublic: false,
    communityVisible: false,
    feedVisibilityOverride: null,
  });
});

test('capture draft round-trips the share choice', () => {
  const userId = 'share-draft-user';
  const missionId = 'socal-09';
  for (const choice of [true, false, null] as const) {
    clearCaptureDraft(userId, missionId);
    saveCaptureDraft({
      version: 1,
      userId,
      missionId,
      savedAt: Date.now(),
      note: 'draft note',
      photoDataUrl: null,
      photoTakenAt: null,
      photoSource: null,
      trustLevel: null,
      shareWithCommunity: choice,
    });
    assert.equal(loadCaptureDraft(userId, missionId)?.shareWithCommunity, choice);
  }
  clearCaptureDraft(userId, missionId);
});

test('wiring: the per-photo choice reaches the entry doc (source pins)', () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const gameService = readFileSync(
    join(repoRoot, 'src/services/gameService.ts'),
    'utf8'
  );
  // The old hardcoded private default is gone; the entry reads the choice.
  assert.match(
    gameService,
    /showInCommunityFeed: entryData\.showInCommunityFeed \?\? false/
  );
  assert.doesNotMatch(gameService, /showInCommunityFeed: false,/);

  const appContext = readFileSync(
    join(repoRoot, 'src/context/AppContext.tsx'),
    'utf8'
  );
  assert.match(
    appContext,
    /showInCommunityFeed: \(entryData as any\)\.showInCommunityFeed \?\? false/
  );

  const capture = readFileSync(
    join(repoRoot, 'src/pages/Capture.tsx'),
    'utf8'
  );
  assert.match(
    capture,
    /showInCommunityFeed: fcData\.shareWithCommunity \?\? true/
  );
  assert.match(capture, /feedVisibility: \(fcData\.shareWithCommunity \?\? true\)/);

  const clipboard = readFileSync(
    join(repoRoot, 'src/components/FieldClipboard.tsx'),
    'utf8'
  );
  assert.match(clipboard, /Share with the community/);
  assert.match(clipboard, /Your photo can appear in the weekly vote\./);
  assert.match(clipboard, /role="switch"/);
});
