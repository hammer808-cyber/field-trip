import { GameState, isViewfinderLocked, canAccessCrewMode, canAccessSnitchMode, CONFIG } from '../logic/progression';
import { PersonaId } from '../constants';

const mockState = (overrides: Partial<GameState> = {}): GameState => ({
  userId: 'test-user',
  email: 'test@example.com',
  points: 0,
  soloCount: 0,
  onboardingComplete: true,
  persona: 'wild-card' as PersonaId,
  isAdmin: false,
  currentDate: new Date('2026-05-10T00:00:00Z'),
  ...overrides
});

console.log("RUNNING_SYSTEM_CALIBRATION_TESTS...");

// 1. Viewfinder Lock Tests
const lockedState = mockState({ currentDate: new Date('2026-05-20T00:00:00Z') });
console.assert(isViewfinderLocked(lockedState) === true, "FAILURE: Viewfinder should be locked before May 25");

const unlockedState = mockState({ currentDate: new Date('2026-05-26T00:00:00Z') });
console.assert(isViewfinderLocked(unlockedState) === false, "FAILURE: Viewfinder should be open after May 25");

const adminState = mockState({ isAdmin: true, currentDate: new Date('2026-05-10T00:00:00Z') });
console.assert(isViewfinderLocked(adminState) === false, "FAILURE: Admin should bypass pre-season lock");

// 2. Crew Mode Progress Tests
const recruitState = mockState({ soloCount: 1 });
console.assert(canAccessCrewMode(recruitState) === false, "FAILURE: Crew mode should require 3 solo missions");

const veteranState = mockState({ soloCount: 3 });
console.assert(canAccessCrewMode(veteranState) === true, "FAILURE: Crew mode should unlock after 3 solo missions");

// 3. Snitch Mode Tests
const lowPointsState = mockState({ points: 100 });
console.assert(canAccessSnitchMode(lowPointsState) === false, "FAILURE: Snitch mode should require 250 points");

const highPointsState = mockState({ points: CONFIG.SNITCH_MODE_POINTS_REQUIRED });
console.assert(canAccessSnitchMode(highPointsState) === true, "FAILURE: Snitch mode should unlock at thresholds");

console.log("SYSTEM_CALIBRATION_COMPLETE. ALL_TESTS_PASSED.");
