import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildAchievementShareData,
  shareAchievement,
  type ShareApi,
} from '../logic/shareAchievement';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// P1-11 (audit §12): the legendary reveal is the app's one share path —
// system share sheet where the platform has one, copy-link fallback where
// it doesn't. P3-2: index.html carries the description + OG/Twitter tags
// so a shared link unfurls.

test('share: buildAchievementShareData names the reward and the app', () => {
  const data = buildAchievementShareData(
    { title: 'Whistle Lanyard', rewardText: 'WHISTLE LANYARD', rarity: 'legendary', type: 'sticker' },
    'https://field-trip-hn2e.onrender.com/'
  );
  assert.equal(data.title, 'Fieldtrip');
  assert.match(data.text, /WHISTLE LANYARD/);
  assert.match(data.text, /legendary sticker/);
  assert.equal(data.url, 'https://field-trip-hn2e.onrender.com');
});

test('share: falls back to the title when there is no reward text', () => {
  const data = buildAchievementShareData(
    { title: 'Proud Pulsator', type: 'sticker' },
    'https://field-trip-hn2e.onrender.com'
  );
  assert.match(data.text, /Proud Pulsator/);
});

test('share: system sheet wins when available', async () => {
  let shared: unknown = null;
  const api: ShareApi = {
    canShare: () => true,
    share: async (d) => { shared = d; },
    copy: async () => { throw new Error('copy must not run'); },
  };
  const outcome = await shareAchievement(
    { title: 'Fieldtrip', text: 'hi', url: 'https://example.com' },
    api
  );
  assert.equal(outcome, 'shared');
  assert.ok(shared !== null);
});

test('share: a dismissed sheet stays quiet — no clipboard fallback', async () => {
  let copied: string | null = null;
  const abort = new Error('user cancelled');
  abort.name = 'AbortError';
  const api: ShareApi = {
    canShare: () => true,
    share: async () => { throw abort; },
    copy: async (t) => { copied = t; },
  };
  const outcome = await shareAchievement(
    { title: 'Fieldtrip', text: 'hi', url: 'https://example.com' },
    api
  );
  assert.equal(outcome, 'cancelled');
  assert.equal(copied, null);
});

test('share: a failed share falls back to copy-link', async () => {
  let copied: string | null = null;
  const api: ShareApi = {
    canShare: () => true,
    share: async () => { throw new Error('no sheet'); },
    copy: async (t) => { copied = t; },
  };
  const outcome = await shareAchievement(
    { title: 'Fieldtrip', text: 'I unlocked X', url: 'https://example.com' },
    api
  );
  assert.equal(outcome, 'copied');
  assert.equal(copied, 'I unlocked X https://example.com');
});

test('share: no sheet at all goes straight to copy-link', async () => {
  let copied: string | null = null;
  const api: ShareApi = { copy: async (t) => { copied = t; } };
  const outcome = await shareAchievement(
    { title: 'Fieldtrip', text: 'hi', url: 'https://example.com' },
    api
  );
  assert.equal(outcome, 'copied');
  assert.ok(copied !== null);
});

test('share: nothing available reports unavailable', async () => {
  const outcome = await shareAchievement(
    { title: 'Fieldtrip', text: 'hi', url: 'https://example.com' },
    {}
  );
  assert.equal(outcome, 'unavailable');
});

test('share: the reveal modal renders the share button in both branches', () => {
  const feedback = read('src/components/RewardFeedback.tsx');
  assert.ok(feedback.includes('ShareAchievementButton'), 'no share button component');
  const renders = feedback.match(/<ShareAchievementButton reward=\{reward\} \/>/g) || [];
  assert.equal(renders.length, 2, `expected the button in both MajorReveal branches, found ${renders.length}`);
  assert.ok(feedback.includes('shareAchievement(data, defaultShareApi())'), 'button does not call the share helper');
  // Sharing must never dismiss the celebration: the button's own code must
  // not call onDismiss (the modal's own buttons still do, and should).
  const buttonSrc = feedback.slice(
    feedback.indexOf('const ShareAchievementButton'),
    feedback.indexOf('const MajorReveal: React.FC<MajorRevealProps>')
  );
  assert.ok(buttonSrc.length > 0, 'could not isolate the share button component');
  assert.doesNotMatch(buttonSrc, /onDismiss/, 'share button dismisses the celebration');
});

test('share: index.html carries description + OG + Twitter tags', () => {
  const html = read('index.html');
  // Attribute-level checks: several tags span lines, so match the attribute,
  // not the tag's opening characters.
  assert.ok(html.includes('name="description"'), 'no meta description');
  assert.ok(html.includes('property="og:title"'), 'no og:title');
  assert.ok(html.includes('property="og:description"'), 'no og:description');
  assert.ok(html.includes('property="og:image" content="https://field-trip-hn2e.onrender.com/og-image.jpg"'), 'no og:image');
  assert.ok(html.includes('property="og:url" content="https://field-trip-hn2e.onrender.com/"'), 'no og:url');
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), 'no twitter card');
  assert.ok(html.includes('name="twitter:image"'), 'no twitter:image');
  assert.ok(html.includes('<title>Fieldtrip — Grab your people. Get the proof. Turn today into a field trip.</title>'), 'title not enriched');
});

test('share: the OG image exists and is a real JPEG', () => {
  const path = join(repoRoot, 'public/og-image.jpg');
  assert.ok(existsSync(path), 'missing public/og-image.jpg');
  const buf = readFileSync(path);
  assert.ok(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff, 'og-image.jpg is not a JPEG');
  assert.ok(buf.length > 50_000, `og-image.jpg suspiciously small: ${buf.length} bytes`);
});
