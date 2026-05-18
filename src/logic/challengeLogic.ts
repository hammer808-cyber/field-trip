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

  // 1. Data-Driven Affinity Bonus
  if (challenge.personaAffinity?.includes(fieldTypeId as any)) {
    bonus += 20;
    text = `Archetype Affinity: +20 for ${fieldTypeId} compatibility. `;
  }

  // 2. Tag-Based Modifiers (Generalized)
  if (challenge.boostTags && challenge.boostTags.length > 0) {
    // This could be expanded to map field types to preferred tags
    // For now, let's look for archetype-specific preferences
    const preferences: Record<string, string[]> = {
      'captainClipboard': ['rules', 'checklist', 'organization', 'audit'],
      'mallRat': ['urban', 'social', 'indoor', 'commercial'],
      'mascota': ['bold', 'performance', 'aesthetic', 'dynamic'],
      'elondra': ['narrative', 'drama', 'detailed', 'aesthetic'],
      'lostCamper': ['exploration', 'mystery', 'strange', 'detour'],
      'bigfoot': ['observation', 'solo', 'nature', 'hidden']
    };

    const userPrefs = preferences[fieldTypeId] || [];
    const matchedBoosts = challenge.boostTags.filter(t => userPrefs.includes(t));
    if (matchedBoosts.length > 0) {
      bonus += matchedBoosts.length * 10;
      text += `Tag Boost: +${matchedBoosts.length * 10} for ${matchedBoosts.join(', ')}. `;
    }

    const matchedSlowdowns = challenge.slowDownTags?.filter(t => userPrefs.includes(t)) || [];
    if (matchedSlowdowns.length > 0) {
      penalty += matchedSlowdowns.length * 10;
      text += `Tag Friction: -${matchedSlowdowns.length * 10} for ${matchedSlowdowns.join(', ')}. `;
    }
  }

  // 3. Fallback Legacy Multipliers (if no data-driven bonus was applied)
  if (bonus === 0 && penalty === 0) {
    switch (fieldTypeId) {
      case 'captainClipboard':
        bonus = 10;
        text = 'Detail Bonus: +10 for certified documentation.';
        break;
      case 'mallRat':
        if (challenge.tags?.includes('urban')) {
          bonus = 15;
          text = 'Social Hub Bonus: +15 for urban operation.';
        } else {
          penalty = 5;
          text = 'Nature Tax: -5 for low-AC environment.';
        }
        break;
      case 'mascota':
        bonus = 20;
        text = 'Spirit Boost: +20 for high-energy documentation.';
        break;
      case 'elondra':
        if (challenge.tags?.includes('detailed') || challenge.tags?.includes('narrative')) {
          bonus = 25;
          text = 'Narrative Authority: +25 for sophisticated zine-ready notes.';
        } else {
          bonus = 10;
          text = 'Final Word Bonus: +10 for certified flair.';
        }
        break;
      case 'lostCamper':
        const chance = Math.random();
        if (chance > 0.5) {
          bonus = 25;
          text = 'Serendipity: +25 found a shortcut!';
        }
        break;
      case 'bigfoot':
        if (!isCrewEntry) {
          bonus = 15;
          text = 'Solitude Bonus: +15 for elusive observation.';
        } else {
          penalty = 10;
          text = 'Presence Penalty: -10 for forced social interaction.';
        }
        break;
    }
  }

  return { bonus, penalty, text: text.trim() };
}
