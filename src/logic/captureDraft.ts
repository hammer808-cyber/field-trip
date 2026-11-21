import type { PolaroidStickerPlacement } from './polaroidSticker';

// Capture draft persistence (P1-3, audit §12).
//
// Leaving Capture mid-way used to lose the photo and the note text: only
// booleans (`photo: true`, `field_note: true`) reach Firestore through
// `tripProgress`, and the evidence itself lives in component state. A
// draft is the evidence itself, kept locally (localStorage), keyed per
// user + mission so a draft never leaks across missions or accounts.
//
// What a draft holds: the note text, a downscaled copy of the photo, the
// Polaroid sticker choice, and the photo's small metadata (source,
// taken-at, trust level). What it deliberately does NOT hold: the voice
// note (an audio data URL can be ~1 MB on its own — restoring it is a
// separate job) and the AI analysis (re-run from the restored photo).
//
// Quota: a camera photo is megabytes as a data URL and localStorage is
// ~5 MB shared, so the photo is downscaled to at most 1024px before it
// is stored, and a save that still won't fit keeps the note and drops
// the photo — typed text is the half that can't be re-taken. A draft is
// cleared on a successful submit and when the mission is already
// submitted/approved; a failed submit keeps it, so retry still has the
// evidence (same rule as P0-8).

export const CAPTURE_DRAFT_VERSION = 1;

/** A draft photo bigger than this (in data-URL characters) is downscaled again, then dropped. */
export const CAPTURE_DRAFT_MAX_PHOTO_CHARS = 800_000;

export interface CaptureDraft {
  version: typeof CAPTURE_DRAFT_VERSION;
  userId: string;
  missionId: string;
  savedAt: number;
  note: string;
  photoDataUrl: string | null;
  photoTakenAt: string | null;
  photoSource: string | null;
  trustLevel: string | null;
  stickerId?: string | null;
  stickerPlacement?: PolaroidStickerPlacement | null;
  // P0-8 follow-up (Nov 20, 2026): the entry id minted for this capture
  // session. A retry reuses it as existingEntryId so a post-write failure
  // updates the same entry instead of minting a duplicate; storing it in
  // the draft keeps the same attempt id across a refresh mid-submit.
  submissionAttemptId?: string | null;
}

export function captureDraftKey(userId: string, missionId: string): string {
  return `fieldtrip_capture_draft:${userId}:${missionId.toLowerCase()}`;
}

export function loadCaptureDraft(userId: string, missionId: string): CaptureDraft | null {
  try {
    const raw = localStorage.getItem(captureDraftKey(userId, missionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CaptureDraft>;
    if (parsed.version !== CAPTURE_DRAFT_VERSION) return null;
    if (parsed.userId !== userId) return null;
    if (typeof parsed.missionId !== 'string' || parsed.missionId.toLowerCase() !== missionId.toLowerCase()) return null;
    if (typeof parsed.note !== 'string') return null;
    return {
      version: CAPTURE_DRAFT_VERSION,
      userId: parsed.userId,
      missionId: parsed.missionId,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      note: parsed.note,
      photoDataUrl: typeof parsed.photoDataUrl === 'string' ? parsed.photoDataUrl : null,
      photoTakenAt: typeof parsed.photoTakenAt === 'string' ? parsed.photoTakenAt : null,
      photoSource: typeof parsed.photoSource === 'string' ? parsed.photoSource : null,
      trustLevel: typeof parsed.trustLevel === 'string' ? parsed.trustLevel : null,
      stickerId: typeof parsed.stickerId === 'string' ? parsed.stickerId : null,
      stickerPlacement: parsed.stickerPlacement ?? null,
      submissionAttemptId: typeof parsed.submissionAttemptId === 'string' ? parsed.submissionAttemptId : null,
    };
  } catch {
    return null;
  }
}

export type CaptureDraftSaveResult = 'saved' | 'saved-note-only' | 'failed';

/**
 * Writes the draft. Never throws. On a quota error it retries with the
 * note alone (the photo is droppable; the typed note is not).
 */
export function saveCaptureDraft(draft: CaptureDraft): CaptureDraftSaveResult {
  const key = captureDraftKey(draft.userId, draft.missionId);
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return 'saved';
  } catch {
    if (!draft.photoDataUrl) return 'failed';
    try {
      localStorage.setItem(key, JSON.stringify({ ...draft, photoDataUrl: null }));
      return 'saved-note-only';
    } catch {
      return 'failed';
    }
  }
}

export function clearCaptureDraft(userId: string, missionId: string): void {
  try {
    localStorage.removeItem(captureDraftKey(userId, missionId));
  } catch {
    // Storage is unavailable — nothing to clear.
  }
}

/**
 * Downscales a photo data URL to at most `maxEdge` px on its long edge
 * (JPEG, `quality`), so it fits in localStorage. Small images pass
 * through untouched. Outside a browser (Node tests) the input is
 * returned unchanged — there is no canvas to downscale with.
 */
export async function downscalePhotoDataUrl(
  dataUrl: string,
  maxEdge = 1024,
  quality = 0.82
): Promise<string | null> {
  if (dataUrl.length <= 300_000) return dataUrl;
  if (typeof document === 'undefined') return dataUrl;
  const downscaled = await downscaleOnce(dataUrl, maxEdge, quality);
  if (downscaled === null) return null;
  if (downscaled.length <= CAPTURE_DRAFT_MAX_PHOTO_CHARS) return downscaled;
  const smaller = await downscaleOnce(dataUrl, 640, 0.7);
  if (smaller === null) return null;
  return smaller.length <= CAPTURE_DRAFT_MAX_PHOTO_CHARS ? smaller : null;
}

function downscaleOnce(
  dataUrl: string,
  maxEdge: number,
  quality: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
