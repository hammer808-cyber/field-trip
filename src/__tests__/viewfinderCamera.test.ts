import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cameraTrackSupportsTorch,
  getCameraFlashStrategy,
  isCameraFlashAvailable,
  setCameraTorch,
} from '../logic/cameraFlash';

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

test('viewfinder chooses hardware flash for rear cameras and screen flash for front cameras', () => {
  assert.equal(getCameraFlashStrategy({
    enabled: true,
    torchSupported: true,
    facingMode: 'environment',
    sourceMode: 'camera',
  }), 'torch');
  assert.equal(getCameraFlashStrategy({
    enabled: true,
    torchSupported: false,
    facingMode: 'user',
    sourceMode: 'camera',
  }), 'screen');
  assert.equal(getCameraFlashStrategy({
    enabled: true,
    torchSupported: false,
    facingMode: 'environment',
    sourceMode: 'camera',
  }), 'none');
  assert.equal(getCameraFlashStrategy({
    enabled: true,
    torchSupported: true,
    facingMode: 'environment',
    sourceMode: 'simulated',
  }), 'none');
});

test('hardware torch constraints turn on and off only for capable tracks', async () => {
  const calls: MediaTrackConstraints[] = [];
  const capableTrack = {
    getCapabilities: () => ({ torch: true }),
    applyConstraints: async (constraints: MediaTrackConstraints) => { calls.push(constraints); },
  } as any;
  const unsupportedTrack = {
    getCapabilities: () => ({}),
    applyConstraints: async () => { throw new Error('should not run'); },
  } as any;

  assert.equal(cameraTrackSupportsTorch(capableTrack), true);
  assert.equal(isCameraFlashAvailable({ torchSupported: true, facingMode: 'environment', sourceMode: 'camera' }), true);
  assert.equal(isCameraFlashAvailable({ torchSupported: false, facingMode: 'environment', sourceMode: 'camera' }), false);
  assert.equal(await setCameraTorch(capableTrack, true), true);
  assert.equal(await setCameraTorch(capableTrack, false), true);
  assert.equal(await setCameraTorch(unsupportedTrack, true), false);
  assert.deepEqual(calls.map(call => (call.advanced?.[0] as any)?.torch), [true, false]);
});

test('viewfinder renders an accessible flash control and locks duplicate captures', () => {
  assert.match(viewfinderSource, /aria-label=\{!flashAvailable \? 'Flash unavailable for this camera'/);
  assert.match(viewfinderSource, /\{flashEnabled \? 'Flash On' : 'Flash'\}/);
  assert.match(viewfinderSource, /setCameraTorch\(track, true\)/);
  assert.match(viewfinderSource, /setCameraTorch\(track, false\)/);
  assert.match(viewfinderSource, /captureInFlightRef\.current/);
});
