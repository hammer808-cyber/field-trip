/**
 * Voice-note text, Option A (Nov 20, 2026) — server-side Gemini transcription.
 *
 * `POST /api/entries/:id/transcribe` turns a stored voice note into text.
 * The client posts nothing but the entry id; the server reads the entry,
 * downloads the audio from Storage, sends it to Gemini as inline audio,
 * and writes `voiceNoteTranscript` (+ `voiceNoteTranscriptAt`,
 * `voiceNoteTranscriptModel`) onto the entry doc with the Admin SDK.
 *
 * Same rule as `stickerEvaluate.ts` / `stickerGrants.ts`: no logic inline
 * in `server.ts`. This module is dependency-injected — the orchestrator
 * runs against a narrow `VoiceNoteTranscriptStore` interface plus an
 * injected `transcribeAudio` function, so unit tests can run it with an
 * in-memory fake instead of Firestore, Storage, and Gemini. `server.ts`
 * wires the real Admin SDK store and the real Gemini call.
 *
 * Honest limits (from the audit, `docs/voice-note-text-audit.md`):
 * - A missing Gemini key, a failed model call, or an empty model reply
 *   returns 503. Nothing is ever faked into the transcript field — the
 *   fake-passing-grades lesson applies here too: a failed transcription
 *   stays visibly failed, never a stamped sentence.
 * - Only the entry owner or an admin may transcribe an entry. The
 *   transcript is written server-side, so no `firestore.rules` change.
 * - Idempotent: an entry that already has a transcript returns it without
 *   another Gemini call. One Gemini call per entry, ever, unless forced.
 * - The Logbook lazy-transcribes on first view and admin review has a
 *   button; both read the same field. There is no bulk backfill in this
 *   build — the lazy path covers old entries as they are viewed.
 */

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';

export const VOICE_NOTE_TRANSCRIPT_MODEL = 'gemini-3.5-flash';

/** Audio larger than this is refused before any Gemini call. */
export const MAX_TRANSCRIBE_AUDIO_BYTES = 15 * 1024 * 1024;

export interface VoiceNoteTranscriptStore {
  getEntry(entryId: string): Promise<Record<string, any> | null>;
  getAudioBytes(storagePath: string): Promise<{ bytes: Buffer; mimeType: string } | null>;
  saveTranscript(entryId: string, transcript: string, model: string): Promise<void>;
}

export type TranscribeAudioFn = (args: {
  audioBase64: string;
  mimeType: string;
}) => Promise<string | null>;

export type TranscribeVoiceNoteResult =
  | { ok: true; transcript: string; cached: boolean; model: string }
  | { ok: false; status: number; error: string; message: string };

function fail(status: number, error: string, message: string): TranscribeVoiceNoteResult {
  return { ok: false, status, error, message };
}

export function mimeTypeForVoiceNotePath(storagePath: string, contentType?: string | null): string {
  if (contentType && contentType.startsWith('audio/')) return contentType;
  return storagePath.toLowerCase().endsWith('.mp4') ? 'audio/mp4' : 'audio/webm';
}

export async function transcribeVoiceNote(
  entryId: string,
  callerUid: string,
  isAdmin: boolean,
  store: VoiceNoteTranscriptStore,
  transcribeAudio: TranscribeAudioFn,
  opts: { force?: boolean } = {}
): Promise<TranscribeVoiceNoteResult> {
  const entry = await store.getEntry(entryId);
  if (!entry) {
    return fail(404, 'ENTRY_NOT_FOUND', 'No entry with that id.');
  }

  if (entry.userId !== callerUid && !isAdmin) {
    return fail(403, 'NOT_ENTRY_OWNER', 'Only the entry owner or an admin may transcribe this voice note.');
  }

  const existing = typeof entry.voiceNoteTranscript === 'string' ? entry.voiceNoteTranscript.trim() : '';
  if (existing && !opts.force) {
    return {
      ok: true,
      transcript: existing,
      cached: true,
      model: typeof entry.voiceNoteTranscriptModel === 'string' ? entry.voiceNoteTranscriptModel : VOICE_NOTE_TRANSCRIPT_MODEL
    };
  }

  if (entry.voiceNotePresent !== true || typeof entry.voiceNoteStoragePath !== 'string' || !entry.voiceNoteStoragePath) {
    return fail(409, 'NO_VOICE_NOTE', 'This entry has no voice note to transcribe.');
  }

  const audio = await store.getAudioBytes(entry.voiceNoteStoragePath);
  if (!audio) {
    return fail(404, 'AUDIO_NOT_FOUND', 'The voice note audio is missing from Storage.');
  }
  if (audio.bytes.length > MAX_TRANSCRIBE_AUDIO_BYTES) {
    return fail(413, 'AUDIO_TOO_LARGE', 'The voice note is too large to transcribe.');
  }

  let transcript: string | null;
  try {
    transcript = await transcribeAudio({
      audioBase64: audio.bytes.toString('base64'),
      mimeType: audio.mimeType
    });
  } catch (err: any) {
    console.error('[VOICE_NOTE_TRANSCRIBE] Gemini call failed:', err?.message || err);
    return fail(503, 'TRANSCRIPTION_FAILED', 'Transcription failed. Nothing was saved.');
  }

  const cleaned = typeof transcript === 'string' ? transcript.trim() : '';
  if (!cleaned) {
    return fail(503, 'TRANSCRIPTION_EMPTY', 'Transcription came back empty. Nothing was saved.');
  }

  await store.saveTranscript(entryId, cleaned, VOICE_NOTE_TRANSCRIPT_MODEL);
  return { ok: true, transcript: cleaned, cached: false, model: VOICE_NOTE_TRANSCRIPT_MODEL };
}

export function createAdminVoiceNoteTranscriptStore(
  db: Firestore,
  bucket: Bucket
): VoiceNoteTranscriptStore {
  return {
    async getEntry(entryId: string) {
      const snap = await db.collection('entries').doc(entryId).get();
      return snap.exists ? (snap.data() as Record<string, any>) : null;
    },

    async getAudioBytes(storagePath: string) {
      try {
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (!exists) return null;
        const [bytes] = await file.download();
        let contentType: string | null = null;
        try {
          const [metadata] = await file.getMetadata();
          contentType = typeof metadata?.contentType === 'string' ? metadata.contentType : null;
        } catch {
          contentType = null;
        }
        return { bytes, mimeType: mimeTypeForVoiceNotePath(storagePath, contentType) };
      } catch {
        return null;
      }
    },

    async saveTranscript(entryId: string, transcript: string, model: string) {
      await db
        .collection('entries')
        .doc(entryId)
        .update({
          voiceNoteTranscript: transcript,
          voiceNoteTranscriptAt: FieldValue.serverTimestamp(),
          voiceNoteTranscriptModel: model
        });
    }
  };
}

export function createTranscribeVoiceNoteHandler(
  getStore: () => VoiceNoteTranscriptStore | null,
  deps: { transcribeAudio: TranscribeAudioFn; isAdminUser: (req: any) => boolean }
) {
  return async (req: any, res: any) => {
    const entryId = typeof req.params?.id === 'string' ? req.params.id : '';
    const callerUid = req.user?.uid;
    if (!entryId) {
      return res.status(400).json({ error: 'MISSING_ENTRY_ID', message: 'An entry id is required.' });
    }
    if (!callerUid) {
      return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in to transcribe a voice note.' });
    }
    const store = getStore();
    if (!store) {
      return res.status(503).json({ error: 'STORE_UNAVAILABLE', message: 'Transcription is unavailable right now.' });
    }
    const result = await transcribeVoiceNote(
      entryId,
      callerUid,
      deps.isAdminUser(req),
      store,
      deps.transcribeAudio,
      { force: req.body?.force === true }
    );
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error, message: result.message });
    }
    return res.json({
      ok: true,
      transcript: result.transcript,
      cached: result.cached,
      model: result.model
    });
  };
}
