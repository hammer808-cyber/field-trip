import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';
import { getAllStickers, getStickerById } from '../data/stickers';

function md5(filePath: string): string {
  return createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertPng(filePath: string): void {
  assert.ok(fs.existsSync(filePath), `sticker image missing: ${filePath}`);
  const bytes = fs.readFileSync(filePath);
  assert.ok(bytes.length > 20000, `${filePath} is suspiciously small (${bytes.length} bytes)`);
  assert.ok(
    bytes.subarray(0, 8).equals(PNG_SIGNATURE),
    `${filePath} does not start with PNG signature bytes`
  );
  // IHDR bit depth lives at byte 24, color type at byte 25: 6 = truecolor
  // with alpha (RGBA). (Byte 26 is the compression method, always 0.)
  assert.equal(bytes[25], 6, `${filePath} must be RGBA (color type 6), got ${bytes[25]}`);
}

// Decode the four corner pixels' alpha values from a small RGBA PNG.
// No image library in the test env — inflate the IDAT stream with
// node:zlib and unfilter the scanlines (PNG spec filters 0–4, bpp 4).
// Returns [topLeft, topRight, bottomLeft, bottomRight] alphas.
function cornerAlphas(filePath: string): [number, number, number, number] {
  const bytes = fs.readFileSync(filePath);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.equal(bytes[24], 8, `${filePath} must be 8-bit`);
  assert.equal(bytes[25], 6, `${filePath} must be RGBA (color type 6)`);
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'IDAT') idat.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const unfiltered = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const row = unfiltered.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? row[x - 4] : 0;
      const up = y > 0 ? unfiltered[(y - 1) * stride + x] : 0;
      const upLeft = x >= 4 && y > 0 ? unfiltered[(y - 1) * stride + x - 4] : 0;
      const value = raw[src++];
      if (filter === 0) row[x] = value;
      else if (filter === 1) row[x] = (value + left) & 0xff;
      else if (filter === 2) row[x] = (value + up) & 0xff;
      else if (filter === 3) row[x] = (value + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        row[x] = (value + predictor) & 0xff;
      } else {
        throw new Error(`unsupported PNG filter ${filter} in ${filePath}`);
      }
    }
  }
  const alphaAt = (x: number, y: number): number =>
    unfiltered[y * stride + x * 4 + 3];
  return [alphaAt(0, 0), alphaAt(width - 1, 0), alphaAt(0, height - 1), alphaAt(width - 1, height - 1)];
}

/**
 * CHAOS PACK (Nov 19, 2026; Zach's call: ADD all ten as new, 04 + 06
 * rare). The ZIP (FIELDTRIP_Chaos_Stickers_10_Transparent_PNG_70_g0xa.zip)
 * held 10 PNGs in the same neon pop-art family as On a Roll — bold black
 * outlines, white die-cut border, faces on inanimate objects, lightning
 * shades, tongue out. All 10 are entirely new scenes — none is a re-render
 * of On a Roll, no byte-identical matches to anything on disk, no name
 * duplicates. Chaos goes from 1 lonely sticker to a real shelf of 11.
 * All 10 are trigger-pending (admin_grant); no existing event fits a
 * runaway cart, a vending machine, or a crayon campfire. Zach's call on
 * what earns each one.
 *
 * Files arrived 1254x1254, 1.5–2.3 MB each (~19.6 MB total) and were
 * shrunk with PIL LANCZOS to 400x400 RGBA before import (Elondra
 * precedent), total ~2.7 MB. The md5s below pin the POST-SHRINK files;
 * the pre-shrink ZIP md5s are recorded in the commit message.
 *
 * 01 + 10 ship AS-IS with their own art slightly clipped at the top edge
 * (~30–35 px of the white die-cut border interrupted — 01's popcorn puff,
 * 10's alarm-ray tip). A clean crop would cut the art, so no crop without
 * Zach's call. 04's top-left corner alpha is 1 (one pixel) — negligible,
 * pinned in its corner-alpha row below.
 */
const CHAOS_PACK: ReadonlyArray<{
  id: string;
  name: string;
  file: string;
  collection: 'chaos';
  displayOrder: number;
  rarity: 'common' | 'rare';
  md5: string;
  width: number;
  height: number;
  corners: [number, number, number, number];
}> = [
  { id: 'chaos_runaway_cart', name: 'Runaway Cart', file: 'chaos_01_runaway_cart.png', collection: 'chaos', displayOrder: 2, rarity: 'common', md5: '76c48f629a648accf21ce9f058daa142', width: 400, height: 400, corners: [0, 0, 0, 0] },
  { id: 'chaos_roller_skate', name: 'Roller Skate', file: 'chaos_02_roller_skate.png', collection: 'chaos', displayOrder: 3, rarity: 'common', md5: '8daa688cec0797eb142ae95bc11071d3', width: 400, height: 400, corners: [0, 0, 0, 0] },
  { id: 'chaos_backpack_heist', name: 'Backpack Heist', file: 'chaos_03_backpack_heist.png', collection: 'chaos', displayOrder: 4, rarity: 'common', md5: '58f38c9586cf0f483589d772e5e12495', width: 400, height: 400, corners: [0, 0, 0, 0] },
  { id: 'chaos_vending_machine', name: 'Vending Machine', file: 'chaos_04_vending_machine.png', collection: 'chaos', displayOrder: 5, rarity: 'rare', md5: '1b322ca3a3eefb6b7b286fbdeae81817', width: 400, height: 400, corners: [1, 0, 0, 0] },
  { id: 'chaos_melting_cone', name: 'Melting Cone', file: 'chaos_05_melting_cone.png', collection: 'chaos', displayOrder: 6, rarity: 'common', md5: '723fcee6f0cc2a15b26fc7fd50610678', width: 400, height: 400, corners: [0, 0, 0, 0] },
  { id: 'chaos_disco_explosion', name: 'Disco Explosion', file: 'chaos_06_disco_explosion.png', collection: 'chaos', displayOrder: 7, rarity: 'rare', md5: '2504c7ccb0581957a241b12c36ce4e61', width: 400, height: 400, corners: [0, 0, 0, 0] },
  { id: 'chaos_crayon_campfire', name: 'Crayon Campfire', file: 'chaos_07_crayon_campfire.png', collection: 'chaos', displayOrder: 8, rarity: 'common', md5: 'be6189c933d019f821eceda539fffa2b', width: 400, height: 400, corners: [0, 0, 0, 0] },
  { id: 'chaos_punk_moon', name: 'Punk Moon', file: 'chaos_08_punk_moon.png', collection: 'chaos', displayOrder: 9, rarity: 'common', md5: 'f62ae32456a11cd2ee0458d3e5bea2cd', width: 400, height: 400, corners: [0, 0, 0, 0] },
  { id: 'chaos_confused_signpost', name: 'Confused Signpost', file: 'chaos_09_confused_signpost.png', collection: 'chaos', displayOrder: 10, rarity: 'common', md5: 'b36af7efb5613a9bee5aac9fbfbb5f94', width: 400, height: 400, corners: [0, 0, 0, 0] },
  { id: 'chaos_cosmic_payphone', name: 'Cosmic Payphone', file: 'chaos_10_cosmic_payphone.png', collection: 'chaos', displayOrder: 11, rarity: 'common', md5: '1812d934606d5a970e93904ebbecfc3e', width: 400, height: 400, corners: [0, 0, 0, 0] }
];

test('chaos pack: all ten are registered as new Chaos stickers with the right collection, order, rarity and trigger', () => {
  const all = getAllStickers();
  assert.equal(all.length, 108, '105 before the Nov 20 challenge-approved variants + 3 new variant entries');

  const chaos = all.filter(sticker => sticker.collection === 'chaos');
  assert.equal(chaos.length, 11, 'On a Roll + 10 new chaos pack entries');

  for (const expected of CHAOS_PACK) {
    const sticker = getStickerById(expected.id);
    assert.ok(sticker, `${expected.id} is not registered`);
    assert.equal(sticker.name, expected.name);
    assert.equal(sticker.archetype, undefined, `${expected.id} is cross-pack (no archetype)`);
    assert.equal(sticker.collection, expected.collection);
    assert.equal(sticker.displayOrder, expected.displayOrder);
    assert.equal(sticker.rarity, expected.rarity);
    assert.equal(sticker.imageUrl, `/assets/stickers/chaos/${expected.file}`);
    assert.equal(sticker.awardTrigger, 'admin_grant');
    assert.ok(sticker.tags.includes('trigger-pending'), `${expected.id} must be tagged trigger-pending`);
    assert.ok(sticker.unlockReason.length > 0);
  }
});

test('chaos pack: the ten images are the shrunk PNGs (400x400 RGBA, transparent corners)', () => {
  for (const expected of CHAOS_PACK) {
    const filePath = path.join('public', 'assets', 'stickers', 'chaos', expected.file);
    assertPng(filePath);
    const bytes = fs.readFileSync(filePath);
    // Shrink class: 400x400 RGBA lands ~217–309 KB (Elondra precedent).
    assert.ok(bytes.length > 100000, `${expected.file} is suspiciously small (${bytes.length} bytes)`);
    assert.ok(bytes.length < 350000, `${expected.file} is suspiciously large (${bytes.length} bytes)`);
    // IHDR width/height are big-endian uint32 at bytes 16-19 / 20-23.
    assert.equal(bytes.readUInt32BE(16), expected.width, `${expected.file} width`);
    assert.equal(bytes.readUInt32BE(20), expected.height, `${expected.file} height`);
    assert.equal(md5(filePath), expected.md5, `${expected.file} md5`);
    assert.deepEqual(
      cornerAlphas(filePath),
      expected.corners,
      `${expected.file} corner alphas [topLeft, topRight, bottomLeft, bottomRight]`
    );
  }
});

test('chaos pack: firestore.rules whitelists the ten new ids', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  for (const expected of CHAOS_PACK) {
    assert.ok(rules.includes(`'${expected.id}'`), `rules must whitelist ${expected.id}`);
  }
});

test('chaos pack: On a Roll is untouched (Zach\'s call: add all ten as new)', () => {
  const sticker = getStickerById('chaos_on_a_roll');
  assert.ok(sticker, 'chaos_on_a_roll must still be registered');
  assert.equal(sticker.name, 'On a Roll');
  assert.equal(sticker.collection, 'chaos');
  assert.equal(sticker.displayOrder, 1);
  assert.equal(sticker.rarity, 'common', 'On a Roll rarity stays defaulted common — its own call, not this change');
  assert.equal(sticker.awardTrigger, 'admin_grant');
  assert.equal(sticker.imageUrl, '/assets/stickers/chaos/on_a_roll.png');
  assert.equal(
    md5(path.join('public', 'assets', 'stickers', 'chaos', 'on_a_roll.png')),
    '23c77e270e987d1a553f66a13c010eb8',
    'on_a_roll.png art must be unchanged'
  );
});
