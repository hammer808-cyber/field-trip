---
name: Paper Adventure
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5e5e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdb'
  on-secondary-container: '#63635f'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#191e00'
  on-tertiary-container: '#7a8c00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e4e2dd'
  secondary-fixed-dim: '#c8c6c2'
  on-secondary-fixed: '#1b1c19'
  on-secondary-fixed-variant: '#474744'
  tertiary-fixed: '#d2f000'
  tertiary-fixed-dim: '#b8d300'
  on-tertiary-fixed: '#191e00'
  on-tertiary-fixed-variant: '#414c00'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-xl:
    fontFamily: Anton
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1'
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1'
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Space Mono
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Archivo Narrow
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Archivo Narrow
    fontSize: 10px
    fontWeight: '500'
    lineHeight: '1'
spacing:
  grid_unit: 4px
  margin_mobile: 16px
  margin_desktop: 40px
  gutter: 12px
  stack_offset: 6px
---

## Brand & Style

This design system draws inspiration from editorial magazines, travel ephemera, and Neo-Brutalist aesthetics. It is designed to feel like a tangible, living scrapbook—an organized but energetic collection of missions, tickets, and field notes.

The brand personality is adventurous, expressive, and slightly subversive. It balances a high-end editorial structure (tight typography and generous whitespace) with "low-fi" tactical elements like tape, stamps, and high-contrast borders. The emotional response is one of discovery and "collectible energy," similar to a premium mobile game interface where every screen feels like a new artifact.

Key visual pillars include:
- **Neo-Brutalism:** Heavy black borders, sharp corners, and high-contrast accent colors.
- **Tactile Paper:** Layered surfaces using off-white paper textures and subtle graph-paper grids to evoke physical field journals.
- **Curated Chaos:** Intentional use of "crooked" elements (taped-on labels, tilted stickers) to break the digital rigidity and provide a "DIY" premium feel.

## Colors

The palette is built on a foundation of high-contrast neutrals to ground the "editorial" look, punctuated by an aggressive, neon accent palette.

- **Foundational Neutrals:** Pure White (#FFFFFF) and Warm Paper (#F9F7F2) are used for surfaces and backgrounds. Black (#000000) is used exclusively for borders, heavy typography, and structural containers.
- **Primary Accent (Acid Lime):** Use #DFFF00 for primary actions, success states, and highlight moments to draw the eye.
- **Support Accents:** Cyan, Magenta, Orange, and Purple serve as category-specific identifiers or "collectible" status indicators (e.g., mission tiers or rarity levels).

Avoid gradients. Colors should be applied in flat, solid blocks to maintain the raw, graphic nature of the design system.

## Typography

The typographic hierarchy is intentionally jarring and bold. It contrasts the massive, condensed weight of **Anton** for headlines with the technical, monospaced feel of **Space Mono** for body copy.

- **Headlines:** Always uppercase. Use tight line-heights and slight letter-spacing to create a "pasted poster" aesthetic.
- **Body:** Use monospaced fonts to reinforce the field-report and technical documentation theme.
- **Labels:** Use Archivo Narrow for data-dense areas or UI navigation to ensure legibility despite the condensed width.
- **Editorial Flourishes:** Occasionally use italics or underline decorations for sub-headers or "Field Headquarters" identifiers to mimic handwritten or typed notes.

## Layout & Spacing

This design system uses a **fluid-grid layout** built on a 4px baseline. The structural backbone is a subtle graph-paper pattern (12px or 16px squares) visible in the background of main containers.

- **Stacking & Offsets:** Containers often use an "offset stack" layout. Instead of perfectly centered elements, cards may be layered with a 6px offset to the bottom-right to create a sense of physical paper stacks.
- **Margins:** High-density content is centered within wide "editorial" margins to maintain a premium feel.
- **Safe Zones:** Heavy 2px-4px black borders act as structural frames, defining the edges of the "mission" space.

## Elevation & Depth

Depth is conveyed through **Hard Layering** rather than soft blurs.

- **Tonal Stacking:** Use the off-white and pure white surfaces to create hierarchy. A white card sits on an off-white background.
- **Hard Shadows:** Use "Block Shadows"—solid black offsets (e.g., 4px x 4px) with 100% opacity—to make elements pop from the page.
- **Tactile Overlays:** Use "Digital Tape" (rectangular semi-transparent strips) to "stick" labels to the top of cards.
- **Depth Layers:** Background (Graph Paper) > Surface (Off-white Paper) > Active Card (White with 4px border) > Highlight (Neon Accents).

## Shapes

The shape language is strictly **Sharp and Geometric**. 

- **Corners:** 0px radius for all primary containers, buttons, and input fields. This reinforces the Brutalist and "cut paper" aesthetic.
- **Irregularity:** Intentionally tilt certain UI elements (like status chips or "stamps") by 1-3 degrees to mimic the imperfection of a physical scrapbook.
- **Tabs:** Use "folder tab" shapes at the top of containers to denote sections or categories.

## Components

- **Buttons:** Primary buttons use the Acid Lime (#DFFF00) background with a 2px black border and heavy black Anton text. They should have a 4px black hard shadow that "depresses" (moves 2px in) on hover/active states.
- **Cards (Missions):** White backgrounds with 2px black borders. Header areas are often separated by a horizontal line. Use a "taped-on" look for status labels (e.g., "COMPLETED" in a neon orange strip).
- **Stickers & Chips:** Small, high-contrast rectangles with sharp corners. These should look like they’ve been stuck onto the page, occasionally overlapping the border of the parent container.
- **Input Fields:** Simple black outlines with Space Mono text. Labels sit on the border line or are "taped" above the field.
- **Navigation:** A fixed bottom bar or sidebar using high-contrast blocks. Active states are indicated by an inverted color block (e.g., black background with white text).
- **Progress Bars:** Use a "segment" style, looking like a series of filled blocks or a technical gauge rather than a smooth slider.