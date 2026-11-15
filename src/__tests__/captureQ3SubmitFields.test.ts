import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveParticipationSignals } from '../logic/missionScoring';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('Q3: the tag-aware verdict gates the location layer, not raw coordinates', () => {
  // A tag mismatch with coordinates present earns NOTHING: the stored
  // locationVerified (Capture's matchesLocationTag verdict) wins over the
  // lat/lng fallback.
  assert.equal(
    resolveParticipationSignals({ locationVerified: false, latitude: 33.7, longitude: -118.2 }).locationVerified,
    false,
  );
  assert.equal(
    resolveParticipationSignals({ locationVerified: true, latitude: 33.7, longitude: -118.2 }).locationVerified,
    true,
  );
  // No verdict stored (old entries, other callers): the pre-existing lat/lng
  // fallback still applies — unchanged behavior, not a new rule.
  assert.equal(
    resolveParticipationSignals({ latitude: 33.7, longitude: -118.2 }).locationVerified,
    true,
  );
  assert.equal(resolveParticipationSignals({}).locationVerified, false);
});

test('Q3: the note layer still needs a real note; a voice note earns it', () => {
  // Stamped default text never earns the layer, even via the raw field.
  assert.equal(
    resolveParticipationSignals({ fieldNoteRaw: '', fieldNote: 'A successful field trip entry.' }).fieldNotePresent,
    false,
  );
  assert.equal(
    resolveParticipationSignals({ fieldNoteRaw: 'Found the mural behind the bakery.' }).fieldNotePresent,
    true,
  );
  const voice = resolveParticipationSignals({ voiceNotePresent: true });
  assert.equal(voice.fieldNotePresent, true);
  assert.equal(voice.fieldNoteViaVoice, true);
});

test('Q3: AppContext forwards the dropped fields into the submit call', () => {
  const appContext = read('src/context/AppContext.tsx');
  const call = appContext.slice(
    appContext.indexOf('const result = await submitEntryLogic('),
    appContext.indexOf('activeSeason', appContext.indexOf('const result = await submitEntryLogic(')),
  );
  for (const line of [
    'locationVerified: entryData.locationVerified ?? null,',
    'latitude: entryData.latitude ?? null,',
    'longitude: entryData.longitude ?? null,',
    'fieldNoteRaw: entryData.fieldNoteRaw ?? null,',
    'voiceNoteUrl: entryData.voiceNoteUrl ?? null,',
    'voiceNoteStoragePath: entryData.voiceNoteStoragePath ?? null,',
    'voiceNoteDurationSec: entryData.voiceNoteDurationSec ?? null,',
    'voiceNotePresent: entryData.voiceNotePresent === true,',
  ]) {
    assert.ok(call.includes(line), `missing forwarding line: ${line}`);
  }
});

test('Q3: gameService stores the fields on the entry instead of null', () => {
  const gameService = read('src/services/gameService.ts');
  for (const line of [
    'locationVerified: entryData.locationVerified ?? null,',
    'fieldNoteRaw: entryData.fieldNoteRaw ?? null,',
    'voiceNoteUrl: entryData.voiceNoteUrl ?? null,',
    'voiceNoteStoragePath: entryData.voiceNoteStoragePath ?? null,',
    'voiceNoteDurationSec: entryData.voiceNoteDurationSec ?? null,',
    'voiceNotePresent: entryData.voiceNotePresent === true,',
  ]) {
    assert.ok(gameService.includes(line), `missing storage line: ${line}`);
  }
  // The submit entryData type declares them (so the pass-through is typed).
  for (const decl of [
    'locationVerified?: boolean | null;',
    'fieldNoteRaw?: string | null;',
    'voiceNoteUrl?: string | null;',
    'voiceNoteStoragePath?: string | null;',
    'voiceNoteDurationSec?: number | null;',
    'voiceNotePresent?: boolean | null;',
  ]) {
    assert.ok(gameService.includes(decl), `missing type declaration: ${decl}`);
  }
});

test('Q3: the Entry interface declares the stored proof signals', () => {
  const entry = read('src/types/game.ts');
  for (const decl of [
    'locationVerified?: boolean | null;',
    'latitude?: number | null;',
    'longitude?: number | null;',
    'fieldNoteRaw?: string | null;',
    'voiceNoteUrl?: string | null;',
    'voiceNoteStoragePath?: string | null;',
    'voiceNoteDurationSec?: number | null;',
    'voiceNotePresent?: boolean | null;',
  ]) {
    assert.ok(entry.includes(decl), `missing Entry field: ${decl}`);
  }
});

test('Q3: the stored voice flag means a >=5s clip that actually uploaded', () => {
  const capture = read('src/pages/Capture.tsx');
  // The upload only runs for a clip at or over the minimum duration...
  assert.match(
    capture,
    /voiceNoteReadyAtSubmit = !!fcData\.voiceNote && fcData\.voiceNote\.durationSec >= MIN_VOICE_NOTE_SECONDS/,
  );
  // ...and the flag passed to addEntry is only true when the upload survived.
  assert.match(capture, /const voiceNotePresent = voiceNoteUpload !== null;/);
  assert.match(capture, /voiceNoteDurationSec: voiceNotePresent \? \(fcData\.voiceNote\?\.durationSec \?\? null\) : null,/);
});

test('Q3: the location tag gates the layer, never the submit', () => {
  const capture = read('src/pages/Capture.tsx');
  // The tag-aware verdict comes from the tag match when the card has one.
  assert.match(capture, /matchesLocationTag\(submissionCoords, locationTag\)/);
  // The evidence-row gate uses plain location fulfillment, not the tag verdict.
  const requirements = capture.slice(
    capture.indexOf('const evidenceRequirements = ['),
    capture.indexOf('].filter(req => req.required);', capture.indexOf('const evidenceRequirements = [')),
  );
  assert.match(requirements, /key: 'location', label: locationRowLabel, fulfilled: isLocationFulfilled/);
  assert.doesNotMatch(requirements, /isLocationLayerEarned/);
  // The gate filters out note/audio only; the location row can only block on
  // a missing location, never on a tag mismatch.
  assert.match(capture, /filter\(r => r\.key !== 'field_note' && r\.key !== 'audio'\)/);
});
