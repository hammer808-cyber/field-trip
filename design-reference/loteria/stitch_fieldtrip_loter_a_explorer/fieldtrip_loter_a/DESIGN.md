---
name: Fieldtrip Lotería
colors:
  surface: '#fafbe5'
  surface-dim: '#dbdbc6'
  surface-bright: '#fafbe5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f5df'
  surface-container: '#efefd9'
  surface-container-high: '#e9ead4'
  surface-container-highest: '#e3e4ce'
  on-surface: '#1b1d10'
  on-surface-variant: '#454932'
  inverse-surface: '#303223'
  inverse-on-surface: '#f2f2dc'
  outline: '#767960'
  outline-variant: '#c6c9ab'
  surface-tint: '#576500'
  primary: '#576500'
  on-primary: '#ffffff'
  primary-container: '#dfff00'
  on-primary-container: '#647400'
  inverse-primary: '#b8d300'
  secondary: '#a900a9'
  on-secondary: '#ffffff'
  secondary-container: '#fe00fe'
  on-secondary-container: '#500050'
  tertiary: '#a23f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffece5'
  on-tertiary-container: '#ba4900'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2f000'
  primary-fixed-dim: '#b8d300'
  on-primary-fixed: '#191e00'
  on-primary-fixed-variant: '#414c00'
  secondary-fixed: '#ffd7f5'
  secondary-fixed-dim: '#ffabf3'
  on-secondary-fixed: '#380038'
  on-secondary-fixed-variant: '#810081'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#fafbe5'
  on-background: '#1b1d10'
  surface-variant: '#e3e4ce'
typography:
  display-lg:
    fontFamily: Anton
    fontSize: 72px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 32px
  card-title:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  mono-data:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 12px
spacing:
  base: 8px
  grid-gutter: 12px
  screen-margin: 20px
  card-padding: 16px
---

## Brand & Style
The design system embodies a "Clean Brutalist" aesthetic—a high-energy, high-contrast framework designed for mobile-first social discovery. It balances the raw, structural integrity of a vintage game board with the polished, aggressive styling of a modern fashion editorial.

The brand personality is theatrical and adventurous. It utilizes heavy strokes, unapologetic whitespace, and tactile textures to evoke the feeling of physical ephemera. Key visual pillars include:
- **Kinetic Energy:** Motion-driven layouts and oversized elements that feel "too big" for the screen.
- **Physicality:** Use of paper-grain overlays, vinyl sticker motifs, and chrome accents to make digital interactions feel like collecting physical tokens.
- **Structured Chaos:** A rigid underlying grid that allows for "messy" expressive elements like overlapping holographic gradients and offset shadows.

## Colors
The palette is a high-octane "Day-Glo" spectrum set against a binary foundation of Black and White.

- **Foundation:** Use #FFFFFF for the primary canvas to maintain a "clean" editorial feel. #000000 is used for all structural borders (3px minimum) and primary text.
- **Action & Identity:** Acid Lime (#DFFF00) is the primary call-to-action color.
- **Categorization:** Hot Magenta, Safety Orange, and Cyan act as functional signifiers for different scavenger hunt categories (e.g., Objects, People, Places).
- **Depth:** Deep Purple (#4B0082) is reserved for "Super-Rare" states or deep-shadow accents.
- **Texture:** Apply a 5% opacity "Paper Grain" overlay across all full-screen fills to prevent colors from feeling digitally sterile.

## Typography
Typography is used as a primary graphical element.

- **Headlines:** Use **Anton** for all high-level headings. It should be tightly tracked and often set in "Impact" style—large enough to bleed off the edges of the container in some instances.
- **Body:** **Inter** provides the necessary legibility for social descriptions and instructions. Keep weights medium (500) or higher to match the heavy stroke weight of the UI elements.
- **Technical Labels:** **Space Grotesk** is used for "Catalog Codes," timestamps, and proof metadata, nodding to the "Camp Ephemera" and "Collection" aspect of the app.

## Layout & Spacing
The layout follows a strict 3x3 interactive grid for the game board, but utilizes fluid vertical scrolling for discovery feeds.

- **The Lotería Grid:** On mobile, the 3x3 board should occupy the full width minus the screen margins. Each cell must be a perfect square.
- **Margins & Gutters:** Use a consistent 12px gutter between cards to allow the background (often a graph-paper pattern or solid Deep Purple) to peek through.
- **Breakpoints:**
    - **Mobile (<600px):** Single column feed or 3x3 grid.
    - **Tablet/Desktop:** Fixed-width 3x3 board centered (max-width 500px) with "sticker-slapped" social elements floating in the side margins.

## Elevation & Depth
This design system rejects realistic shadows in favor of **Brutalist Offsets**.

- **Hard Shadows:** Use 100% opacity black offsets (usually 4px or 8px) rather than blurs. This creates a "stamped" or "cut-out" appearance.
- **Tactile Layers:** Use "Chrome" gradients on active icons to simulate metallic pins or badges.
- **Holographic Depth:** Use semi-transparent holographic gradients on "Completed" cards. These should use a `hard-light` or `overlay` blend mode against the card's primary color.
- **Borders:** Every container must have a 3px solid black border. No exceptions.

## Shapes
The shape language is strictly geometric and "sharp."

- **Primary Elements:** Squares and rectangles have 0px corner radii to maintain the Brutalist aesthetic.
- **Sticker Accents:** Occasional "Circle" elements (for notifications or catalog stamps) are permitted but should still feature the heavy 3px black border.
- **Interactions:** When a button or card is pressed, it should shift -4px horizontally and -4px vertically, "covering" its own hard shadow to simulate a physical press.

## Components

### Lotería Cards
The core unit of the app. Each card features:
- A 3px black border.
- A 12px vertical color band at the top indicating the category (using the secondary/tertiary palette).
- An alphanumeric catalog code (e.g., "LT-092") in the top right using `mono-data` type.
- A central image area with a high-contrast, slightly grainy filter.

### Buttons
- **Primary:** Acid Lime fill, 3px black border, heavy black bottom-right offset (8px). Text in Anton (All Caps).
- **Secondary:** White fill, 3px black border, 4px offset.
- **Center Action (Camera):** A large circular button in the bottom nav, styled with a Chrome/Metallic gradient and a "Glass" lens icon.

### Navigation
- A solid white bottom bar with a 4px black top border.
- Icons are 2D, heavy-stroke "Sticker" style. When active, they gain a holographic glow or a "Safety Orange" tint.

### Lists & Feeds
- Social feeds should look like a stack of photos. Use slight random rotations (+/- 1-2 degrees) on feed items to simulate a messy desk of prints.

### Input Fields
- Use a "Graph Paper" pattern background within the input box.
- Active state: Border changes from Black to Hot Magenta.