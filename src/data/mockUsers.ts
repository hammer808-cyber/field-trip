export const MOCK_USERS = [
  { id: 'u1', name: 'Explorer Jules', points: 1240, persona: 'static-breaker', crewId: 'c1' },
  { id: 'u2', name: 'Quiet_Gnome', points: 890, persona: 'house-goblin', crewId: 'c1' },
  { id: 'u3', name: 'ChaosActual', points: 2100, persona: 'wild-card', crewId: 'c2' },
  { id: 'u4', name: 'RuleBender', points: 1550, persona: 'soft-criminal', crewId: 'c2' },
  { id: 'u5', name: 'MainCharacter', points: 1800, persona: 'social-menace', crewId: 'c3' },
];

export const MOCK_CREWS = [
  { id: 'c1', name: 'Pinecone Pathfinders', members: ['u1', 'u2'], score: 2130 },
  { id: 'c2', name: 'The Chaos Collective', members: ['u3', 'u4'], score: 3650 },
  { id: 'c3', name: 'Urban Legends', members: ['u5'], score: 1800 },
];
