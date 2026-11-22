import React, { ReactNode } from 'react';

/**
 * FrankieQuiet — the "fewer words" half of Frankie Mode (Nov 21, 2026).
 *
 * Simple Words already swaps hard words for easy ones; it does not
 * reduce the amount of words. Wrap secondary text in this component and
 * it renders only when Frankie Mode is OFF: helper lines, flavor,
 * meta, and breakdowns disappear for Frankie players, while the title,
 * the one-line instruction, the steps, and the buttons stay.
 *
 * Prop-based (no useTheme inside) so it is trivially testable with
 * renderToStaticMarkup; every call site already has `frankieMode` from
 * useTheme(). See docs/frankie-quiet-mode-design.md for the per-surface
 * list of what hides.
 */
export function FrankieQuiet({
  frankieMode,
  children,
}: {
  frankieMode: boolean;
  children: ReactNode;
}) {
  if (frankieMode) return null;
  return <>{children}</>;
}

export default FrankieQuiet;
