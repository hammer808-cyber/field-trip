import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createTranscribeVoiceNoteHandler,
  mimeTypeForVoiceNotePath,
  transcribeVoiceNote,
  MAX_TRANSCRIBE_AUDIO_BYTES,
  type TranscribeAudioFn,
  type VoiceNoteTranscriptStore
} from '../server/voiceNoteTranscription';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// Voice-note text, Option A (Nov 20, 2026): server-side Gemini transcription.
// The orchestrator is tested against an in-memory fake store and a fake
// transcribe function — no Firestore, Storage, or Gemini in tests.

const OWNER = 'transcribe-owner';
const OTHER = 'transcribe-other';

function makeEntry(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    userId: OWNER,
    voiceNotePresent: true,
    voiceNoteStoragePath: 'voice-notes/owner/clip.webm',
    voiceNoteDurationSec: 12,
    ...overrides
  };
}

function makeStore(entry: Record<string, any> | null, audio: Buffer | null = Buffer.from('fake-audio')) {
  const saved: Array<{ entryId: string; transcript: string; model: string }> = [];
  const store: VoiceNoteTranscriptStore = {
    async getEntry() {
      return entry;
    },
    async getAudioBytes() {
      return audio === null ? null : { bytes: audio, mimeType: 'audio/webm' };
    },
    async saveTranscript(entryId, transcript, model) {
      saved.push({ entryId, transcript, model });
    }
  };
  return { store, saved };
}

const fakeTranscribe: TranscribeAudioFn = async () => 'the park was closed so we did the fountain instead';

test('transcribe: owner gets a transcript and it is saved once', async () => {
  const { store, saved } = makeStore(makeEntry());
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, fakeTranscribe);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.transcript, 'the park was closed so we did the fountain instead');
    assert.equal(result.cached, false);
  }
  assert.equal(saved.length, 1);
  assert.equal(saved[0].entryId, 'entry-1');
});

test('transcribe: admin may transcribe someone else’s entry', async () => {
  const { store, saved } = makeStore(makeEntry());
  const result = await transcribeVoiceNote('entry-1', OTHER, true, store, fakeTranscribe);
  assert.equal(result.ok, true);
  assert.equal(saved.length, 1);
});

test('transcribe: a non-owner non-admin is refused', async () => {
  const { store, saved } = makeStore(makeEntry());
  const result = await transcribeVoiceNote('entry-1', OTHER, false, store, fakeTranscribe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
  assert.equal(saved.length, 0);
});

test('transcribe: missing entry is 404', async () => {
  const { store, saved } = makeStore(null);
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, fakeTranscribe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
  assert.equal(saved.length, 0);
});

test('transcribe: an existing transcript is returned without another Gemini call', async () => {
  let calls = 0;
  const counting: TranscribeAudioFn = async () => {
    calls += 1;
    return 'new text';
  };
  const { store, saved } = makeStore(makeEntry({ voiceNoteTranscript: 'already transcribed', voiceNoteTranscriptModel: 'gemini-3.5-flash' }));
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, counting);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.transcript, 'already transcribed');
    assert.equal(result.cached, true);
  }
  assert.equal(calls, 0);
  assert.equal(saved.length, 0);
});

test('transcribe: force re-transcribes even with an existing transcript', async () => {
  const { store, saved } = makeStore(makeEntry({ voiceNoteTranscript: 'already transcribed' }));
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, fakeTranscribe, { force: true });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.cached, false);
  assert.equal(saved.length, 1);
});

test('transcribe: entry without a voice note is 409', async () => {
  const { store, saved } = makeStore(makeEntry({ voiceNotePresent: false, voiceNoteStoragePath: undefined }));
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, fakeTranscribe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 409);
  assert.equal(saved.length, 0);
});

test('transcribe: missing audio is 404', async () => {
  const { store, saved } = makeStore(makeEntry(), null);
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, fakeTranscribe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
  assert.equal(saved.length, 0);
});

test('transcribe: audio over the size cap is refused before any Gemini call', async () => {
  let calls = 0;
  const counting: TranscribeAudioFn = async () => {
    calls += 1;
    return 'text';
  };
  const big = Buffer.alloc(MAX_TRANSCRIBE_AUDIO_BYTES + 1);
  const { store, saved } = makeStore(makeEntry(), big);
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, counting);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
  assert.equal(calls, 0);
  assert.equal(saved.length, 0);
});

test('transcribe: a failed Gemini call is 503 and saves nothing — never faked', async () => {
  const failing: TranscribeAudioFn = async () => {
    throw new Error('GEMINI_API_KEY is not set.');
  };
  const { store, saved } = makeStore(makeEntry());
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, failing);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 503);
  assert.equal(saved.length, 0);
});

test('transcribe: an empty model reply is 503 and saves nothing', async () => {
  const empty: TranscribeAudioFn = async () => '   ';
  const { store, saved } = makeStore(makeEntry());
  const result = await transcribeVoiceNote('entry-1', OWNER, false, store, empty);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 503);
  assert.equal(saved.length, 0);
});

test('transcribe: mime type comes from the stored content type, else the extension', () => {
  assert.equal(mimeTypeForVoiceNotePath('voice-notes/u/a.webm', 'audio/webm'), 'audio/webm');
  assert.equal(mimeTypeForVoiceNotePath('voice-notes/u/a.mp4', null), 'audio/mp4');
  assert.equal(mimeTypeForVoiceNotePath('voice-notes/u/a.webm', null), 'audio/webm');
  assert.equal(mimeTypeForVoiceNotePath('voice-notes/u/a.webm', 'image/jpeg'), 'audio/webm');
});

function makeRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: any) => {
    res.body = body;
    return res;
  };
  return res;
}

test('handler: missing entry id is 400, unauthenticated is 401, no store is 503', async () => {
  const { store } = makeStore(makeEntry());
  const handler = createTranscribeVoiceNoteHandler(() => store, {
    transcribeAudio: fakeTranscribe,
    isAdminUser: () => false
  });

  const noId = makeRes();
  await handler({ params: {}, user: { uid: OWNER } }, noId);
  assert.equal(noId.statusCode, 400);

  const noUser = makeRes();
  await handler({ params: { id: 'entry-1' }, user: null }, noUser);
  assert.equal(noUser.statusCode, 401);

  const noStore = createTranscribeVoiceNoteHandler(() => null, {
    transcribeAudio: fakeTranscribe,
    isAdminUser: () => false
  });
  const unavailable = makeRes();
  await noStore({ params: { id: 'entry-1' }, user: { uid: OWNER } }, unavailable);
  assert.equal(unavailable.statusCode, 503);
});

test('handler: success returns the transcript and the cached flag', async () => {
  const { store } = makeStore(makeEntry());
  const handler = createTranscribeVoiceNoteHandler(() => store, {
    transcribeAudio: fakeTranscribe,
    isAdminUser: () => false
  });
  const res = makeRes();
  await handler({ params: { id: 'entry-1' }, body: {}, user: { uid: OWNER } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.transcript, 'the park was closed so we did the fountain instead');
  assert.equal(res.body.cached, false);
});

test('voice-note text: route wired in server.ts with the Gemini call', () => {
  const server = read('server.ts');
  assert.match(server, /app\.post\(\s*"\/api\/entries\/:id\/transcribe"/);
  assert.match(server, /createTranscribeVoiceNoteHandler\(/);
  assert.match(server, /Transcribe this voice note verbatim/);
  assert.match(server, /GEMINI_API_KEY is not set/);
});

test('voice-note text: Logbook renders the transcript and the player audio, never the stamped default as a note', () => {
  const logbook = read('src/components/LogbookFlipbook.tsx');
  assert.match(logbook, /voiceNoteTranscript/);
  assert.match(logbook, /requestVoiceNoteTranscript\(entry\.id\)/);
  assert.match(logbook, /<audio controls src=\{entry\.voiceNoteUrl\}/);
  assert.match(logbook, /Voice note — transcribed/);
  assert.match(logbook, /fieldNote !== DEFAULT_FIELD_NOTE_TEXT/);
  assert.doesNotMatch(logbook, /\{fieldNote \|\| 'No field note was attached/);
});

test('voice-note text: admin review has the transcribe button and the honest label', () => {
  const review = read('src/pages/AdminProofReview.tsx');
  assert.match(review, /Transcribe voice note/);
  assert.match(review, /handleTranscribe/);
  assert.match(review, /Voice_Note_Transcription/);
  assert.match(review, /No written note — voice note only\./);
  assert.doesNotMatch(review, /<h4[^>]*>Field_Note_Transcription<\/h4>/);
});

test('voice-note text: only the server writes the transcript field', () => {
  const service = read('src/services/voiceNoteTranscriptService.ts');
  assert.match(service, /\/api\/entries\/\$\{encodeURIComponent\(entryId\)\}\/transcribe/);
  assert.doesNotMatch(service, /firebase\/firestore|updateDoc|setDoc/);
  const module = read('src/server/voiceNoteTranscription.ts');
  assert.match(module, /voiceNoteTranscript: transcript,/);
});
