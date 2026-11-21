import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const charactersDir = join(repoRoot, 'public/assets/characters');
const PERSONAS = ['bigfoot', 'captainClipboard', 'elondra', 'mallRat', 'mascota', 'theGobbler'];
const VARIANTS = ['card', 'results', 'full'];
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function jpegWidth(bytes: Buffer): number {
  // Walk JPEG markers to the SOF0/SOF2 frame header and read its width.
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return bytes.readUInt16BE(i + 7);
    }
    const len = bytes.readUInt16BE(i + 2);
    i += 2 + len;
  }
  throw new Error('no SOF frame found');
}

test('character art: the big portraits are small JPEGs (Nov 20, 2026)', () => {
  // The 18 card/results/full files were 1.5-3.3 MB PNGs (45 MB total) at
  // 1024-1120px wide; Profile renders the portrait at 96px. They are now
  // JPEGs, max 768px wide, ~100-270 KB each. The avatar PNGs (256px,
  // resized Nov 20 by the companion work) are deliberately untouched.
  for (const persona of PERSONAS) {
    for (const variant of VARIANTS) {
      const jpgPath = join(charactersDir, persona, `${variant}.jpg`);
      assert.ok(existsSync(jpgPath), `missing: ${persona}/${variant}.jpg`);
      assert.ok(!existsSync(join(charactersDir, persona, `${variant}.png`)), `stale PNG left: ${persona}/${variant}.png`);
      const bytes = readFileSync(jpgPath);
      assert.ok(bytes.subarray(0, 3).equals(JPEG_MAGIC), `${persona}/${variant}.jpg is not a JPEG`);
      assert.ok(bytes.length <= 300 * 1024, `${persona}/${variant}.jpg is ${bytes.length} bytes, over the 300 KB cap`);
      assert.ok(jpegWidth(bytes) <= 768, `${persona}/${variant}.jpg is wider than 768px`);
    }
    const avatarPath = join(charactersDir, persona, 'avatar.png');
    assert.ok(existsSync(avatarPath), `missing avatar: ${persona}`);
    const avatarBytes = readFileSync(avatarPath);
    assert.ok(avatarBytes.subarray(0, 4).equals(PNG_MAGIC), `${persona}/avatar.png is not a PNG`);
    assert.ok(avatarBytes.length <= 200 * 1024, `${persona}/avatar.png is over 200 KB`);
  }
  // The whole characters directory should be a few MB, not ~50.
  const total = readdirSync(charactersDir, { recursive: true })
    .map((f) => join(charactersDir, String(f)))
    .filter((f) => statSync(f).isFile() && !f.endsWith('.gitkeep'))
    .reduce((sum, f) => sum + statSync(f).size, 0);
  assert.ok(total <= 5 * 1024 * 1024, `characters/ totals ${total} bytes, over the 5 MB cap`);
});
