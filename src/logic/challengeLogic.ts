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
  const requiredProof = challenge.proofType || challenge.requiredProof || [];
  
  if (requiredProof.includes('photo') && !entry.proofImage) {
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
  reporterUid: string,
  submissionId: string,
  missionId: string,
  reportedUserId: string,
  reason: FieldCheckReason,
  note: string
): Omit<FieldCheck, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    reporterUid,
    submissionId,
    missionId,
    reportedUserId,
    reason,
    note,
    status: 'pending'
  };
}

export function resolveFieldCheck(check: FieldCheck, resolution: FieldCheckStatus, adminNotes: string): FieldCheck {
  return {
    ...check,
    status: resolution,
    adminNote: adminNotes,
    updatedAt: Timestamp.now(),
    reviewedAt: Timestamp.now()
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

  // 1. Tag-Based Modifiers (Generalized)
  const preferences: Record<string, string[]> = {
    'captainClipboard': ['detailed', 'organized', 'rules', 'checklist', 'audit', 'review', 'list'],
    'mallRat': ['urban', 'social', 'culture', 'public', 'commercial', 'overheard'],
    'mascota': ['hype', 'event', 'social', 'bold', 'group', 'celebration'],
    'elondra': ['aesthetic', 'drama', 'fashion', 'glam', 'mood', 'visual'],
    'theGobbler': ['exploration', 'strange', 'detour', 'liminal', 'unexpected'],
    'bigfoot': ['observation', 'solo', 'nature', 'hidden', 'trail']
  };

  const userPrefs = preferences[fieldTypeId] || [];
  const matchedBoosts = challenge.boostTags?.filter(t => userPrefs.includes(t)) || [];
  const matchesTagFromChallenge = challenge.tags?.some(t => userPrefs.includes(t)) || false;

  // 2. Determine if Perk applies (+25 Bonus)
  // If it matches persona affinity, boost tags, or general tags
  if (challenge.personaAffinity?.includes(fieldTypeId as any) || matchedBoosts.length > 0 || matchesTagFromChallenge) {
    bonus = 25;
    text = `Field Type Bonus: +25 for ${fieldTypeId} compatibility.`;
  }

  // 3. Fallback/Special cases
  if (bonus === 0) {
    switch (fieldTypeId) {
      case 'captainClipboard':
        // Receipts Department: Bonus if many tags or specific context (simulated here)
        if ((challenge.boostTags?.length || 0) > 2) {
          bonus = 25;
          text = 'Receipts Department: +25 for detailed mission profile.';
        }
        break;
      case 'theGobbler':
        // Insatiable Index: (50% chance if not matched otherwise)
        if (Math.random() > 0.5) {
          bonus = 25;
          text = 'Insatiable Index: +25 for hoarded evidence!';
        }
        break;
      case 'bigfoot':
        if (!isCrewEntry && challenge.tags?.includes('nature')) {
          bonus = 25;
          text = 'Off-Trail Evidence: +25 for solo nature observation.';
        }
        break;
    }
  }

  // Ensure penalty is ALWAYS 0 for Blind Spots as per instructions
  penalty = 0;

  return { bonus, penalty: 0, text: text.trim() };
}
