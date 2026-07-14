import type { TripCard } from '../types/challenges';

export type CanonicalMissionCardType = 'Signal' | 'Proof' | 'Crew' | 'Receipt' | 'Lore';

export interface MissionSubmissionContext {
  missionId: string;
  challengeId: string;
  tripId: string;
  missionTitle: string;
  challengeTitle: string;
  tripTitle: string;
  deckId: string;
  deckName: string;
  deckSubtitle: string | null;
  cardType: CanonicalMissionCardType;
}

export function inferMissionCardType(mission: Partial<TripCard>): CanonicalMissionCardType {
  if (mission.cardType) return mission.cardType;
  if (mission.category === 'Crew Challenge' || mission.type === 'Crew Challenge') return 'Crew';
  if (mission.category === 'Evidence Challenge' || mission.type === 'Evidence Challenge') return 'Proof';
  return 'Signal';
}

export function getMissionSubmissionContext(
  mission: Pick<TripCard, 'id' | 'title'> & Partial<TripCard>,
  overrides: Partial<Pick<MissionSubmissionContext, 'deckId' | 'deckName' | 'deckSubtitle' | 'cardType'>> = {}
): MissionSubmissionContext {
  const deckId = String(overrides.deckId || mission.deckId || 'starter-signals').trim();
  const deckName = String(overrides.deckName || mission.deckName || deckId || 'Starter Signals').trim();

  return {
    missionId: mission.id,
    challengeId: mission.id,
    tripId: mission.id,
    missionTitle: mission.title,
    challengeTitle: mission.title,
    tripTitle: mission.title,
    deckId,
    deckName,
    deckSubtitle: overrides.deckSubtitle || mission.deckSubtitle || null,
    cardType: overrides.cardType || inferMissionCardType(mission),
  };
}
