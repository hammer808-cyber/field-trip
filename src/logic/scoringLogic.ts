import { Entry } from '../constants';
import { MOCK_USERS, MOCK_CREWS } from '../data/mockUsers';

export function calculateLeaderboard() {
  const userRankings = [...MOCK_USERS].sort((a, b) => b.points - a.points);
  const crewRankings = [...MOCK_CREWS].sort((a, b) => b.score - a.score);

  return { userRankings, crewRankings };
}

export function calculatePoints(basePoints: number, bonus: number = 0) {
  return basePoints + bonus;
}
