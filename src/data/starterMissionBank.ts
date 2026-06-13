import { ChallengeCard } from '../types/challenges';

const MOCK_TIME = new Date().toISOString();

export const STARTER_MISSION_BANK: Partial<ChallengeCard>[] = [
  {
    id: "starter-1",
    missionId: "starter-1",
    challengeId: "starter-1",
    deckId: "starter-signals",
    title: "The Initial Signal",
    description: "Welcome to Fieldtrip. Find and snap any vibrant flower, striking blue sky, or shady tree near you right now. An easy signal to warm up your lens!",
    category: "Onboarding",
    type: "Onboarding",
    lane: "onboarding",
    difficulty: 'easy',
    baseXP: 100,
    basePoints: 100,
    proofType: ["photo"],
    requiredProof: ["photo"],
    personaAffinity: ["captainClipboard", "bigfoot"],
    active: true,
    status: "active",
    isStarter: true,
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME,
    levels: {
      Standard: { points: 100, description: "Identify the nature moment." },
      Advanced: { points: 125, description: "Extra Sunshine." },
      Certified: { points: 150, description: "The Golden Angle." }
    },
    theAsk: "Capture a photo of any outdoor nature detail as your first signal.",
    fieldNotePrompt: "Why does this nature spot belong in your collection?",
    safetyRules: ["Stay safe in the sun.", "Acknowledge the outdoors."]
  },
  {
    id: "starter-2",
    missionId: "starter-2",
    challengeId: "starter-2",
    deckId: "starter-signals",
    title: "Snack Evidence",
    description: "Take a photo of the most summer-coded snack or cold drink within reach. Your crew deserves to know what is fueling the day.",
    category: "Evidence Challenge",
    type: "Evidence Challenge",
    lane: "onboarding",
    difficulty: 'easy',
    baseXP: 100,
    basePoints: 100,
    proofType: ["photo"],
    requiredProof: ["photo"],
    personaAffinity: ["bigfoot", "theGobbler"],
    active: true,
    status: "active",
    isStarter: true,
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME,
    levels: {
      Standard: { points: 100, description: "Document the snack." },
      Advanced: { points: 125, description: "Action Shot." },
      Certified: { points: 150, description: "The Presentation." }
    },
    theAsk: "Take a photo of the most summer-coded snack or cold drink within reach.",
    fieldNotePrompt: "Your crew deserves to know what fueled the day.",
    safetyRules: ["Eat and drink safely."]
  },
  {
    id: "starter-3",
    missionId: "starter-3",
    challengeId: "starter-3",
    deckId: "starter-signals",
    title: "Personal Oasis",
    description: "Find your ultimate survival spot in the heat. It could be an air-conditioned room, a shady park bench, or just dipping your toes in cool water.",
    category: "Field Challenge",
    type: "Field Challenge",
    lane: "onboarding",
    difficulty: 'medium',
    baseXP: 100,
    basePoints: 100,
    proofType: ["photo", "note"],
    requiredProof: ["photo", "note"],
    personaAffinity: ["mallRat", "theGobbler"],
    active: true,
    status: "active",
    isStarter: true,
    createdAt: MOCK_TIME,
    updatedAt: MOCK_TIME,
    levels: {
      Standard: { points: 100, description: "Find the cooling oasis." },
      Advanced: { points: 125, description: "Context Check." },
      Certified: { points: 150, description: "The Temperature Contrast." }
    },
    theAsk: "Take a photo of your survival oasis where you defeat the summer heat.",
    fieldNotePrompt: "A historic record of how you survived the summer heatwave.",
    safetyRules: ["Be respectful in public spaces."]
  }
];
