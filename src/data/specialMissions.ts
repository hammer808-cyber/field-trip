
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
  title: 'The Initial Signal',
  description: "Welcome to Fieldtrip! Find and snap any vibrant flower, striking blue sky, or shady tree near you right now. An easy signal to warm up your lens!",
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
  tags: ['nature', 'summer', 'easy'],
  boostTags: ['urban', 'niche'],
  slowDownTags: [],
  levels: {
    Standard: { points: 100, description: "Identify the nature moment.", rule: "Photo must show a plant, tree, sky, or shading near you." },
    Advanced: { points: 125, description: "Extra Sunshine.", rule: "Include double elements (e.g. flower and sun flare)." },
    Certified: { points: 150, description: "The Golden Angle.", rule: "Snap at an angle showing shadows stretch." }
  },
  image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=800', 
  status: 'active',
  createdAt: '2026-06-05T00:00:00Z',
  updatedAt: '2026-06-05T00:00:00Z',
  mode: 'solo',
  safetyRules: ['Stay safe in the sun.', 'Acknowledge the outdoors.'],
  briefing: "Welcome to Fieldtrip! Find and snap any vibrant flower, striking blue sky, or shady tree near you right now. An easy signal to warm up your lens!",
  trevorLine: "Why does this nature spot belong in your collection?",
  taskDescription: "Find and snap any vibrant flower, striking blue sky, or shady tree near you.",
  theAsk: "Take a photo of any outdoor nature detail that feels like a relaxing summer moment.",
  fieldNotePrompt: "Why does this nature spot belong in your collection?",
  submitMessage: 'Receipt sent. Trevor is squinting at your Initial Signal with great interest.',
  isRequired: true
};
