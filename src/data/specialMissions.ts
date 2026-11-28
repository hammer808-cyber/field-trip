
import { TripCard } from '../types/challenges';
import { UserProfile } from '../services/userService';

export const LAUNCH_MISSION_ID = 'starter-1';

export const isLaunchMissionEligible = (profile: UserProfile | null, currentDate: Date, pendingIds: Set<string> = new Set()): boolean => {
  if (!profile) return false;
  
  // 1. profile.onboardingCompleted is true
  if (!profile.onboardingCompleted) return false;
  
  // 2. Launch Day check: June 5, 2026 OR explicitly assigned
  const isLaunchDay = 
    currentDate.getUTCFullYear() === 2026 && 
    currentDate.getUTCMonth() === 5 && // June
    currentDate.getUTCDate() === 5;
    
  const isEligible = isLaunchDay || profile.launchMissionAssigned || 
    (profile.createdAt && new Date(profile.createdAt.seconds * 1000).toDateString() === new Date('2026-06-05').toDateString());

  if (!isEligible) return false;
  
  // 3. check if already submitted or approved
  const completedIds = profile.completedChallengeIds || [];
  if (completedIds.includes(LAUNCH_MISSION_ID)) return false;

  const submittedIds = profile.submittedChallengeIds || [];
  if (submittedIds.includes(LAUNCH_MISSION_ID)) return false;

  if (pendingIds.has(LAUNCH_MISSION_ID.toLowerCase())) return false;
  
  return true;
};

export const LAUNCH_MISSION: TripCard = {
  id: LAUNCH_MISSION_ID,
  deckId: 'starter-signals',
  title: "What's Around You",
  description: "Point your camera at whatever is around you right now and take the picture. No wrong answer. This is your first signal.",
  category: 'Onboarding',
  type: 'Onboarding',
  lane: 'onboarding',
  difficulty: 'easy',
  estimatedTimeMinutes: 5,
  baseXP: 100,
  basePoints: 100,
  personaAffinity: ['captainClipboard', 'bigfoot'],
  repeatable: false,
  zineEligible: true,
  snitchEligible: true,
  active: true,
  proofType: ['photo'],
  requiredProof: ['photo'],
  tags: ['starter', 'onboarding', 'first-signal'],
  boostTags: ['urban', 'niche'],
  slowDownTags: [],
  levels: {
    Standard: { points: 100, description: "Snap what's around you.", rule: "Photo must show something around you right now." },
    Advanced: { points: 125, description: "Catch the light.", rule: "Include a second element, like a shadow or a bright color." },
    Certified: { points: 150, description: "Frame it like a postcard.", rule: "Snap at an angle that makes the everyday look good." }
  },
  image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800', 
  status: 'active',
  createdAt: '2026-06-05T00:00:00Z',
  updatedAt: '2026-06-05T00:00:00Z',
  mode: 'solo',
  safetyRules: ['Stay aware of your surroundings.'],
  briefing: "Point your camera at whatever is around you right now and take the picture. No wrong answer. This is your first signal.",
  trevorLine: "In a few words: what did you take a photo of?",
  taskDescription: "Take a picture of what's around you right now.",
  theAsk: "Take a picture of what's around you right now.",
  fieldNotePrompt: "In a few words: what did you take a photo of?",
  submitMessage: 'Receipt sent. Trevor is squinting at your first signal with great interest.',
  isRequired: true
};
