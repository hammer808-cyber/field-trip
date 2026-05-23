
export interface SeasonState {
  label: string;
  daysRemaining: number | null;
  status: 'upcoming' | 'active' | 'ended';
}

export function getSummerCountdown(today: Date = new Date()): SeasonState {
  const year = today.getFullYear();
  const summerStart = new Date(year, 4, 30); // May 30 (Months are 0-indexed)
  const summerEnd = new Date(year, 7, 31);   // August 31

  // Normalize to start of day for accurate day counting
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const sStart = new Date(summerStart.getFullYear(), summerStart.getMonth(), summerStart.getDate()).getTime();
  const sEnd = new Date(summerEnd.getFullYear(), summerEnd.getMonth(), summerEnd.getDate()).getTime();

  const msPerDay = 24 * 60 * 60 * 1000;

  if (t < sStart) {
    const diff = Math.ceil((sStart - t) / msPerDay);
    return {
      label: `Summer Season starts in ${diff} day${diff === 1 ? '' : 's'}`,
      daysRemaining: diff,
      status: 'upcoming'
    };
  }

  if (t <= sEnd) {
    const diff = Math.ceil((sEnd - t) / msPerDay);
    return {
      label: `Summer Season ends in ${diff} day${diff === 1 ? '' : 's'}`,
      daysRemaining: diff,
      status: 'active'
    };
  }

  return {
    label: 'Summer Season ended',
    daysRemaining: null,
    status: 'ended'
  };
}
