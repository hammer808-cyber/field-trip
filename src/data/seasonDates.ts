/**
 * Season date windows — pure, no Firebase.
 *
 * These four dates used to live in `src/constants.ts`, which also builds
 * season objects with the client Firestore `Timestamp` — so any module
 * importing the dates dragged the client SDK along. The server-side
 * evaluator (`src/server/stickerEvaluate.ts`) imports the deck catalog,
 * which needs these dates, so they live here now. `constants.ts`
 * re-exports them, so existing importers do not churn.
 */

export const HEATWAVE_SEASON_START_DATE = '2026-06-06T00:00:00Z'; // Launch date
export const HEATWAVE_SEASON_END_DATE = '2026-09-06T23:59:59Z';

export const HOLIDAY_SEASON_START_DATE = '2026-11-01T00:00:00Z'; // Gobble & Glow opens
export const HOLIDAY_SEASON_END_DATE = '2027-01-11T23:59:59Z';
