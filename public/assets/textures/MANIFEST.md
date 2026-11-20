# Textures manifest — P2-16 (download half)

Self-hosted copies of the `transparenttextures.com` patterns hotlinked by the
app (audit §5.4 / §12 P2-16). Download half only: files were fetched and
verified here; the URL swaps in code are a separate later wave. No code
reference was changed.

Downloaded 2026-11-19 from `https://www.transparenttextures.com/patterns/`.
Each file below was verified as a real PNG that decodes (Pillow `Image.open`
+ `load()`), with the dimensions and byte size recorded.

## Downloaded

### handmade-paper.png
- Source: https://www.transparenttextures.com/patterns/handmade-paper.png
- Local: `public/assets/textures/handmade-paper.png`
- Bytes: 6,491 — Dimensions: 100 × 100 — Format: PNG, 8-bit colormap
- Referenced in (14 sites):
  - `src/index.css:285` (`.paper-texture`)
  - `src/components/ChallengeCard.tsx:110`
  - `src/components/DeckPackSelector.tsx:264`
  - `src/components/DeckStack.tsx:127`, `src/components/DeckStack.tsx:157`
  - `src/components/EntryCard.tsx:80`
  - `src/components/QuickMissionCard.tsx:63`
  - `src/components/DeckLibrary.tsx:236`, `src/components/DeckLibrary.tsx:386`
  - `src/components/BottomNav.tsx:115`
  - `src/pages/BigBoard.tsx:569`
  - `src/pages/Deck.tsx:868`
  - `src/utils/styleHelpers.ts:22` (`paper`), `src/utils/styleHelpers.ts:27` (`tape`)

### micro-carbon.png
- Source: https://www.transparenttextures.com/patterns/micro-carbon.png
- Local: `public/assets/textures/micro-carbon.png`
- Bytes: 97 — Dimensions: 4 × 4 — Format: PNG, 8-bit gray+alpha
- Referenced in (1 site):
  - `src/index.css:364` (`body::after`)

### cubes.png
- Source: https://www.transparenttextures.com/patterns/cubes.png
- Local: `public/assets/textures/cubes.png`
- Bytes: 633 — Dimensions: 67 × 100 — Format: PNG, 8-bit colormap
- Referenced in (1 site):
  - `src/index.css:615`

### felt.png
- Source: https://www.transparenttextures.com/patterns/felt.png
- Local: `public/assets/textures/felt.png`
- Bytes: 131,898 — Dimensions: 500 × 466 — Format: PNG, 8-bit colormap
- Referenced in (1 site):
  - `src/index.css:972`

### graphy-dark.png
- Source: https://www.transparenttextures.com/patterns/graphy-dark.png
- Local: `public/assets/textures/graphy-dark.png`
- Bytes: 169 — Dimensions: 80 × 160 — Format: PNG, 2-bit colormap
- Referenced in (2 sites):
  - `src/components/EvidenceMeter.tsx:65`, `src/components/EvidenceMeter.tsx:130`

### grid-me.png
- Source: https://www.transparenttextures.com/patterns/grid-me.png
- Local: `public/assets/textures/grid-me.png`
- Bytes: 150 — Dimensions: 50 × 50 — Format: PNG, 4-bit colormap
- Referenced in (1 site):
  - `src/components/MissionResultCard.tsx:148`

### cream-paper.png
- Source: https://www.transparenttextures.com/patterns/cream-paper.png
- Local: `public/assets/textures/cream-paper.png`
- Bytes: 11,803 — Dimensions: 158 × 144 — Format: PNG, 8-bit colormap
- Referenced in (1 site):
  - `src/pages/BigBoard.tsx:80` (`grid` skin)

## BLOCKED — could not be downloaded

### splatter.png — BLOCKED (HTTP 404)
- Source: https://www.transparenttextures.com/patterns/splatter.png
- Local: not present (no file saved; the 404 HTML body was discarded, not kept)
- Error: `HTTP 404 Not Found` (nginx) on 2026-11-19, confirmed twice
  (default curl UA and a browser UA). The pattern does not exist at that
  URL on transparenttextures.com.
- Referenced in (2 sites):
  - `src/index.css:292` (`mask-image`)
  - `src/index.css:1146` (`mask-image`)
- No substitute was downloaded. The URL-swap worker must not point these
  two `mask-image` references at a different texture; the correct fix needs
  a decision (find the pattern's new name/location, or drop the mask).

## Excluded (intentionally not downloaded)

`design-reference/loteria/stitch_fieldtrip_loter_a_explorer/*/code.html`
references five more transparenttextures patterns
(`cardboard.png`, `p6.png`, `cardboard-flat.png`,
`recycled-paper-texture.png`, `natural-paper.png`). Those are static
reference mockups, not shipped app code (nothing in `src/`, `vite.config.*`,
or `package.json` loads them), so they are out of scope for P2-16.
