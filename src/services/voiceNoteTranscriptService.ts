import { authenticatedFetch } from '../lib/api';

/**
 * Voice-note text, Option A (Nov 20, 2026): server-side Gemini transcription.
 *
 * The client posts only the entry id. The server downloads the stored audio,
 * sends it to Gemini, and writes `voiceNoteTranscript` onto the entry — the
 * entry then flows back through the normal subscription, so the Logbook
 * shows the text on the next snapshot without any extra fetch.
 *
 * Never throws: a failure means "no transcript yet", never a faked one.
 * The caller renders the written note / audio player instead.
 */
export async function requestVoiceNoteTranscript(
  entryId: string,
  opts: { force?: boolean } = {}
): Promise<{ transcript: string; cached: boolean } | null> {
  try {
    const res = await authenticatedFetch(`/api/entries/${encodeURIComponent(entryId)}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: opts.force === true })
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { transcript?: unknown; cached?: unknown };
    return typeof data.transcript === 'string' && data.transcript.trim()
      ? { transcript: data.transcript.trim(), cached: data.cached === true }
      : null;
  } catch {
    return null;
  }
}
