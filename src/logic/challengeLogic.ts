import { Challenge } from '../constants';
import { MOCK_CHALLENGES } from '../data/mockChallenges';

export function drawChallenge(pool: Challenge[] = MOCK_CHALLENGES): Challenge {
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function applyPersonaModifier(challenge: Challenge, personaId: string | null) {
  let bonus = 0;
  let text = '';

  switch (personaId) {
    case 'social-menace':
      bonus = 20;
      text = '+20 Witness Bonus active';
      break;
    case 'static-breaker':
      bonus = 15;
      text = '+15 Pattern Break active';
      break;
    case 'wild-card':
      const chance = Math.random();
      if (chance > 0.7) {
        bonus = 50;
        text = '!! Chaos Boost: +50 !!';
      }
      break;
  }

  return { bonus, text };
}
