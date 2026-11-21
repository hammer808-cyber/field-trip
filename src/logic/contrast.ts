/**
 * P0-2 (audit fix, Nov 19): WCAG contrast helpers. No single text color
 * clears 4.5:1 on every skin's warning/success/error/primary/secondary
 * background (e.g. white on arcade warning is 1.25:1, black on notebook
 * warning is 4.37:1), so the text color is derived from
 * the live background hex instead of hardcoded white. The higher-ratio
 * side of black/white always clears 4.5:1 — the two ratios cross at
 * ~4.58:1 — so picking the max is sufficient.
 *
 * These lived in MissionLogbookPanel until Nov 20, 2026, when the Missions
 * contrast fix needed them in Deck.tsx — and the missions-bare rule bans
 * the MissionLogbookPanel name from that file. They are pure logic, so
 * they live here now; MissionLogbookPanel re-exports them for its existing
 * importers.
 */

/** WCAG 2.x relative luminance of a #rrggbb hex color. */
export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two #rrggbb hex colors. */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const [lighter, darker] = [relativeLuminance(foregroundHex), relativeLuminance(backgroundHex)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Black or white text on a background hex — whichever clears 4.5:1. */
export function pickTextOnBackground(backgroundHex: string): '#000000' | '#ffffff' {
  return contrastRatio('#000000', backgroundHex) >= contrastRatio('#ffffff', backgroundHex)
    ? '#000000'
    : '#ffffff';
}

/**
 * Read a skin background hex off the live CSS variable ThemeContext sets on
 * <html> (e.g. --skin-warning). Falls back to the classic skin token when
 * the variable is unset (tests, SSR, or no provider yet) — the classic
 * skin is the default, so the fallback pair is itself a passing pair.
 */
export function skinVarHex(varName: string, fallbackHex: string): string {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return fallbackHex;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallbackHex;
}
