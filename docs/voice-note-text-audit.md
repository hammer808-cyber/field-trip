# Audit: voice-note text for missions

Status: BUILT — Option A shipped Nov 20, 2026 (Zach picked A, "Gemini transcription"; Gemini key confirmed already on Render by Zach 6:51 PM). Design: POST /api/entries/:id/transcribe, Logbook + admin review render the transcript, label fix on the admin box.
Ask: "Voice-note text for missions — voice notes shown as text alongside missions."

## Headline

**There is no transcription anywhere in the app.** Voice notes exist and are
stored, but nothing has ever turned one into text. The one place that looks
like it does — the "Field_Note_Transcription" box in admin review — is
mislabeled: it shows the *written* field note, and for voice-note-only
submissions it shows a canned sentence stamped at submit time.

## What exists today

### Recording and storage (works)
- `src/components/VoiceNoteRecorder.tsx` — MediaRecorder, tap to talk, tap
  to stop. Minimum 5 seconds (`MIN_VOICE_NOTE_SECONDS`); shorter takes are
  refused, never stored. Value is `{ dataUrl, durationSec, mimeType }`.
- `src/pages/FieldClipboard.tsx:559` + `src/pages/Capture.tsx:836` — the
  recorder lives in the capture flow. A 5s+ voice note counts as the field
  note (`voiceNoteSatisfied`, `isNoteFulfilled`).
- `src/pages/Capture.tsx:1244-1259,1400` — at submit the audio uploads to
  Firebase Storage (`uploadBase64Audio`, webm or mp4) and the entry stores
  `voiceNoteUrl`, `voiceNoteStoragePath`, `voiceNoteDurationSec`,
  `voiceNotePresent`.
- Scoring and the AI suggestion already know about voice notes:
  `src/logic/missionScoring.ts` (`fieldNoteViaVoice`) and
  `src/logic/aiSuggestion.ts:218-241` (a voice note covering a missing/short
  written note rates 2, "a voice note (5s+) covers the field note", not 0).

### The misleading part
- `src/pages/Capture.tsx` stores `fieldNote: fcData.note || 'A successful
  field trip entry.'` — a voice-note-only submission gets that stamped
  default as its `fieldNote`.
- `src/pages/AdminProofReview.tsx:1119` renders a box headed
  "Field_Note_Transcription" showing `entry.fieldNote`. For a voice-note-only
  entry the admin reads "A successful field trip entry." presented as a
  transcription of the recording. It is not. The admin *can* play the audio
  (`AdminProofReview.tsx:1066-1071`, the only `<audio>` player for voice
  notes in the app), but sees no text of what was said.
- `src/components/LogbookFlipbook.tsx:124,160` renders the same written
  note in the player's own logbook (`getEntryFieldNote`, `proofDistribution.ts:83`),
  so a voice-note-only entry shows the stamped default there too.

### Player side
- The player cannot replay their own voice note anywhere. `voiceNoteUrl`
  is carried onto the client entry object (`src/context/AppContext.tsx:2533`)
  but never rendered player-side. The Logbook is the only player surface
  that shows the note at all.

### No transcription infrastructure
- No `transcript` / `voiceNoteTranscript` field exists on any entry type.
- `src/services/geminiService.ts` has no audio handling. The server's only
  audio mention is the storage-upload proxy's content-type passthrough
  (`server.ts:4396`, "voice notes send audio/webm or audio/mp4") — not
  analysis. The proof-analysis Gemini calls send images, not audio.
- The Gemini key is on Render (Zach, Nov 20, 6:51 PM — "Geminis already on
  render. We've already done it"). The earlier "key unverified" caveat is
  lifted; the first live transcription call is itself the proof it works.

## Where the text would go (both surfaces already render `fieldNote`)
1. **Logbook** (player): the blockquote in `LogbookFlipbook.tsx:159-161`,
   per entry. This is "alongside missions" for the player.
2. **Admin review** (admin): the "Field_Note_Transcription" box in
   `AdminProofReview.tsx:1118-1124` — which also needs its label fixed to
   say what it actually shows when no transcript exists.

## Options

### A — Server-side Gemini transcription
New endpoint (e.g. `POST /api/entries/:id/transcribe`, Admin SDK write, so
no rules change) that sends the stored audio to Gemini and writes
`voiceNoteTranscript` (+ timestamp/model) onto the entry. Both surfaces
then render the transcript when present, falling back to the written note.
- Pros: works for every recording, including the voice notes already in
  Storage (backfill possible); one code path for player + admin.
- Cons: every transcription is a paid API call. (The Gemini key is already
  on Render per Zach, Nov 20 — the key-verification blocker is gone.)
- Open call: when it runs — automatically at submit, or on demand (admin
  taps "Transcribe" / first Logbook view). Auto is simpler for the player;
  on-demand costs less.

### B — Device speech recognition at record time
Use the browser's Web Speech API (`SpeechRecognition`) live while recording
in `VoiceNoteRecorder`, and store the transcript with the entry at submit.
No server, no key, no cost.
- Pros: free, no key dependency, no new endpoint.
- Cons: Chrome/Edge + Android Chrome only — Safari (and the in-app iOS
  browser) effectively has no SpeechRecognition, so iPhone players get no
  text; accuracy varies; it only works for NEW recordings, never for the
  voice notes already stored.

### C — No transcription: show the audio itself
Player-side audio player in the Logbook (the URL is already on the client
entry object) + fix the admin box label so it stops claiming to be a
transcription. Cheapest build, no key, no accuracy question.
- Cons: it is not text. It does not answer the ask; it only makes the audio
  reachable and stops the misleading label.

## Smaller calls either way
- **Surfaces:** Logbook only, admin review only, or both. Both is the
  honest default — the same transcript field feeds both spots.
- **Backfill:** only A can transcribe the voice notes already in Storage.
  Worth asking, not assumed.
- **Label fix:** the admin box + the stamped default ("A successful field
  trip entry.") mislead today. Any option should stop presenting the
  stamped default as a transcription; A and B replace it with real text,
  C renames the box.

## Freeze / rules notes
- The Missions page (`Capture.tsx` / `Deck.tsx`) is frozen; option B touches
  the recorder inside the capture flow and would need a freeze lift. Options
  A and C touch the Logbook, admin review, and (A) a new server endpoint —
  none of them frozen.
- No `firestore.rules` change for any option: A writes via the server
  (Admin SDK), B writes the transcript as part of the existing submit
  payload, C writes nothing.

## Suggested next step
Pick an engine (A / B / C), then the when (submit-time auto vs on-demand,
A only) and the surfaces (both is the default). Build is: endpoint +
entry field + two render spots (+ label fix), tests (transcript renders
when present, written note fallback, no-transcript state), tsc, suite,
commit, push, live check.
