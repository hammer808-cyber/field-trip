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

test('explorer art: captainClipboard, mascota and theGobbler files exist on disk', () => {
  for (const typeId of ['captainClipboard', 'mascota', 'theGobbler'] as const) {
    const type = FIELD_TYPES[typeId];
    assert.ok(type, `FIELD_TYPES is missing ${typeId}`);
    for (const key of ['image', 'avatarPath', 'resultImagePath', 'cardImagePath', 'fullImagePath'] as const) {
      const imagePath = type[key];
      assert.match(
        imagePath,
        new RegExp(`^/assets/characters/${typeId}/(results|avatar|card|full)\\.png$`),
        `${typeId}.${key} is not a character asset: ${imagePath}`,
      );
      const onDisk = join(REPO_ROOT, 'public', imagePath.replace(/^\//, ''));
      assert.ok(existsSync(onDisk), `${typeId}.${key} missing on disk: ${onDisk}`);
      assert.ok(readFileSync(onDisk).length > 20000, `${typeId}.${key} is suspiciously small`);
    }
  }
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
  assert.match(source, /Skip for now/);
  assert.match(source, /onClick=\{handleStartApp\}[^>]*>\s*Skip for now/s);
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
