/**
 * Regenerates the 98 card rows for the "Fieldtrip Decks — All Cards"
 * Google Sheet (Sheet1) from the banks — the single source of truth.
 *
 * Row order and the Deck name / Deck code columns (A–B) come from the
 * sheet itself (passed in as JSON), so a regenerate never reorders rows
 * or renames a deck. Everything else is rebuilt from the card data,
 * which is what picks up hardening fills (proofRequirements, short
 * prompts, missions, tags) and later edits like texas-07's audio proof.
 *
 * Usage:
 *   npx tsx scripts/regenerate-deck-sheet-rows.ts /tmp/sheet-abc.json
 * Writes /tmp/sheet-rows.json: { header, rows }.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ALL_CHALLENGE_CARDS } from '../src/data/allChallengeBanks';
import { PLAIN_CARD_COPY } from '../src/data/plainCardCopy';

const HEADER = [
  'Deck name',
  'Deck code',
  'Card ID',
  'Title',
  'Short prompt',
  'Description',
  'Mission text',
  'Difficulty',
  'Points (baseXP)',
  'Proof type',
  'Required subjects (verification)',
  'Min confidence',
  'Require location',
  'Require timestamp',
  'Tags',
  'Lane',
  'Status',
  'Plain title (Frankie Mode)',
  'Plain description (Frankie Mode)',
  'Plain voice-note prompt (Frankie Mode)',
];

const abc: string[][] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const byId = new Map(ALL_CHALLENGE_CARDS.map((card) => [String(card.id), card]));

const yesNo = (value: unknown) => (value === true ? 'Yes' : '');
const joinList = (value: unknown) =>
  Array.isArray(value) ? value.map(String).join(', ') : '';

const rows = abc.map(([deckName, deckCode, cardId]) => {
  const card = byId.get(cardId);
  if (!card) throw new Error(`card not found in banks: ${cardId}`);
  const plain = PLAIN_CARD_COPY[cardId];
  const proof = (card as any).proofRequirements || {};
  return [
    deckName,
    deckCode,
    String(card.id),
    String((card as any).title || ''),
    String((card as any).shortPrompt || ''),
    String((card as any).description || ''),
    String((card as any).mission || ''),
    String((card as any).difficulty || ''),
    String(Number((card as any).baseXP ?? (card as any).basePoints ?? '')),
    joinList((card as any).proofType),
    joinList(proof.requiredSubjects),
    proof.minConfidence === undefined || proof.minConfidence === null
      ? ''
      : String(proof.minConfidence),
    yesNo(proof.requireLocation),
    yesNo(proof.requireTimestamp),
    joinList((card as any).tags),
    String((card as any).lane || ''),
    String((card as any).status || ''),
    plain?.plainTitle || '',
    plain?.plainDescription || '',
    plain?.plainVoiceNotePrompt || '',
  ];
});

writeFileSync('/tmp/sheet-rows.json', JSON.stringify({ header: HEADER, rows }, null, 2));
console.log(`wrote ${rows.length} rows, ${HEADER.length} columns`);
const changed = rows.filter((row) => row[2] === 'texas-07');
console.log('texas-07:', JSON.stringify(changed[0]));
