import { FieldCheck, FieldCheckReason, FieldCheckStatus } from '../types/game';
import { TripCard as Challenge, TripCard } from '../types/challenges';
import { Timestamp } from 'firebase/firestore';

export type { Challenge };

export function drawChallenge(pool: TripCard[], filter?: (c: TripCard) => boolean): TripCard | null {
  const available = filter ? pool.filter(filter) : pool;
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function validateSubmissionRules(entry: { proofImage: string; fieldNote: string }, challenge: TripCard) {
  const errors: string[] = [];
  
  if (challenge.requiredProof.includes('photo') && !entry.proofImage) {
    errors.push('Required photo proof is missing.');
  }
  
  if (entry.fieldNote.length < 10) {
    errors.push('Field note is too short. Bureau requires detailed documentation.');
  }

  // Safety checks (simulated / logic based)
  if (entry.fieldNote.toLowerCase().includes('unsafe') || entry.fieldNote.toLowerCase().includes('illegal')) {
    errors.push('Safety violation detected in field note.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function requestFieldCheck(
  reporterId: string,
  targetId: string,
  targetUserId: string,
  reason: FieldCheckReason,
  details: string
): Omit<FieldCheck, 'id'> {
  return {
    reporterId,
    targetId,
    targetUserId,
    reason,
    details,
    status: 'open',
    createdAt: Timestamp.now()
  };
}

export function resolveFieldCheck(check: FieldCheck, resolution: FieldCheckStatus, adminNotes: string): FieldCheck {
  return {
    ...check,
    status: resolution,
    adminResolution: adminNotes,
    resolvedAt: Timestamp.now()
  };
}

export function applySabotageCard(targetUserId: string, cardId: string, weekNumber: number) {
  // Logic to register sabotage in database
  console.log(`Sabotage ${cardId} applied to ${targetUserId} for week ${weekNumber}`);
}

export function blockSabotageWithShield(userId: string) {
  // Logic to consume a shield
  console.log(`Shield consumed for user ${userId}`);
  return true;
}

export function applyFieldTypeModifier(challenge: TripCard, fieldTypeId: string | null, effectsEnabled: boolean = true, isCrewEntry: boolean = false) {
  if (!effectsEnabled || !fieldTypeId) return { bonus: 0, penalty: 0, text: '' };

  let bonus = 0;
  let penalty = 0;
  let text = '';

  switch (fieldTypeId) {
    case 'house-goblin':
      penalty = 5;
      text = 'Threshold Tax: -5 unless detour authenticated.';
      break;
    case 'social-menace':
      bonus = 20;
      text = 'Witness Bonus: +20 for social proof.';
      if (!isCrewEntry) {
        penalty = 10;
        text = 'Solo Sentence: -10 for un-witnessed mission.';
      }
      break;
    case 'soft-criminal':
      penalty = 5;
      text = 'Verification overhead: -5 for administrative processing.';
      break;
    case 'static-breaker':
      bonus = 15;
      text = 'Pattern Interrupt: +15 for category disruption.';
      break;
    case 'wild-card':
      const chance = Math.random();
      if (chance > 0.8) {
        bonus = 40;
        text = 'Wild Card: Random variance! +40';
      } else if (chance < 0.2) {
        penalty = 15;
        text = 'Wild Card: Chaos penalty! -15';
      }
      break;
  }

  return { bonus, penalty, text };
}
