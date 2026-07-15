import assert from 'node:assert/strict';
import test from 'node:test';
import { getStickerById } from '../data/stickers';
import {
  getStickerArchetypeForFieldType,
  runStickerAwardNonBlocking,
  STICKER_EVENT_AWARD_IDS,
} from '../services/stickerService';

const EXPECTED_TRIGGERS = {
  firstSubmission: 'first_submission',
  firstApproval: 'first_approval',
  fieldNoteAdded: 'field_note_added',
  photoProofAdded: 'photo_proof_added',
  weeklyVoteCast: 'weekly_vote_cast',
  crewCreated: 'crew_created',
  crewJoined: 'crew_joined',
  zinePageAdded: 'zine_page_added',
} as const;

test('every app event binding resolves to a registry sticker with the matching trigger', () => {
  for (const [eventName, trigger] of Object.entries(EXPECTED_TRIGGERS)) {
    const stickerId = STICKER_EVENT_AWARD_IDS[eventName as keyof typeof STICKER_EVENT_AWARD_IDS];
    const sticker = getStickerById(stickerId);
    assert.ok(sticker, `${eventName} references a missing sticker`);
    assert.equal(sticker.awardTrigger, trigger, `${eventName} uses the wrong trigger`);
  }
  assert.equal(getStickerById(STICKER_EVENT_AWARD_IDS.firstSubmission)?.rarity, 'common');
});

test('Field Type results map to all six sticker starter-pack archetypes', () => {
  assert.equal(getStickerArchetypeForFieldType('captainClipboard'), 'captainClipboard');
  assert.equal(getStickerArchetypeForFieldType('mallRat'), 'mallRat');
  assert.equal(getStickerArchetypeForFieldType('mascota'), 'mascota');
  assert.equal(getStickerArchetypeForFieldType('elondra'), 'elondra');
  assert.equal(getStickerArchetypeForFieldType('theGobbler'), 'lostCamper');
  assert.equal(getStickerArchetypeForFieldType('bigfoot'), 'bigfoot');
  assert.equal(getStickerArchetypeForFieldType('unclassified'), null);
});

test('legacy Field Type aliases normalize without creating a second sticker archetype', () => {
  assert.equal(getStickerArchetypeForFieldType('Captain Clipboard'), 'captainClipboard');
  assert.equal(getStickerArchetypeForFieldType('the-mascot'), 'mascota');
  assert.equal(getStickerArchetypeForFieldType('homecomingQueen'), 'elondra');
  assert.equal(getStickerArchetypeForFieldType('evidenceGoblin'), 'lostCamper');
  assert.equal(getStickerArchetypeForFieldType('lost_camper'), 'lostCamper');
});

test('non-blocking award runner contains rejected award operations', async () => {
  const originalConsoleError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  try {
    assert.doesNotThrow(() => {
      runStickerAwardNonBlocking('test_event', async () => {
        throw new Error('simulated sticker failure');
      });
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.ok(logged.some(args => String(args[0]).includes('test_event')));
  } finally {
    console.error = originalConsoleError;
  }
});
