import { STARTER_MISSION_BANK } from './starterMissionBank';
import { HEATWAVE_CHALLENGE_BANK } from './heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from './socalSummerChallengeBank';
import { JET_SETTER_CHALLENGE_BANK } from './jetSetterChallengeBank';
import { ERRAND_DECK_CHALLENGE_BANK } from './errandDeckChallengeBank';
import { TEXAS_CHALLENGE_BANK } from './texasChallengeBank';
import type { ChallengeCard } from '../types/challenges';

/**
 * Single source of truth for every playable card.
 *
 * A new deck registers here and ONLY here: add its bank to this list.
 * The draw pool (MOCK_TRIPS), the mission resolver, the admin deck tools,
 * and the Frankie coverage test all read from ALL_CHALLENGE_CARDS, so a
 * deck can no longer be half-wired — visible in one place, missing in
 * another. Per-deck files (deckPacks.ts, deck tests) still import their
 * own bank directly when they need per-deck behavior.
 */
export const ALL_CHALLENGE_BANKS: Partial<ChallengeCard>[][] = [
  STARTER_MISSION_BANK,
  HEATWAVE_CHALLENGE_BANK,
  SOCAL_SUMMER_CHALLENGE_BANK,
  JET_SETTER_CHALLENGE_BANK,
  ERRAND_DECK_CHALLENGE_BANK,
  TEXAS_CHALLENGE_BANK,
];

export const ALL_CHALLENGE_CARDS: Partial<ChallengeCard>[] =
  ALL_CHALLENGE_BANKS.flat();
