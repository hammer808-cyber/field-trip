import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const viewfinderSource = readFileSync('src/components/ViewfinderCamera.tsx', 'utf8');

test('viewfinder exposes camera flip and refreshes media stream state', () => {
  assert.match(viewfinderSource, /const \[facingMode, setFacingMode\] = useState<'user' \| 'environment'>\('environment'\)/);
  assert.match(viewfinderSource, /function stopMediaStream/);
  assert.match(viewfinderSource, /stopMediaStream\(streamRef\.current\)/);
  assert.match(viewfinderSource, /getUserMedia\(\{\s*video: \{\s*facingMode: \{\s*ideal: requestedFacingMode/);
  assert.match(viewfinderSource, /<SwitchCamera/);
  assert.match(viewfinderSource, /Switch to \$\{facingMode === 'environment' \? 'front' : 'rear'\} camera/);
});

test('viewfinder uses native zoom when available and a capture-affecting digital crop fallback', () => {
  assert.match(viewfinderSource, /track\.getCapabilities/);
  assert.match(viewfinderSource, /capabilities\.zoom/);
  assert.match(viewfinderSource, /track\.applyConstraints\(\{ advanced: \[\{ zoom: value \} as any\] \}\)/);
  assert.match(viewfinderSource, /mode: 'digital' as const/);
  assert.match(viewfinderSource, /transform: videoTransform/);
  assert.match(viewfinderSource, /const sourceWidth = video\.videoWidth \/ digitalZoom/);
  assert.match(viewfinderSource, /context\.drawImage\(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas\.width, canvas\.height\)/);
  assert.match(viewfinderSource, /onTouchMove=\{\(event\) =>/);
  assert.match(viewfinderSource, /applyZoom\(pinchStartRef\.current\.zoom \* scale\)/);
});

test('viewfinder stops the live stream before camera roll upload processing', () => {
  assert.match(viewfinderSource, /const handleFileUpload = async/);
  assert.match(viewfinderSource, /stopMediaStream\(streamRef\.current\);\s*streamRef\.current = null;\s*setIsProcessing\(true\);/);
});
