/**
 * Season date windows — pure, no Firebase.
 *
 * These four dates used to live in `src/constants.ts`, which also builds
 * season objects with the client Firestore `Timestamp` — so any module
 * importing the dates dragged the client SDK along. The server-side
 * evaluator (`src/server/stickerEvaluate.ts`) imports the deck catalog,
 * which needs these dates, so they live here now. `constants.ts`
 * re-exports them, so existing importers do not churn.
 *
 * Reconciled Nov 21, 2026 against the seasonal calendar
 * (`src/data/seasons.ts`), the single authority: Heatwave is meteorological
 * summer (Jun 1–Aug 31, recurring yearly), Gobble & Glow is an EVENT
 * (Nov 1, 2026–Jan 11, 2027, PT) — not a season. Deck gating reads the
 * calendar, not these strings; they survive for the Firestore season
 * objects in `constants.ts` and for legacy instant readers.
 *
 * Instants are PT-faithful: starts are noon UTC (morning PT on the opening
 * day — a UTC-midnight string would be the previous evening PT), ends are
 * the last second of the closing PT day.
 */

export const HEATWAVE_SEASON_START_DATE = '2026-06-01T12:00:00Z'; // Jun 1 PT (was Jun 6 launch)
export const HEATWAVE_SEASON_END_DATE = '2026-09-01T06:59:59Z'; // end of Aug 31 PT (PDT, UTC-7; was Sep 6)

export const HOLIDAY_SEASON_START_DATE = '2026-11-01T12:00:00Z'; // Nov 1 PT — not Oct 31 evening PT
export const HOLIDAY_SEASON_END_DATE = '2027-01-12T07:59:59Z'; // end of Jan 11 PT (PST, UTC-8)
