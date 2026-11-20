import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (relativePath: string) =>
  readFileSync(join(REPO_ROOT, relativePath), 'utf8');

test('Viewport: pinch-zoom is not disabled (P0-1)', () => {
  // Audit P0-1 (Nov 19, 2026): maximum-scale=1.0, user-scalable=0 failed
  // WCAG 1.4.4 outright — low-vision users could not zoom. The viewport
  // keeps width/device-width, initial-scale, and viewport-fit only.
  const html = read('index.html');
  const match = html.match(/<meta name="viewport"[^>]*>/);
  assert.ok(match, 'viewport meta tag is present');
  const viewport = match[0];
  assert.doesNotMatch(viewport, /maximum-scale/);
  assert.doesNotMatch(viewport, /user-scalable/);
  assert.doesNotMatch(viewport, /minimum-scale/);
  assert.match(viewport, /width=device-width/);
  assert.match(viewport, /initial-scale=1\.0/);
  assert.match(viewport, /viewport-fit=cover/);
});
