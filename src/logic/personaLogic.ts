import { PersonaId } from '../constants';

/**
 * Assigns a persona based on quiz answers.
 * For the prototype, we use a simple mapping.
 */
export function assignPersona(answers: Record<number, string>): PersonaId {
  const counts: Record<PersonaId, number> = {
    'house-goblin': 0,
    'social-menace': 0,
    'soft-criminal': 0,
    'static-breaker': 0,
    'wild-card': 0
  };

  Object.values(answers).forEach(personaId => {
    counts[personaId as PersonaId]++;
  });

  // Return the one with the highest count, or a default
  return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as PersonaId;
}
