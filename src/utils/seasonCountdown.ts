
import { HEATWAVE_SEASON_START_DATE, HEATWAVE_SEASON_END_DATE } from '../constants';

export interface SeasonState {
  label: string;
  daysRemaining: number | null;
  status: 'upcoming' | 'active' | 'ended';
  noiseLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export function getSummerCountdown(today: Date = new Date()): SeasonState {
  const summerStart = new Date(HEATWAVE_SEASON_START_DATE);
  const summerEnd = new Date(HEATWAVE_SEASON_END_DATE);

  // Normalize to start of day for accurate day counting
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const sStart = new Date(summerStart.getFullYear(), summerStart.getMonth(), summerStart.getDate()).getTime();
  const sEnd = new Date(summerEnd.getFullYear(), summerEnd.getMonth(), summerEnd.getDate()).getTime();

  const msPerDay = 24 * 60 * 60 * 1000;

  if (t < sStart) {
    const diff = Math.ceil((sStart - t) / msPerDay);
    const diffExactMs = summerStart.getTime() - today.getTime();
    const hoursRemaining = Math.floor(diffExactMs / (1000 * 60 * 60));
    
    let noiseLevel: SeasonState['noiseLevel'] = 'none';
    let label = `Heatwave Receipts starts in ${diff} day${diff === 1 ? '' : 's'}`;

    if (hoursRemaining <= 24) {
      noiseLevel = 'critical';
      label = "Heatwave starts tomorrow!";
    } else if (diff <= 3) {
      noiseLevel = 'high';
      label = "Heatwave starts Saturday!";
    } else if (diff <= 6) {
      noiseLevel = 'medium';
    } else if (diff <= 10) {
      noiseLevel = 'low';
    }

    return {
      label,
      daysRemaining: diff,
      status: 'upcoming',
      noiseLevel
    };
  }

  if (t <= sEnd) {
    const diff = Math.ceil((sEnd - t) / msPerDay);
    return {
      label: `Heatwave Receipts ends in ${diff} day${diff === 1 ? '' : 's'}`,
      daysRemaining: diff,
      status: 'active',
      noiseLevel: 'critical'
    };
  }

  return {
    label: 'Heatwave Receipts ended',
    daysRemaining: null,
    status: 'ended',
    noiseLevel: 'none'
  };
}
