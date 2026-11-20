import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  FIELD_TYPES,
  FIELD_TYPE_ALIASES,
  normalizeFieldType,
  normalizePersonaKey,
} from '../constants/fieldTypes';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (relativePath: string) =>
  readFileSync(join(REPO_ROOT, relativePath), 'utf8');

// --- Part 3: explorer character pictures -------------------------------

test('explorer art: every character has all four files on disk as real PNGs', () => {
  // Nov 17, 2026: Elondra's four files were present and big enough but
  // corrupted (text-mode mojibake: first byte U+FFFD, not 0x89), so the
  // result page silently showed "Portrait incoming". Existence + size
  // is not enough — the PNG signature must be intact too.
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  for (const [typeId, type] of Object.entries(FIELD_TYPES)) {
    if (typeId === 'unclassified') continue;
    for (const key of ['image', 'avatarPath', 'resultImagePath', 'cardImagePath', 'fullImagePath'] as const) {
      const imagePath = (type as unknown as Record<string, string>)[key];
      assert.match(
        imagePath,
        new RegExp(`^/assets/characters/${typeId}/(results|avatar|card|full)\\.png$`),
        `${typeId}.${key} is not a character asset: ${imagePath}`,
      );
      const onDisk = join(REPO_ROOT, 'public', imagePath.replace(/^\//, ''));
      assert.ok(existsSync(onDisk), `${typeId}.${key} missing on disk: ${onDisk}`);
      const bytes = readFileSync(onDisk);
      assert.ok(bytes.length > 20000, `${typeId}.${key} is suspiciously small`);
      assert.ok(
        bytes.subarray(0, 4).equals(pngSignature),
        `${typeId}.${key} is not a PNG (bad signature — likely corrupted): ${onDisk}`,
      );
    }
  }
});

test('Profile: the Explorer portrait shows the player\'s character', () => {
  const source = read('src/pages/Profile.tsx');
  // The portrait is the character's full-body art in the Explorer Type
  // card, with the result-page art as fallback.
  assert.match(source, /fieldTypeData\.fullImagePath \|\| fieldTypeData\.resultImagePath/);
  assert.match(source, /alt=\{`?\$\{fieldTypeData\.name\} portrait`?\}/);
  // A failed load shows the initial-letter placeholder, never a broken frame.
  assert.match(source, /const \[portraitFailed, setPortraitFailed\] = useState\(false\);/);
  assert.match(source, /onError=\{\(\) => setPortraitFailed\(true\)\}/);
  assert.match(source, /Portrait incoming/);
});

test('Lost Camper is left out: legacy keys resolve to Bigfoot, no type entry', () => {
  // Nov 6: Zach parked Lost Camper ("leave out lost camper for now").
  // No FIELD_TYPES entry, no PERSONAS entry, no art; every legacy
  // 'lostCamper' key still resolves to Bigfoot, as before commit 5a61429.
  assert.equal((FIELD_TYPES as Record<string, unknown>).lostCamper, undefined);
  assert.equal(FIELD_TYPE_ALIASES.lostCamper, 'bigfoot');
  assert.equal(normalizePersonaKey('lostCamper'), 'bigfoot');
  assert.equal(normalizeFieldType('lostCamper'), 'bigfoot');
  assert.equal(normalizeFieldType('Lost Camper'), 'bigfoot');
  assert.equal(normalizeFieldType('lostcamper'), 'bigfoot');
  // Bigfoot still normalizes to itself.
  assert.equal(normalizePersonaKey('bigfoot'), 'bigfoot');
  assert.equal(normalizeFieldType('bigfoot'), 'bigfoot');
});

// --- Part 3: result-page image fallback --------------------------------

test('FieldTypeResult: a failed character image shows a placeholder, never a broken frame', () => {
  const source = read('src/pages/FieldTypeResult.tsx');

  assert.match(source, /const \[imageFailed, setImageFailed\] = React\.useState\(false\);/);
  assert.match(source, /onError=\{\(\) => \{[\s\S]*?setImageFailed\(true\);/);
  assert.match(source, /\{imageFailed \|\| !data\.image \? \(/);
  // The placeholder names the explorer instead of showing nothing.
  assert.match(source, /Portrait incoming/);
  assert.match(source, /\{data\.name\.charAt\(0\)\}/);
});

// --- Part 1: profile photo step in onboarding --------------------------

test('FieldTypeResult: the profile photo step is skippable and never blocks onboarding', () => {
  const source = read('src/pages/FieldTypeResult.tsx');

  // The primary CTA opens the photo step instead of finishing onboarding
  // outright (unless a photo already exists).
  assert.match(source, /const \[showPhotoStep, setShowPhotoStep\] = React\.useState\(false\);/);
  assert.match(source, /if \(profile\?\.photoURL\) \{\s*void handleStartApp\(\);/);
  assert.match(source, /setShowPhotoStep\(true\);/);
  // Skip is always rendered in the step and continues onboarding directly.
  // Its label names the destination (Nov 16, 2026: "Skip for now" hid
  // where the button goes; P1-2, Nov 20, 2026: the name is the derived
  // destination — Missions pre-starter, Basecamp only once the starters
  // are done).
  assert.match(source, /Skip — go to \{startDestination\}/);
  assert.match(source, /onClick=\{handleStartApp\}[^>]*>\s*Skip — go to \{startDestination\}/s);
  // A failed upload shows an error and leaves Skip available.
  assert.match(source, /That photo did not upload\. You can skip this step and add one later in Settings\./);
  assert.match(source, /role="alert"/);
  // Saving uploads through the guarded storage path and stores the URL.
  assert.match(source, /uploadBase64Image\(user\.uid, 'profilePhotos',/);
  assert.match(source, /updateProfile\(user\.uid, \{ photoURL: url \}\)/);
  // The sticky mobile footer hides while the step is open so it cannot
  // cover Skip.
  assert.match(source, /\{isGuidedActive && !showPhotoStep && \(/);
});

// --- Part 1: profile photo in Settings ---------------------------------

test('Profile Settings: a profile photo section exists', () => {
  const source = read('src/pages/Profile.tsx');

  assert.match(source, /Profile photo/);
  assert.match(source, /type="file" accept="image\/\*"/);
  assert.match(source, /Save photo/);
  assert.match(source, /Remove photo/);
  // Removing falls back to the built avatar (photoURL cleared).
  assert.match(source, /updateProfile\(profile\?\.id \|\| '', \{ photoURL: '' \}\)/);
  // The overview identity shows the photo when set, else the built avatar.
  assert.match(source, /\{profile\?\.photoURL \? \(/);
  assert.match(source, /<img\s+src=\{profile\.photoURL\}/);
});

// --- Part 2: the avatar builder editor is gone from Profile -----------

test('Profile: the avatar builder editor is removed, the built avatar stays as fallback', () => {
  const source = read('src/pages/Profile.tsx');

  assert.doesNotMatch(source, /AVATAR PREFERENCE/);
  assert.doesNotMatch(source, /editAvatar/);
  assert.doesNotMatch(source, /AVATAR_MANIFEST/);
  assert.doesNotMatch(source, /Canvas Background/);
  assert.doesNotMatch(source, /Agent Base structure/);
  assert.doesNotMatch(source, /Lenses & Accoutrements/);
  // Kept: the built avatar still renders as the fallback identity, and
  // the profile.avatar field is still read (not written by an editor).
  assert.match(source, /avatar=\{profile\?\.avatar \|\| DEFAULT_AVATAR\}/);
  assert.match(source, /import \{ AvatarPreview \}/);
  assert.match(source, /import \{ DEFAULT_AVATAR \}/);
});

// --- Feeds and crews still render the built avatar (not this task) ------

test('feeds and crews still render the built avatar', () => {
  for (const file of [
    'src/components/CommunityProofCard.tsx',
    'src/components/EntryCard.tsx',
    'src/components/crew/CrewPeopleHome.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /AvatarPreview/, `${file} must still render AvatarPreview`);
  }
});
