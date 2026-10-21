# Frankie Mode (Simple Words) — how it works

Frankie Mode is Fieldtrip's plain-language mode, named for the internal
"Frankie — The Plain Player" persona in `src/constants.ts`: low friction,
extremely clear calls to action, simplicity over flavor text.

## What it changes for the player

- **Card words**: every playable card (all 83 across Starter, SoCal Summer,
  Heatwave Receipts, Jet Setter, and The Errand Deck) shows a plain title,
  a one-sentence plain ask, 3 plain steps, and a simple field-note prompt.
- **The switch is findable**: Profile → Settings opens with the
  **Simple Words** card (`src/components/FrankieModeCard.tsx`), the Missions
  page shows a one-tap Simple Words banner while the mode is off, and the
  skin picker's toggle is labeled "Simple Words & Visual Calm" (same switch).
- **Browse, don't just draw**: the Missions page renders the deck library as
  a face-up grid for the active deck. Locked cards can be previewed but not
  started. In Frankie Mode, tiles show the plain title + one-line ask, and
  the preview shows the numbered steps and a "Do This One" button.
- **The field note never blocks**: in Capture, Frankie Mode replaces the
  10-character note requirement with one-tap note chips (or write your own,
  or **Skip — No Note**) and the submit button reads "Send It In."
  Non-Frankie players keep the existing 10-character rule.

## Where the copy lives

All plain copy is in **one file**: `src/data/plainCardCopy.ts`
(`PLAIN_CARD_COPY`, keyed by card ID). `src/logic/frankieModeLogic.ts`
resolves in this order when the mode is on:

1. `PLAIN_CARD_COPY` registry
2. `plain*` fields on the card itself (e.g. admin/Firestore-authored cards)
3. Original flavor copy

Keeping it in the logic layer means Firestore-loaded cards get plain copy
too, not just the local banks.

## Writing rules for new cards

- `plainTitle`: max ~4 words, a real concrete thing. No metaphors, no slang.
  ("Aisle Oracle" → "A Sign in a Store")
- `plainDescription`: one sentence, verb first, exactly what to photograph,
  2–3 clear examples max.
- `plainDirections`: exactly 3 short steps joined by `\n`
  ("Find… / Take one clear photo of it. / Tap Send." pattern).
- `plainFieldNotePrompt`: one short prompt a tired person can answer.
- Never ask for photos of private documents (passports, key cards, receipts
  with payment details) — phrase around safe details instead.

## Tests

`src/__tests__/frankieMode.test.ts` enforces coverage: every card in the
five banks must have a registry entry, no orphan entries, directions must
be 3 steps, and the resolvers must return plain copy with the mode on and
flavor copy with it off. Run with:

```
npx tsx --test src/__tests__/frankieMode.test.ts
```

## Known remaining gap

Card art is still the generated badge/emoji artwork from
`getMissionImage` — there are no per-card example photos yet. Showing a
real example photo per card (what a good shot looks like) is the next
accessibility step for photography-first players.
