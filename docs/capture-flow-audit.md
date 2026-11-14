# Capture flow audit — card to camera to points

Audited Nov 14, 2026, from the live code (not from memory). The trigger was
Zach's screenshot: the camera screen has a big black bar under the feed, and
the photo flow feels long and repetitive.

## The live flow (states that can actually be reached)

1. **Missions** — draw a card (flip-then-expand) or pick from the SEE ALL CARDS
   grid → tap → `/capture?id=<trip>`.
2. **brief** — mission signal header (title, deck, `+XP MAX`) + Receipt
   Checklist (Find it / Snap it / Say why) + hint + Trevor's Take + bonus +
   OPEN CAMERA.
3. **capture** — PointsMeter (live estimate) on top + viewfinder + HUD +
   bottom controls (Upload / Flash / SNAP / Filters) + zoom + filter panels.
4. **developing_polaroid** — the photo develops in ~2.9 s (staged), sticker
   picker, Accept ("Use This Receipt") / Retake. A Skip button jumps straight
   to developed.
5. **reviewing** — the polaroid again + EvidenceDetector (AI result) + the
   field-note editor ("Tell Trevor") + EvidenceMeter (photo / note / subject
   layers) + Submit Proof.
6. **submitting** — "Sending…" with a progress bar.
7. **result** — MissionResultCard with the math wizard (final XP breakdown).

Guided taps after the draw: OPEN CAMERA → SNAP → USE THIS RECEIPT →
(type a note) → SUBMIT PROOF. Five taps plus typing. The flow is not five
minutes of forced waiting — the forced waits are small (polaroid 2.9 s,
skippable) — but six screens with animated transitions between each one
makes it feel long.

## Points tracking (where the awards are visible)

- **brief**: `+XP MAX` chip on the header; PointsMeter shows the live
  estimate (base + three +25% participation layers + hint/multiplier notes).
- **capture / developing**: PointsMeter stays pinned on top.
- **reviewing**: PointsMeter + EvidenceMeter (photo captured / note added /
  subject detected) + the submit button state.
- **result**: MissionResultCard math wizard, final XP.
- The PointsMeter is the tracker for the whole flow. It never leaves the
  screen from brief through reviewing.

## Findings

### F1. The black bar (the reported bug)

The viewfinder sits in a fixed-height island
(`h-[min(78dvh,760px)] min-h-[520px]`, `bg-black`) wrapped in a white padded
card (`bg-white border-4 p-2`). Inside it, the bottom controls sit in a tall
slab: `bg-gradient-to-t from-black via-black/85 to-transparent pt-10` —
roughly the bottom quarter of the camera is near-opaque black so the buttons
read. On a phone that slab reads as a dead black bar under the feed, and the
fixed-height island leaves the camera feeling boxed in instead of full-bleed.

### F2. Dead states in the state machine

`FieldClipboardState` carries three states nothing can reach:

- `previewing_polaroid` — nothing sets it (`onCapture` goes straight to
  `developing_polaroid`).
- `detecting` — nothing sets it, but `Capture.tsx` still carries its
  3-second forced timer effect (would have added a dead 3 s wait).
- `noting` — the main flow never enters it (the polaroid Accept goes to
  `reviewing`, which already has the note editor). Only the repair path
  ("EDIT FIELD LOGS" on `needs_more_proof`) uses it.

Dead states are not harmless: they are screens a future edit can route into
by accident, and they duplicate the note editor (see F3).

### F3. The note is asked twice by design

The `noting` screen and the `reviewing` screen both carry a full field-note
editor. The live flow only shows one, but the repair path shows both in
sequence (noting → reviewing, same textarea twice). The `reviewing` screen
is also the only place the voice-note recorder and the Frankie one-tap note
chips are missing — they live on `noting`, so an audio-proof card has no way
to record a voice note from the screen that actually submits.

### F4. The photo is shown three times after the snap

Polaroid (developing) → polaroid again (reviewing) → result card. The
developing moment is the retro signature and stays; the reviewing polaroid
is the working copy (retake lives there). No cut needed, just noted.

### F5. The submitting bar lies about time

The "Sending…" progress bar animates 0 → 100% over a fixed 3 s no matter
how long the upload actually takes. A 1 s upload still shows a 3 s bar; a
slow upload finishes the bar and then waits.

### F6. The camera HUD is already retro; the frame is not

LINK_STABLE / ISO / SHTR / PWR / FLTR mono readouts, the SNAP! sticker
button, and the "CLUBHOUSE CAM / LIVE RECEIPT" stamp are the retro language.
The frame around them is a plain black box with a faint center cross — no
corner marks, no frame counter, no date stamp.

## Fixes (tracker)

| # | Fix | Status |
|---|-----|--------|
| 1 | Kill the black slab: compact floating controls over the feed, no tall black gradient | done Nov 14 |
| 2 | Full-bleed camera stage: drop the white padded frame around the viewfinder, taller viewport-relative stage | done Nov 14 |
| 3 | Retro frame: corner marks, EXP frame counter, date stamp in the HUD | done Nov 14 |
| 4 | Delete dead states `previewing_polaroid`, `detecting`, `noting` from the type, screens, and timer effect | done Nov 14 |
| 5 | One note editor: move the Frankie chips + voice-note recorder into `reviewing`; repair "EDIT FIELD LOGS" goes to `reviewing` | done Nov 14 |
| 6 | Submitting bar becomes indeterminate (pulses while the real upload runs) | done Nov 14 |
| 7 | Verify live: the new bundle serves on Render and the camera shows no black bar in Zach's session | shipped, unconfirmed — needs his try |

## What was deliberately kept

- The polaroid developing moment (2.9 s, skippable): it is the retro
  signature, and the Skip button already exists.
- The PointsMeter on every step: it is the live points tracker.
- The guided order (brief → camera → review → submit): fewer screens, same
  order, same gating (photo + 10-char note, or voice note, or Frankie skip).
- The SNAP! sticker button and the filter/zoom panels.
