export const MOCK_USERS = [
  { id: 'u1', name: 'Explorer Jules', points: 1240, fieldType: 'static-breaker', crewId: 'c1', soloTripsCount: 12 },
  { id: 'u2', name: 'Quiet_Gnome', points: 890, fieldType: 'house-goblin', crewId: 'c1', soloTripsCount: 8 },
  { id: 'u3', name: 'ChaosActual', points: 2100, fieldType: 'wild-card', crewId: 'c2', soloTripsCount: 15 },
  { id: 'u4', name: 'RuleBender', points: 1550, fieldType: 'soft-criminal', crewId: 'c2', soloTripsCount: 10 },
  { id: 'u5', name: 'MainCharacter', points: 1800, fieldType: 'social-menace', crewId: 'c3', soloTripsCount: 14 },
];

export const MOCK_CREWS = [
  { id: 'c1', name: 'Pinecone Pathfinders', members: ['u1', 'u2'], score: 2130 },
  { id: 'c2', name: 'The Chaos Collective', members: ['u3', 'u4'], score: 3650 },
  { id: 'c3', name: 'Urban Legends', members: ['u5'], score: 1800 },
];
