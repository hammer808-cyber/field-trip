/**
 * Print card — P3-9 (Nov 21, 2026, premium layer).
 * MissionResultCard carried a disabled "Print card (coming soon)"
 * button. Now the button opens the system print dialog, and a
 * print-only keepsake card (photo, mission, date, persona, XP,
 * sticker earned) is the only thing @media print shows.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const cardSrc = fs.readFileSync('src/components/MissionResultCard.tsx', 'utf8');
const cssSrc = fs.readFileSync('src/index.css', 'utf8');

test('print card: the button is enabled and opens the print dialog', () => {
  assert.ok(cardSrc.includes('onClick={() => window.print()}'), 'button does not call window.print()');
  assert.ok(!cardSrc.includes('Print card (coming soon)'), '"coming soon" label is still there');
  assert.ok(!cardSrc.includes("Printing isn't available yet."), '"isn\'t available yet" copy is still there');
  assert.ok(cardSrc.includes('Prints just this card.'), 'button helper copy is missing');
});

test('print card: a print-only keepsake exists with the proof, title, persona, XP and sticker', () => {
  assert.ok(cardSrc.includes('print-keepsake'), 'no .print-keepsake block');
  assert.ok(cardSrc.includes('hidden print:block'), 'keepsake is not hidden on screen / shown in print');
  assert.ok(cardSrc.includes('alt="Mission proof"'), 'keepsake has no proof photo');
  assert.ok(cardSrc.includes('getFrankieTitle(trip, fPref)'), 'keepsake has no mission title');
  assert.ok(cardSrc.includes('profile?.fieldTypeName'), 'keepsake has no persona name');
  assert.ok(cardSrc.includes('+{totalXP} XP'), 'keepsake has no XP total');
  assert.ok(cardSrc.includes('Sticker earned:'), 'keepsake has no sticker line');
  assert.ok(cardSrc.includes('toLocaleDateString()'), 'keepsake has no date');
});

test('print card: @media print shows only the keepsake and hides the rest', () => {
  assert.ok(cssSrc.includes('@media print'), 'no @media print block in index.css');
  const printBlock = cssSrc.slice(cssSrc.indexOf('@media print'));
  assert.ok(printBlock.includes('.print-keepsake'), 'print CSS does not mention .print-keepsake');
  assert.ok(printBlock.includes('visibility: hidden'), 'print CSS does not hide the rest of the page');
  assert.ok(printBlock.includes('visibility: visible'), 'print CSS does not re-show the keepsake');
  assert.ok(printBlock.includes('background: white'), 'print CSS does not force a white page');
});
