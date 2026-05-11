import { Challenge } from '../constants';

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: 'Morning Market Dispatch',
    description: 'Document three distinct interactions between vendors and patrons at the sunrise market.',
    simpleDescription: 'Take 3 photos of people talking at a market.',
    category: 'Social',
    points: 50,
    difficulty: 2,
    energyLevel: 'medium',
    image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    title: 'Urban Flora Sketch',
    description: 'Find and identify three species of non-planted greenery in a 1-block radius.',
    simpleDescription: 'Find 3 weeds/wildflowers growing in sidewalk cracks.',
    category: 'Nature',
    points: 30,
    difficulty: 1,
    energyLevel: 'low',
    image: 'https://images.unsplash.com/photo-1444491741275-3747c53c99b4?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    title: 'Hidden Viewpoint',
    description: 'Locate the unmarked summit trail at West Peak and record the cardinal directions.',
    simpleDescription: 'Find a high spot and point north.',
    category: 'Navigator',
    points: 100,
    difficulty: 4,
    energyLevel: 'high',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    title: 'The Backdoor Entry',
    description: 'Enter a public building through a service entrance or side door. Act like you belong.',
    simpleDescription: 'Use a different door than usual. Don\'t be suspicious.',
    category: 'Stealth',
    points: 150,
    difficulty: 3,
    energyLevel: 'medium',
    image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dee62?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '5',
    title: 'Statue Mimic',
    description: 'Find a public statue and mimic its pose for exactly 60 seconds without breaking character.',
    simpleDescription: 'Copy a statue for 1 minute.',
    category: 'Chaos',
    points: 80,
    difficulty: 3,
    energyLevel: 'high',
    image: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&q=80&w=800'
  }
];
