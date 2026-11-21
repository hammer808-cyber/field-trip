import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveFieldKitReady } from '../logic/fieldKit';

test('field kit is ready only when camera AND location are both granted', () => {
  assert.equal(resolveFieldKitReady(true, true), true);
  assert.equal(resolveFieldKitReady(true, false), false);
  assert.equal(resolveFieldKitReady(false, true), false);
  assert.equal(resolveFieldKitReady(false, false), false);
});

test('completing Field Kit onboarding derives fieldKitReady from the real permission state', () => {
  // Nov 20, 2026 (P0-6 follow-up): "Continue without permissions" used
  // to write fieldKitReady: true unconditionally. The completion path
  // must derive it from the granted flags instead of hardcoding true.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const appContext = fs.readFileSync(path.join(__dirname, '../context/AppContext.tsx'), 'utf8');
  assert.ok(!appContext.includes('fieldKitReady: true'), 'completeFieldKitOnboarding must not hardcode fieldKitReady: true');
  assert.ok(
    appContext.includes('fieldKitReady: resolveFieldKitReady(cameraPermissionReady, locationPermissionReady)'),
    'expected fieldKitReady to be derived from the permission state'
  );
});
