export type PersonaId = 'house-goblin' | 'social-menace' | 'soft-criminal' | 'static-breaker' | 'wild-card';

export interface Persona {
  id: PersonaId;
  name: string;
  description: string;
  perk: string;
  snag: string;
  perkDesc: string;
  snagDesc: string;
  image: string;
}

export const PERSONAS: Record<PersonaId, Persona> = {
  'house-goblin': {
    id: 'house-goblin',
    name: 'House Goblin',
    description: 'Loves staying in, but secretly becomes powerful once dragged into the world.',
    perk: 'Cozy Launch',
    perkDesc: 'Gets one easier starter challenge option when energy is low.',
    snag: 'Threshold Tax',
    snagDesc: 'Must complete one small "leave the comfort zone" bonus step for full points.',
    image: 'https://images.unsplash.com/photo-1582213713303-9366e609748b?auto=format&fit=crop&q=80&w=400'
  },
  'social-menace': {
    id: 'social-menace',
    name: 'Social Menace',
    description: 'Turns errands into scenes and makes strangers briefly question reality.',
    perk: 'Witness Bonus',
    perkDesc: 'Earns bonus points when a challenge includes a friend, stranger interaction, or social proof.',
    snag: 'Audience Required',
    snagDesc: 'Some challenges require a tiny social action before submission.',
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=400'
  },
  'soft-criminal': {
    id: 'soft-criminal',
    name: 'Soft Criminal',
    description: 'Not actually criminal. Just suspiciously good at bending boring rules into fun.',
    perk: 'Loophole Card',
    perkDesc: 'Once per cycle, may swap a challenge requirement while keeping the same category.',
    snag: 'Alibi Check',
    snagDesc: 'Must add a stronger journal note or extra proof detail for full points.',
    image: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&q=80&w=400'
  },
  'static-breaker': {
    id: 'static-breaker',
    name: 'Static Breaker',
    description: 'Allergic to routine. Born to interrupt the beige fog.',
    perk: 'Pattern Break',
    perkDesc: 'Earns bonus points for trying a new category or location type.',
    snag: 'No Repeat Zone',
    snagDesc: 'Cannot repeat the same category too soon without reduced points.',
    image: 'https://images.unsplash.com/photo-1541411138264-9743aadc26d0?auto=format&fit=crop&q=80&w=400'
  },
  'wild-card': {
    id: 'wild-card',
    name: 'Wild Card',
    description: 'The app looked away for one second and now this person is climbing the side quest ladder.',
    perk: 'Chaos Boost',
    perkDesc: 'Random chance for bonus points, surprise reroll, or mystery challenge.',
    snag: 'Random Twist',
    snagDesc: 'Some challenges get an unexpected extra condition.',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=400'
  }
};

export interface Challenge {
  id: string;
  title: string;
  description: string;
  simpleDescription: string;
  category: 'Social' | 'Nature' | 'Navigator' | 'Stealth' | 'Chaos';
  points: number;
  difficulty: number;
  energyLevel: 'low' | 'medium' | 'high';
  image: string;
}

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: 'Market Intersection Audit',
    description: 'Document three distinct verbal handshakes between local vendors and patrons.',
    simpleDescription: 'Capture 3 evidence frames of social exchange.',
    category: 'Social',
    points: 50,
    difficulty: 2,
    energyLevel: 'medium',
    image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    title: 'Post-Industrial Flora Map',
    description: 'Identify three specimens of uncommissioned greenery appearing in sidwalk fractures.',
    simpleDescription: 'File 3 reports on sidewalk-crack vegetation.',
    category: 'Nature',
    points: 30,
    difficulty: 1,
    energyLevel: 'low',
    image: 'https://images.unsplash.com/photo-1444491741275-3747c53c99b4?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    title: 'Peak Zero Reconnaissance',
    description: 'Locate the unmarked summit access and triangulate local cardinal points.',
    simpleDescription: 'Find high ground. Document your orientation.',
    category: 'Navigator',
    points: 100,
    difficulty: 4,
    energyLevel: 'high',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    title: 'Non-Standard Access Trace',
    description: 'Enter a municipal structure via a service portal or auxiliary dock. Evidence requires high-composure documentation.',
    simpleDescription: 'Use a non-primary entrance. Remain undetected.',
    category: 'Stealth',
    points: 150,
    difficulty: 3,
    energyLevel: 'medium',
    image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dee62?auto=format&fit=crop&q=80&w=800'
  }
];

export interface Entry {
  id: string;
  userId: string;
  userName: string;
  crewId?: string;
  challengeId: string;
  challengeTitle: string;
  proofImage: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs-more-proof' | 'draft' | 'submitted' | 'checking' | 'auto_approved' | 'needs_review' | 'resubmit_requested' | 'approved_by_admin';
  pointsAwarded: number;
  proofCheckId?: string;
  createdAt: any;
  adminNotes?: string;
}

export const MOCK_ENTRIES: Entry[] = [
  {
    id: 'e1',
    userId: 'u1',
    userName: 'Field Agent Jules',
    challengeId: '1',
    challengeTitle: 'Market Intersection Audit',
    proofImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    note: 'Audit completed at 0600. Vendor activity is high. Local patterns seem consistent with previous reports.',
    status: 'approved_by_admin',
    pointsAwarded: 50,
    createdAt: '2024-05-09T08:00:00Z'
  },
  {
    id: 'e2',
    userId: 'u2',
    userName: 'Quiet_Gnome',
    challengeId: '2',
    challengeTitle: 'Post-Industrial Flora Map',
    proofImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800',
    note: 'Visual confirmation: Peregrine Falcon sighted at Site B. Unexpected deviation from seasonal norms.',
    status: 'approved_by_admin',
    pointsAwarded: 30,
    createdAt: '2024-05-10T10:00:00Z'
  }
];
