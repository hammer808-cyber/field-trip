import { getVotingPhase, type VotingCycle, type VotingPhase } from '../services/votingCycleService';

/**
 * Firelight Tribunal clock helpers (Nov 24, 2026).
 *
 * The reference mockup shows three live tickers: a submission-window
 * countdown card, a council active-window countdown, and a phase
 * breakdown. All three count down to REAL weekly-cycle boundaries
 * (Monday 00:00 submission open, Friday 23:59 submission close,
 * Saturday 00:00-23:59 voting, Sunday awards). The mockup's
 * 3d23h59m42s / 03:41:58 / 02h 14m 58s figures are sample data and
 * are never hard-coded here.
 *
 * Pure functions, so tests can pin them against fixed dates.
 */

export function formatCountdownParts(remainingMs: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function formatPhaseCountdown(remainingMs: number): string {
  const { hours, minutes, seconds } = formatCountdownParts(remainingMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * The top countdown card: which window is live and when it ends.
 * Submission phase counts to the Friday 23:59 submission close,
 * voting phase counts to the Saturday 23:59 voting close, awards
 * phase counts to the next Monday 00:00 cycle reset.
 */
export function getTribunalClock(now: Date, cycle: VotingCycle): {
  phase: VotingPhase;
  deadline: Date;
  label: string;
} {
  const phase = getVotingPhase(now, cycle);
  if (phase === 'submission') {
    return { phase, deadline: cycle.submissionEnd, label: 'Time left in the submission window' };
  }
  if (phase === 'voting') {
    return { phase, deadline: cycle.votingEnd, label: 'Time left in the voting window' };
  }
  return {
    phase,
    deadline: new Date(cycle.weekEnd.getTime() + 1),
    label: 'Next cycle starts in',
  };
}

export type CouncilWindowState = 'before' | 'active' | 'after';

/**
 * The tribal council window: the Saturday voting window is when the
 * council sits. Before Saturday the flame has not lit yet; after
 * Saturday 23:59 it is extinguished and the rulings go out on Sunday.
 * The tribunal vote endpoint itself does not gate on the window (a
 * case stays votable while its status is open), so this is the weekly
 * moment the community votes, not a server lock.
 */
export function getCouncilWindow(now: Date, cycle: VotingCycle): {
  state: CouncilWindowState;
  deadline: Date | null;
  label: string;
} {
  const time = now.getTime();
  if (time < cycle.votingStart.getTime()) {
    return { state: 'before', deadline: cycle.votingStart, label: 'until the flame lights' };
  }
  if (time <= cycle.votingEnd.getTime()) {
    return { state: 'active', deadline: cycle.votingEnd, label: 'LEFT until flame extinguishes' };
  }
  return { state: 'after', deadline: null, label: 'Flame extinguished' };
}

export type TribunalPhaseSegment = {
  key: 'signals' | 'vote' | 'ruling';
  label: string;
  detail: string;
  widthPct: number;
  state: 'done' | 'active' | 'pending';
};

/**
 * The review-window breakdown, driven by the real weekly cycle:
 * Signals (Monday 00:00 to Saturday 00:00, flags come in and admins
 * review), Vote (Saturday, the community votes on open cases),
 * Ruling (Sunday, admins close cases and results publish). Segment
 * widths are the phases' real shares of the 7-day week, and the
 * current phase is the one the clock is inside.
 */
export function getTribunalPhaseBreakdown(now: Date, cycle: VotingCycle): {
  segments: TribunalPhaseSegment[];
  currentIndex: number;
  currentLabel: string;
  currentRemainingMs: number;
} {
  const phase = getVotingPhase(now, cycle);
  const starts = [cycle.submissionStart, cycle.votingStart, cycle.awardsStart];
  const ends = [
    cycle.votingStart,
    cycle.awardsStart,
    new Date(cycle.weekEnd.getTime() + 1),
  ];
  const defs = [
    { key: 'signals' as const, label: 'Signals', detail: 'Flags in, admins review' },
    { key: 'vote' as const, label: 'Vote', detail: 'Community votes on open cases' },
    { key: 'ruling' as const, label: 'Ruling', detail: 'Admins rule, results publish' },
  ];
  const durations = starts.map((start, i) => ends[i].getTime() - start.getTime());
  const total = durations.reduce((sum, ms) => sum + ms, 0);
  const currentIndex = phase === 'submission' ? 0 : phase === 'voting' ? 1 : 2;
  const segments: TribunalPhaseSegment[] = defs.map((def, i) => ({
    ...def,
    widthPct: Math.round((durations[i] / total) * 1000) / 10,
    state: i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending',
  }));
  const widthSum = segments.reduce((sum, segment) => sum + segment.widthPct, 0);
  segments[segments.length - 1].widthPct =
    Math.round((segments[segments.length - 1].widthPct + (100 - widthSum)) * 10) / 10;
  return {
    segments,
    currentIndex,
    currentLabel: defs[currentIndex].label,
    currentRemainingMs: Math.max(0, ends[currentIndex].getTime() - now.getTime()),
  };
}

export type CouncilBadgeState = 'locked' | 'empty' | 'in-session';

/**
 * The campfire badge label, from real docket state: locked until the
 * starter is complete, in session while any case is open for review,
 * no cases otherwise.
 */
export function getCouncilBadgeState(
  isUnlocked: boolean,
  openCaseCount: number,
): CouncilBadgeState {
  if (!isUnlocked) return 'locked';
  if (openCaseCount > 0) return 'in-session';
  return 'empty';
}

/**
 * The timestamp a case was opened, as epoch milliseconds, or null when
 * the record carries none. Case timestamps arrive as Firestore
 * Timestamps (seconds), plain epoch numbers, or Dates depending on the
 * read path, so all three shapes are handled here.
 */
export function tribunalCaseOpenedAtMs(openedAt: unknown): number | null {
  if (openedAt === null || openedAt === undefined) return null;
  if (typeof openedAt === 'number') return openedAt;
  if (openedAt instanceof Date) return openedAt.getTime();
  if (typeof openedAt === 'object') {
    const value = openedAt as { seconds?: unknown; toDate?: unknown };
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value.toDate === 'function') {
      const date = (value.toDate as () => unknown)();
      if (date instanceof Date) return date.getTime();
    }
  }
  return null;
}
