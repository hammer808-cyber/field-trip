/**
 * Time-of-day submit windows (Nov 21, 2026).
 *
 * A card can declare a window its submissions must fall inside — the hard
 * winter cards are place + time ("do this task at this specific place at
 * this specific time"). The window is the player's LOCAL hours, 0–23.
 * endHour <= startHour means the window wraps midnight: 18→6 is 6 PM–6 AM.
 *
 * Pure, no Firebase. The same helpers run at all three enforcement sites
 * so the rule cannot drift between them: FieldClipboard (submit disabled),
 * AppContext.addEntry (TIME_WINDOW_CLOSED), and the server approve route
 * (which reads the entry's stamped local hour, falling back to the
 * submittedAt hour in America/Los_Angeles).
 */

export interface TimeWindow {
  startHour: number;
  endHour: number;
}

/** True when `hour` (0–23, local) falls inside the window. Wrap-aware. */
export function isWithinTimeWindow(hour: number, window: TimeWindow): boolean {
  const { startHour, endHour } = window;
  if (startHour === endHour) return true;
  if (endHour > startHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

/** "6 PM" / "6 AM" / "12 AM" for a 0–23 hour. */
export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

/** "6 PM–6 AM" for a window. */
export function formatTimeWindow(window: TimeWindow): string {
  return `${formatHour(window.startHour)}–${formatHour(window.endHour)}`;
}

export interface TimeWindowStatus {
  /** True when the card has no window or `now` is inside it. */
  open: boolean;
  /** The card's window, when it has one. */
  window?: TimeWindow;
  /**
   * Player-facing line when closed, e.g. "Only open 6 PM–6 AM — come
   * back at 6 PM." Empty when open.
   */
  closedMessage: string;
}

/**
 * Whether a mission accepts a submission right now. `mission` is the card
 * (or any object carrying proofRequirements.timeWindow); `now` defaults to
 * the player's current local time.
 */
export function getTimeWindowStatus(
  mission: { proofRequirements?: { timeWindow?: TimeWindow } } | null | undefined,
  now: Date = new Date(),
): TimeWindowStatus {
  const window = mission?.proofRequirements?.timeWindow;
  if (!window) return { open: true, closedMessage: '' };
  if (isWithinTimeWindow(now.getHours(), window)) {
    return { open: true, window, closedMessage: '' };
  }
  return {
    open: false,
    window,
    closedMessage: `Only open ${formatTimeWindow(window)} — come back at ${formatHour(window.startHour)}.`,
  };
}
