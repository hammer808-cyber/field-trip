# Persona companion, Tier 1: animate the art we already have

Status: **APPROVED Nov 20, 2026 — Zach picked Tier 1 + companion** (Trevor stays
the main guide; the quiz persona is the companion beside him).
Build follows the Texas Y'all pattern: design first, build, independent verification, commit, live check.

## 1. What Zach asked

The quiz persona (Captain Clipboard, Mall Rat, Mascota, Elondra, The Gobbler,
Bigfoot) barely appears anywhere once you're in the app. He wants the character
popping up here and there, animated, on each page — as a companion next to
Trevor, not as Trevor's replacement.

## 2. Audit (Nov 20)

- Six personas in `src/constants/fieldTypes.ts`, each with four static PNGs:
  `avatar.png`, `card.png`, `full.png`, `results.png`. Only two spots use them
  today: Profile (full image) and the level-up screen (results/full). The
  `avatarPath` and `cardImagePath` variants are defined but used NOWHERE in
  production code.
- Trevor DOES have a face already: `TrevorAvatar` in
  `src/components/TrevorGuideView.tsx` is a DiceBear pixel-art avatar (external
  URL) shown in the panel header and in the collapsed launcher pill. Trevor is
  text + that avatar; the user's persona is absent from both.
- The panel and launcher are global (`<TrevorGuide />` in `App.tsx:502`) — the
  launcher is visible on every page. A companion there is "on each page" for
  free.
- The user's type is available everywhere via `useApp()` → `fieldType`
  (`FieldTypeId | null`; null/unclassified before the quiz). `FIELD_TYPES[id]`
  gives `avatarPath` and the name.
- Motion infra already exists: framer-motion is used in TrevorGuideView
  (AnimatePresence + motion panel/launcher) and `useReducedMotion()` is the
  established pattern (DevelopingPolaroid, FieldtripLoader), plus
  `motion-reduce:` Tailwind classes in the panel. No new animation dependency.
- Art constraint: `full.png` files are 1.5–3MB and load slowly (~5s on
  Profile). Everyday spots MUST use `avatar.png` (small); `full.png` stays
  where it already is (Profile, level-up) and out of Tier 1's new surfaces.
  CORRECTION Nov 20 (found during build): `avatar.png` was NOT small either —
  1.0–2.6MB each at 1254–1600px. All six were resized to 256×256 (Lanczos,
  optimized) as part of this build: 77–128KB each, ~20x smaller, visually
  identical at the 32–64px display sizes. Originals remain in git history.

## 3. Design

### 3.1 New shared component: `CompanionAvatar`

`src/components/CompanionAvatar.tsx`. Resolves the persona itself from
`useApp()` `fieldType`; renders nothing when unclassified/null.

- Image: the persona's `avatarPath`, fixed-size container (no layout shift),
  `alt` with the persona name.
- Animation variants (framer-motion), driven by a `mood` prop:
  - `idle` — gentle bob loop (y 0 → −4 → 0, slow, infinite).
  - `pop` — spring in on mount (scale 0.6 → 1, slight overshoot).
  - `celebrate` — bounce (y jumps, 2 cycles) for celebration tone.
  - `warn` — small shake (x ±3, once) for warning tone.
- `useReducedMotion()`: when on, no loops and no large motion — static avatar
  with only the panel's existing 80ms fade. Same rule as the rest of the app.
- Sizes: `small` (32px, launcher), `large` (40px, panel header), `spotlight`
  (64px, Basecamp). One component, three sizes.

### 3.2 Trevor panel header — companion beside Trevor

In `TrevorGuideView`'s panel header, the row becomes
`[TrevorAvatar] [Trevor // Field guide …] [CompanionAvatar]`: Trevor on the
left as today, the companion on the right, before the collapse button. Mood is
driven by the recommendation tone: `celebration` → celebrate,
`warning` → warn, anything else → idle. The companion pops in with the panel
(`pop` on mount). This is the deck-complete moment too: DECK_COMPLETE auto-opens
the panel with celebration tone, so the companion bounces there with no extra
wiring.

### 3.3 Trevor launcher — duo stack on every page

The collapsed launcher pill shows a duo stack: TrevorAvatar in front, the
companion slightly behind and offset (overlapping circles, companion at
−8px). Same label and chevron as today. This is the "on each page" surface:
the launcher is fixed and global, so the companion is visible everywhere
without opening anything. When unclassified, the launcher is exactly as today.

### 3.4 Basecamp companion

A companion block on Basecamp, beside the greeting/next-action area (exact spot
chosen in the build from the layout): spotlight-size avatar with `idle` bob,
the persona name ("Mascota — Hype Beast") and one vibe line underneath. Tap
opens the Profile field-type section. This is the home-screen presence; the
panel/launcher cover the other pages.

### 3.5 What this does NOT do

- No new art, no expression variants, no Lottie/Rive (Tiers 2–3, later if wanted).
- No change to Trevor's face, voice, copy, rules, or priorities. Trevor stays
  the main guide; the companion never speaks.
- No change to Profile or the level-up screen (they already show the art).
- No `full.png` in any new surface (size). No `card.png` use yet either.
- No per-page companion beyond the global launcher/panel + Basecamp. If a
  specific page wants one later (Dex, Missions), it reuses `CompanionAvatar`.

## 4. Build plan

1. `src/components/CompanionAvatar.tsx` (new): persona resolution, sizes,
   moods, reduce-motion handling (§3.1).
2. `src/components/TrevorGuideView.tsx`: companion in the panel header
   (mood from tone) + duo stack in the launcher (§3.2–3.3). No other panel
   changes.
3. `src/pages/Basecamp.tsx` (or the Basecamp view-model surface it renders):
   companion block (§3.4).
4. Tests: companion renders the right `avatarPath` for all six types; hidden
   when unclassified; mood mapping (celebration → celebrate, warning → warn,
   normal → idle); reduce-motion renders static (no infinite animation);
   launcher duo renders only when classified; Basecamp block present with the
   persona name; existing TrevorGuide tests stay green.
5. Verify: tsc clean, full non-integration suite (only the 2 known failures),
   build clean. Commit own paths only, push.

## 5. Live check

The browser can verify: Trevor panel shows the companion next to Trevor and it
reacts to tone; the launcher shows the duo on every page; Basecamp shows the
companion block with the persona name; with Reduce motion on, the avatar is
static. The phone check is Zach's: the companion feels present while playing,
and the deck-complete pop bounces. If the avatar feels too small or too quiet
on first sight, that is Tier 2 territory (expressions), not a Tier 1 fix.

Live check Nov 20 (~1:25 PM PST): Basecamp block present and clean
("ELONDRA — DRAMATURG", "Sophisticated, Dramatic, Sharp"); panel header clean
with Elondra beside Trevor. BUT the collapsed launcher was broken: Trevor's
avatar rendered as a giant ~350px card covering page content and hiding the
label. Cause: the duo wrapped TrevorAvatar in a plain span, so it went back to
inline, h-8/w-8 stopped applying, and the DiceBear SVG rendered at intrinsic
size. Fix (commit 11cde6a): `block` on TrevorAvatar's span + regression test
pinning the block + size classes. Re-check of the launcher running.
