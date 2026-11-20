// P0-4 (audit fix, Nov 19, 2026): one global keyboard-focus indicator.
// The draw -> capture -> submit path had zero focus-visible styles and 63
// outline-none uses, so keyboard users could not tell where they were.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('P0-4: index.css carries one global :focus-visible rule (4px brand-cyan)', () => {
  const css = read('src/index.css');
  // Reuses the established pattern from DevelopingPolaroid / StickerBook
  // (focus-visible:outline-4 outline-brand-cyan), as one global rule.
  assert.match(
    css,
    /:focus-visible \{\n\s*outline: 4px solid var\(--color-brand-cyan, #00f0ff\);\n\s*outline-offset: 2px;\n\}/,
  );
});

test('P0-4: the global rule is :focus-visible only, never plain :focus', () => {
  // :focus-visible matches keyboard/switch focus only, so the ring must not
  // appear on pointer taps. A plain :focus outline rule would break that.
  const css = read('src/index.css');
  assert.doesNotMatch(css, /(^|\n):focus \{/);
  assert.doesNotMatch(css, /(^|\n):focus,/);
});

test('P0-4: the global rule is unlayered, so it beats Tailwind utilities', () => {
  // Tailwind v4 puts outline-none / focus:outline-none in @layer utilities,
  // and unlayered author CSS wins over any layered rule. If this rule ever
  // moves inside an @layer it loses to the utilities layer and the fix
  // silently stops working — same cascade fact as the .skin-viewfinder rule.
  const css = read('src/index.css');
  const ruleAt = css.indexOf(':focus-visible {');
  assert.ok(ruleAt > -1, 'global :focus-visible rule missing');
  // Strip comments first: the rule's own comment mentions @layer.
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const uncommentedRuleAt = uncommented.indexOf(':focus-visible {');
  const before = uncommented.slice(0, uncommentedRuleAt);
  const lastLayerOpen = before.lastIndexOf('@layer');
  const lastLayerClose = before.lastIndexOf('}');
  // No unclosed @layer block precedes the rule.
  assert.ok(lastLayerOpen === -1 || lastLayerClose > lastLayerOpen);
});
