import { ALL_CHALLENGE_CARDS } from '../src/data/allChallengeBanks';
import { PLAIN_CARD_COPY } from '../src/data/plainCardCopy';

const OLD_DECKS = ['starter-signals', 'socal-summer', 'heatwave-receipts', 'jet-setter', 'errand-deck'];
const SCALE: Record<string, number> = { easy: 100, medium: 125, hard: 150 };
const cards = ALL_CHALLENGE_CARDS.filter((c: any) => OLD_DECKS.includes(c.deckId));

type Flag = { id: string; deck: string; title: string; difficulty: string; baseXP: number; flags: string[]; subjects: number; descLen: number; mission: string; description: string; shortPrompt: string; proofType: string[] };
const out: Flag[] = [];
for (const c of cards as any[]) {
  const flags: string[] = [];
  const expected = SCALE[String(c.difficulty)];
  if (expected !== undefined && Number(c.baseXP) !== expected) flags.push(`POINTS: ${c.difficulty} should be ${expected}, is ${c.baseXP}`);
  const subjects = (c.proofRequirements?.requiredSubjects || []).length;
  if (c.difficulty === 'easy' && subjects >= 4) flags.push(`ASK-HEAVY: easy card requires ${subjects} subjects`);
  if (c.difficulty === 'hard' && subjects <= 1) flags.push(`ASK-LIGHT: hard card requires only ${subjects} subject(s)`);
  if (!c.mission || String(c.mission).trim().length < 10) flags.push('NO-MISSION');
  if (!c.shortPrompt) flags.push('NO-SHORT-PROMPT');
  if (!c.description || String(c.description).trim().length < 20) flags.push('THIN-DESCRIPTION');
  if (String(c.description || '').length > 220) flags.push(`LONG-DESCRIPTION (${String(c.description).length} chars)`);
  if (String(c.description || '').split(/[.!?]/).filter(Boolean).length > 3) flags.push('MULTI-SENTENCE-DESCRIPTION');
  const plain = PLAIN_CARD_COPY[String(c.id)];
  if (!plain) flags.push('NO-PLAIN-COPY');
  out.push({ id: String(c.id), deck: String(c.deckId), title: String(c.title), difficulty: String(c.difficulty), baseXP: Number(c.baseXP), flags, subjects, descLen: String(c.description || '').length, mission: String(c.mission || ''), description: String(c.description || ''), shortPrompt: String(c.shortPrompt || ''), proofType: c.proofType || [] });
}
const flagged = out.filter((o) => o.flags.length > 0);
console.log(`old cards: ${out.length}, flagged: ${flagged.length}`);
const byDeck: Record<string, number> = {};
const byFlag: Record<string, number> = {};
for (const o of flagged) { byDeck[o.deck] = (byDeck[o.deck] || 0) + 1; for (const f of o.flags) { const k = f.split(':')[0]; byFlag[k] = (byFlag[k] || 0) + 1; } }
console.log('flagged by deck:', JSON.stringify(byDeck));
console.log('flag counts:', JSON.stringify(byFlag));
// difficulty x points matrix
const matrix: Record<string, Record<number, number>> = {};
for (const o of out) { const d = o.difficulty; matrix[d] = matrix[d] || {}; matrix[d][o.baseXP] = (matrix[d][o.baseXP] || 0) + 1; }
console.log('difficulty x points:', JSON.stringify(matrix));
// subjects distribution by difficulty
const subj: Record<string, number[]> = {};
for (const o of out) { (subj[o.difficulty] = subj[o.difficulty] || []).push(o.subjects); }
for (const d of Object.keys(subj)) { const a = subj[d].sort((x, y) => x - y); console.log(`subjects ${d}: n=${a.length} min=${a[0]} median=${a[Math.floor(a.length / 2)]} max=${a[a.length - 1]}`); }
import { writeFileSync } from 'node:fs';
writeFileSync('/tmp/old-deck-audit.json', JSON.stringify(out, null, 2));
console.log('wrote /tmp/old-deck-audit.json');
