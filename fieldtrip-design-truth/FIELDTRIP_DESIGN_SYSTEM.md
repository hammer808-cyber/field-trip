# Fieldtrip Design System

**Status:** Canonical
**Applies to:** Product UI, visual assets, responsive behavior, motion, copy presentation, and skins

Fieldtrip uses a **high-voltage field guide** aesthetic: clean brutalist structure, campy collectible energy, social fashion attitude, and tactile print textures. It should feel designed, not randomly decorated by a sticker cannon with unresolved childhood issues.

---

## 1. Design Principles

### 1.1 Clear before chaotic

The visual personality may be loud. The information hierarchy may not be.

- One obvious primary action per state.
- Strong type hierarchy.
- High contrast.
- Decorative layers never obscure proof, progress, status, or navigation.

### 1.2 Tactile, not skeuomorphic clutter

Use:

- graph paper;
- clipped labels;
- glossy vinyl stickers;
- chrome or holographic accents;
- taped-photo and field-note motifs;
- subtle paper grain.

Avoid:

- excessive drop shadows;
- fake three-dimensional controls with unclear hit areas;
- several competing textures on one component;
- illegible novelty lettering.

### 1.3 Mobile is the primary canvas

- Design at 390 px first.
- Essential actions stay reachable with one hand.
- Respect device safe areas.
- Do not hide core actions below ornamental artwork.
- Camera, mission, and repair flows must work without desktop-only assumptions.

### 1.4 The app is one world

Deck art may change by theme, but navigation, labels, status treatments, component behavior, and cataloguing marks remain consistent.

---

## 2. Core Visual Language

### 2.1 Base palette

Use semantic tokens rather than hard-coded colors.

| Token | Purpose | Reference value |
|---|---|---|
| `--ft-paper` | Primary light surface | `#F7F5EF` |
| `--ft-ink` | Primary text and hard borders | `#111111` |
| `--ft-white` | Clean cards and reverse text | `#FFFFFF` |
| `--ft-chrome` | Metallic neutral | `#C9CED3` |
| `--ft-lime` | Primary acid accent | `#C7FF00` |
| `--ft-magenta` | Social/reward accent | `#FF2DAA` |
| `--ft-cyan` | Informational accent | `#19D7FF` |
| `--ft-purple` | Collection/mystery accent | `#7A3CFF` |
| `--ft-orange` | Heat, urgency, seasonal energy | `#FF6A00` |
| `--ft-red` | Destructive/error only | `#D92D20` |
| `--ft-green` | Approved/success | `#14804A` |
| `--ft-amber` | Pending/caution | `#A15C00` |

Reference values establish direction. Production tokens must satisfy contrast requirements in their actual context.

### 2.2 Status colors are semantic

- Approved: green.
- Pending review: amber.
- Needs More Proof: orange or magenta with explicit text.
- Rejected/error: red.
- Locked: neutral gray with a visible lock and explanation.
- Informational: cyan.

Never communicate status using color alone.

### 2.3 Typography

Use three roles:

1. **Display:** bold condensed or grotesk face for large titles and numbers.
2. **Interface:** highly readable sans serif for controls and body copy.
3. **Annotation:** restrained mono or handwritten-style face for labels, stamps, and metadata.

Rules:

- Do not use annotation fonts for paragraphs or critical controls.
- Use sentence case for body text and buttons.
- Use uppercase selectively for catalog labels, tabs, short stamps, and score numbers.
- Minimum body size: 16 px on mobile.
- Minimum control size: 15 px, preferably 16 px.
- Avoid line lengths above roughly 70 characters for dense copy.

---

## 3. Spacing, Shape, and Borders

### 3.1 Spacing scale

Use a 4 px base grid:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Rules:

- Standard card padding: 16 or 20 px.
- Page gutters: 16 px mobile, 24–32 px tablet/desktop.
- Section spacing: 24–40 px.
- Do not solve hierarchy by adding random 7 px and 13 px gaps until the page resembles a ransom note.

### 3.2 Corners

- Compact controls: 8–12 px radius.
- Cards: 16–20 px radius.
- Pills: fully rounded only for tags, statuses, and segmented controls.
- Hero cards may use one distinctive clipped or sticker-like corner treatment.

### 3.3 Borders

- Primary Fieldtrip border: 2 px solid ink.
- Secondary dividers: 1 px neutral.
- Selected or featured items may use 3 px borders.
- Hard black borders are a structural motif, not decoration to apply to every nested box.

---

## 4. Layout

### 4.1 Page shell

Every primary page includes:

- canonical header treatment;
- page title and short context line;
- main content region;
- persistent primary navigation;
- safe-area padding;
- loading and error boundaries.

The Basecamp header is the reference model for primary page headers.

### 4.2 Responsive breakpoints

Use content-driven breakpoints, with these defaults:

- compact: `< 600 px`
- medium: `600–1023 px`
- wide: `≥ 1024 px`

Do not create a desktop composition and shrink it until the labels beg for mercy.

### 4.3 Cards and grids

- Mobile: one-column content unless a two-up layout improves direct comparison.
- Big Board wide layout: six-column system.
- Grids must preserve canonical mobile order when collapsed.
- Cards with actions must keep action placement consistent.

---

## 5. Component Rules

### 5.1 Buttons

**Primary button**

- One per decision state.
- Solid high-contrast fill.
- Verb-led label: “Start mission,” “Submit proof,” “Fix proof.”

**Secondary button**

- Outlined or neutral surface.
- Supports but does not compete with primary action.

**Tertiary button**

- Text or icon treatment.
- Used for low-risk optional actions.

Rules:

- Minimum touch target: 44 × 44 px.
- Disabled controls include a reason nearby when the user needs to understand the lock.
- Icon-only controls require accessible labels and tooltips where appropriate.
- Never use a question-mark button unless it opens meaningful contextual help.

### 5.2 Status chips

Each chip includes:

- icon;
- canonical status label;
- semantic color;
- optional timestamp or count outside the chip.

### 5.3 Mission cards

A mission card must display:

- deck identity;
- mission title;
- short instruction;
- proof requirements;
- Field XP range or maximum when appropriate;
- current state;
- one state-appropriate action.

Mission-card states must be visually distinct without changing the basic component structure.

### 5.4 Deck decals and cataloguing labels

Every deck uses the same cataloguing system:

- Fieldtrip mark;
- deck code, such as `FT-05`;
- deck name;
- deck category or season;
- consistent decal position and hierarchy;
- consistent trim/safe area.

Artwork may change. Cataloguing labels do not drift from deck to deck.

### 5.5 Proof lights

When AI evidence indicators are shown, use the canonical order:

1. Object
2. Surface
3. Person/Crew
4. Scene
5. Action
6. Location clue

Rules:

- Indicators are guidance, not final approval.
- A missing light explains what evidence may help.
- Do not imply the AI score is authoritative when admin review determines final approval.

### 5.6 Trevor card

- One compact floating or embedded card.
- Maximum two recommended actions at a time.
- First action follows the product priority order.
- Trevor uses the correct reaction pose for the current state.
- Card can be dismissed or disabled according to settings without leaving duplicate help controls behind.

---

## 6. Motion and Feedback

Motion communicates cause and effect.

Use motion for:

- card draws;
- proof capture confirmation;
- approval and reward reveals;
- state transitions;
- collection additions;
- rank or progress updates.

Rules:

- Standard duration: 150–300 ms.
- Reward moments may extend to 600 ms.
- Support reduced-motion preferences.
- Never block navigation while decorative animation completes.
- Use haptics sparingly on supported devices for capture, submission, and reward confirmation.

---

## 7. Imagery and Asset Rules

### 7.1 Character art

- Preserve character identity, proportions, outfit, and core accessories across poses.
- Export transparent PNG or WebP with consistent canvas dimensions.
- Keep feet, hair, props, and gesture fully inside the safe area.
- Use consistent lighting and outline treatment.

### 7.2 Stickers

- One sticker per asset.
- Transparent background.
- Bold, clean outline.
- Minimal words.
- No fake logos or unrelated phrases.
- Crop-safe with breathing room.
- Readable at 64–96 px.

### 7.3 Proof photography

- Player proof remains visually primary.
- Filters may be expressive but must not obscure evidence.
- Do not crop or zoom proof automatically in ways that change meaning.
- Preserve original capture metadata separately from display derivatives when available.

---

## 8. Accessibility

Required:

- WCAG AA contrast for interface text and controls;
- keyboard access for web interactions;
- visible focus indicators;
- accessible names for icon controls;
- semantic headings;
- descriptive error messages;
- alt text or meaningful fallback for nondecorative images;
- reduced motion support;
- dynamic text resilience where supported.

### Frankie Mode

Frankie Mode is a plain-language presentation option.

It may:

- simplify instructions;
- reduce decorative copy;
- break tasks into smaller steps;
- clarify proof requirements;
- expose status definitions.

It must not:

- remove gameplay functionality;
- change scoring;
- infantilize the player;
- replace canonical labels with unrelated terminology.

---

## 9. Canonical Skins

Skins change layout treatment, texture, and component presentation, not only color. All skins use the same navigation labels, interaction logic, content hierarchy, accessibility requirements, and game state.

### 9.1 `field-manual` — Field Manual

Default skin.

- Paper and graph-grid foundation.
- Black structural borders.
- Lime and cyan accents.
- Clipped labels, stamps, and taped proof.
- Dense but orderly field-guide composition.

### 9.2 `mall-after-dark` — Mall After Dark

- Black and chrome foundation.
- Magenta, purple, and cyan neon.
- Glossy panels, receipt strips, escalator-grid motifs.
- More horizontal carousels and marquee labels.
- No loss of text contrast beneath glow effects.

### 9.3 `heatwave` — Heatwave

- Warm paper or sun-bleached foundation.
- Safety orange, hot pink, and acid lime.
- Oversized sun-stamp shapes, heat-map gradients, wavy separators.
- Cards may stack like postcards or roadside flyers.
- Avoid orange-on-pink text combinations that destroy readability for sport.

### 9.4 `night-hike` — Night Hike

- Deep navy/black foundation.
- Cyan, lime, and reflective silver accents.
- Flashlight cones, reflective trail markers, dark-map grid.
- Cards use luminous edge treatments and stronger internal spacing.
- Status colors remain semantically distinct from decorative glow.

### Skin implementation contract

Each skin supplies tokens for:

- background and surface;
- text and border;
- primary and secondary accents;
- header composition;
- card composition;
- navigation treatment;
- texture assets;
- decorative shapes;
- zine cover templates;
- mission-card art frame;
- Trevor card frame.

Components may expose named visual slots. Skins may not fork business logic or duplicate entire pages.

---

## 10. Copy Presentation

- Headlines: brief, specific, and active.
- Instructions: one action per sentence where possible.
- Buttons: verbs, not vague labels like “Continue” when the destination can be named.
- Error copy: explain what happened, what was preserved, and what to do next.
- Locked copy: name the requirement and progress.
- Avoid schoolish terms such as assignment, grade, homework, or teacher approval.
- Humor may flavor empty states and Trevor, but never hide an important rule.

---

## 11. Design QA Checklist

Before approving a screen:

- Does it use canonical labels?
- Is the primary action obvious within three seconds?
- Does every visible control work or explain why it does not?
- Does the mobile version preserve safe areas and touch targets?
- Are all status states distinguishable with text and icons?
- Does the active skin change composition without changing product behavior?
- Are Fieldtrip deck labels and codes consistent?
- Are loading, empty, locked, error, and success states designed?
- Does Frankie Mode remain usable?
- Can the screen survive long names, larger text, and missing imagery?
