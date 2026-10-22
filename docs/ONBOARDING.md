# Onboarding: clean, quick, legally sound, still Fieldtrip

The rule for every onboarding surface: **lead plain, keep the flavor.**
Nothing Zach wrote gets erased or dumbed down — the plain layer sits on top
so a first-time player can scan fast, and the original wording stays one
glance below as the payoff.

## Explorer Type quiz (`src/data/personaQuiz.ts`, `PersonaQuiz.tsx`)

- Each question carries a `plainHeadline` (one short line, e.g. "You're at a
  strip mall. Where do you go first?"). The headline is the H1; the full
  original `prompt` renders under it in italic. In Frankie Mode only the
  headline shows.
- Each answer carries a `shortLead` (2–5 words naming the action, e.g.
  "Ask one quick question"). The lead renders bold; the original `text`
  renders under it. In Frankie Mode only the lead shows.
- Trevor's lines (`trevorVoice` / `stickyNote` in the data) render under the
  prompt in a Trevor chip. They were in the data for months before anything
  displayed them — check for that pattern when adding new quiz flavor.
- **Scoring never reads copy.** Results are keyed by answer `id` and
  `personaWeights` only. `onboardingSimplify.test.ts` sweeps all 216 answer
  combinations and guards the copy coverage, so a copy edit cannot silently
  change who gets which Explorer Type.

## Result page (`FieldTypeResult.tsx`)

- Each Explorer Type has a `plainSummary` (one plain sentence) in
  `src/constants/fieldTypes.ts`. It leads the result panel; the flavor
  `description` stays underneath as the quote. Frankie Mode shows only the
  plain summary.

## Trevor, the floating tutorial (`TrevorGuide.tsx`, `TrevorGuideView.tsx`)

- The panel may auto-open on a guidance state change, but it must **never
  steal focus** when it does. Focus moves into the panel only when the user
  tapped the launcher themselves (`focusPrimaryActionOnOpen` is set from the
  container's expand source: `user`, never `auto`).
- The panel offers two exits: "Hide for this session" (session suppression)
  and "Stop showing these tips" (permanent — writes
  `trevorSettings.enabled: false` on the profile, preserving the other
  trevorSettings keys). The guide already honors that setting; the panel
  just finally exposes it. Trevor can be re-enabled from profile settings.

## Legal gate (`BetaAccessGate.tsx`)

- **Two checkboxes, two consents.** "I am 18 or older" is its own checkbox;
  agreeing to the Terms, Privacy Policy, Community Rules, and Safety Rules
  is a second one. Both are required before the accept button enables.
  Bundling age into the documents checkbox weakens both consents — don't
  re-merge them.
- Consent records stay versioned (`src/constants/legal.ts`) and are saved
  with a timestamp and the adult confirmation (`legalService.saveConsent`).
- A failed save shows a visible error with a retry button and keeps the
  user's checkmarks. Never let this fail silently — an unsaved consent means
  the gate can't open, and a dead button with no message strands people at
  the front door.
