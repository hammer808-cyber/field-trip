import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSubmitConfirmation } from '../logic/submitConfirmation';
import { SubmissionCheer } from '../components/SubmissionCheer';
import { RewardIntensity } from '../types/feedback';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// --- Part 1: the combined submit confirmation ---------------------------

test('pending submit folds proof + note + review into one card', () => {
  const toast = buildSubmitConfirmation({
    missionTitle: 'The Park Oasis',
    hasFieldNote: true,
    hasVoiceNote: false,
    status: 'pending_review',
    totalPoints: 125,
  });
  assert.equal(toast.title, 'Proof In');
  assert.match(toast.description || '', /The Park Oasis/);
  assert.match(toast.description || '', /Photo and field note received/);
  assert.match(toast.description || '', /Trevor is reviewing/);
  assert.equal(toast.intensity, RewardIntensity.MICRO_FEEDBACK);
  assert.equal(toast.iconName, 'ClipboardCheck');
});

test('voice-note-only submit names the voice note, not a field note', () => {
  const toast = buildSubmitConfirmation({
    missionTitle: 'Two-Step Floor',
    hasFieldNote: false,
    hasVoiceNote: true,
    status: 'pending_review',
    totalPoints: 100,
  });
  assert.match(toast.description || '', /Photo and voice note received/);
  assert.doesNotMatch(toast.description || '', /field note received/);
});

test('Frankie submit with no note still reads honestly', () => {
  const toast = buildSubmitConfirmation({
    missionTitle: 'First Signals',
    hasFieldNote: false,
    hasVoiceNote: false,
    status: 'pending_review',
    totalPoints: 100,
  });
  assert.match(toast.description || '', /Photo received/);
});

test('approved submit names the mission and the banked points', () => {
  const toast = buildSubmitConfirmation({
    missionTitle: 'The Park Oasis',
    hasFieldNote: true,
    hasVoiceNote: false,
    status: 'approved',
    totalPoints: 150,
  });
  assert.equal(toast.title, 'Evidence Logged');
  assert.match(toast.description || '', /The Park Oasis/);
  assert.match(toast.description || '', /\+150 XP/);
});

test('addEntry queues one combined toast per submit, not four', () => {
  const app = read('src/context/AppContext.tsx');
  // The single queue site.
  assert.match(app, /queueReward\(buildSubmitConfirmation\(\{/);
  // The old separate status toasts are gone from the submit path.
  assert.doesNotMatch(app, /title: "Protocol Logged"/);
  assert.doesNotMatch(app, /title: "Evidence Logged"/);
  // The Field Pulse registrations still run (bookkeeping + 5-action
  // milestone) but their per-action toasts are silenced for submits.
  assert.match(app, /registerPulseAction\('submit_proof', entryId, \{ announce: false \}\)/);
  assert.match(app, /registerPulseAction\('add_field_note', entryId, \{ announce: false \}\)/);
  // Votes and sticker unlocks keep their toasts — only the two submit
  // actions pass announce: false.
  assert.match(app, /registerPulseAction\('vote',/);
  assert.doesNotMatch(app, /registerPulseAction\('vote',[^)]*announce: false/);
  // The optimistic local entry no longer fires its own "Field
  // Intelligence" toast; the combined card carries that line.
  assert.doesNotMatch(app, /showHelpToast\(/);
});

test('sticker awards still celebrate on their own path', () => {
  const app = read('src/context/AppContext.tsx');
  // The canonical-sticker celebration watcher is untouched by the combine.
  assert.match(app, /celebrateCanonicalSticker/);
  assert.match(app, /runStickerAwardNonBlocking\('proof_submit_bundle'/);
});

// --- Part 2: the persona confirmation card -------------------------------

test('cheer card shows the persona character, good-job line, and pending points', () => {
  const html = renderToStaticMarkup(
    <SubmissionCheer personaId="elondra" points={125} approved={false} hasEstimate={true} />,
  );
  assert.match(html, /\/assets\/characters\/elondra\/avatar\.png/);
  assert.match(html, /Elondra says/);
  assert.match(html, /Darling, beautifully done/);
  assert.match(html, /\+125 XP/);
  assert.match(html, /Once approved/);
  assert.doesNotMatch(html, /Points banked/);
});

test('approved cheer banks the points', () => {
  const html = renderToStaticMarkup(
    <SubmissionCheer personaId="mascota" points={200} approved={true} hasEstimate={true} />,
  );
  assert.match(html, /\/assets\/characters\/mascota\/avatar\.png/);
  assert.match(html, /\+200 XP/);
  assert.match(html, /Points banked/);
  assert.doesNotMatch(html, /Once approved/);
});

test('pending cheer with no estimate promises no number', () => {
  const html = renderToStaticMarkup(
    <SubmissionCheer personaId="bigfoot" points={0} approved={false} hasEstimate={false} />,
  );
  assert.doesNotMatch(html, /\+0 XP/);
  assert.match(html, /Points land once Trevor approves your proof/);
});

test('persona aliases resolve, and a missing persona falls back', () => {
  const aliased = renderToStaticMarkup(
    <SubmissionCheer personaId="theMascot" points={100} approved={false} hasEstimate={true} />,
  );
  assert.match(aliased, /\/assets\/characters\/mascota\/avatar\.png/);

  const fallback = renderToStaticMarkup(
    <SubmissionCheer personaId={null} points={100} approved={false} hasEstimate={true} />,
  );
  assert.match(fallback, /\/assets\/characters\/unclassified\/avatar\.png/);
  assert.match(fallback, /Nice work\. Your proof is in/);
});

test('cheer card has a dismiss action', () => {
  const html = renderToStaticMarkup(
    <SubmissionCheer personaId="elondra" points={125} approved={false} hasEstimate={true} />,
  );
  assert.match(html, /submission-cheer-dismiss/);
});

test('MissionResultCard renders the cheer on the success screen', () => {
  const card = read('src/components/MissionResultCard.tsx');
  assert.match(card, /<SubmissionCheer/);
  assert.match(card, /personaId=\{profile\?\.fieldType/);
  assert.match(card, /points=\{totalXP\}/);
  assert.match(card, /approved=\{isApproved\}/);
});
