import { QuizQuestion, PersonaRequirement } from '../types/quiz';
import { FieldTypeId } from '../constants';

export const PERSONAS: Record<FieldTypeId, PersonaRequirement> = {
  captainClipboard: {
    id: 'captainClipboard',
    name: 'Captain Clipboard',
    campRole: 'The Routine Architect',
    coreInstinct: 'Organize / Standardize',
    description: 'The primary curator of the Fieldtrip rulebook. Every mission is a masterpiece of documentation and every deviation is a note-in-waiting.',
    vibe: 'Organized, Methodical, Authoritative',
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04844?auto=format&fit=crop&q=80&w=400',
    quote: '"If it isn\'t documented, it never happened."'
  },
  mallRat: {
    id: 'mallRat',
    name: 'Mall Rat',
    campRole: 'The Plaza Prophet',
    coreInstinct: 'Loiter / Observe',
    description: 'You decode the sacred geometry of the shopping mall. You are a local oracle, finding high-signal metadata in the echo of the food court.',
    vibe: 'Social, Chill, Consumer-Adjacent',
    image: 'https://images.unsplash.com/photo-1541411138264-9743aadc26d0?auto=format&fit=crop&q=80&w=400',
    quote: '"The signal is loudest where the Wi-Fi is public."'
  },
  mascota: {
    id: 'mascota',
    name: 'Mascota',
    campRole: 'The Spirit Specialist',
    coreInstinct: 'Hype / Perform',
    description: 'You are the living, breathing hype-machine of the sector. You don\'t just complete missions—you perform them with maximum kitsch and unshakeable shimmer.',
    vibe: 'Performative, Energetic, Kitschy',
    image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&q=80&w=400',
    quote: '"It\'s not a mission, it\'s a performance."'
  },
  elondra: {
    id: 'elondra',
    name: 'Elondra',
    campRole: 'The Narrative Lead',
    coreInstinct: 'Drama / Narrate',
    description: 'A main character by design and a critic by calling. You lead with a sharp eye and even sharper field notes, turning every audit into a dramatic event.',
    vibe: 'Sophisticated, Dramatic, Sharp',
    image: 'https://images.unsplash.com/photo-1582213713303-9366e609748b?auto=format&fit=crop&q=80&w=400',
    quote: '"Main character energy isn\'t an ego trip, it\'s a field requirement."'
  },
  theGobbler: {
    id: 'theGobbler',
    name: 'The Gobbler',
    campRole: 'The Material Harvester',
    coreInstinct: 'Gobble / Hoard',
    description: 'Driven by an insatiable hunger for raw evidence. You swallow missions whole, hoarding proofs like glittering gems in your digital lair.',
    vibe: 'Voracious, Relentless, Chaotic',
    image: 'https://images.unsplash.com/photo-1535663110197-e896ab19ee9f?auto=format&fit=crop&q=80&w=400',
    quote: '"Your download speed is impressive, but your digital digestion is terrifying."'
  },
  bigfoot: {
    id: 'bigfoot',
    name: 'Bigfoot',
    campRole: 'The Perimeter Ghost',
    coreInstinct: 'Hide / Document',
    description: 'Silent, elusive, and perfectly framed in the shadows. You document the fringes of reality so the team doesn\'t have to look directly at them.',
    vibe: 'Solo, Elusive, Nature-First',
    image: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&q=80&w=400',
    quote: '"The most important entries are the ones nobody ever sees."'
  },
  unclassified: {
    id: 'unclassified',
    name: 'Unclassified',
    campRole: 'Field Talent',
    coreInstinct: 'Adapt',
    description: 'Awaiting classification. HQ is still processing your behavioral profile.',
    vibe: 'Neutral, observing, flexible',
    image: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Unclassified&backgroundColor=b6e3f4',
    quote: '"I am the signal HQ hasn\'t named yet."'
  }
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    screenId: 'FT-SCR-Q1-STRIP-MALL',
    prompt: 'You end up at a weird little strip mall with one working neon sign and suspiciously good parking. Where do you go first?',
    weight: 1,
    trevorVoice: 'TREVOR: "Atmosphere is 90% of the audit. Keep your eyes on the exit."',
    answers: [
      { id: 'q1-a1', text: 'The snack spot. I need to know what the regulars know.', personaWeights: { mallRat: 2 } },
      { id: 'q1-a2', text: 'The karaoke bar with no sign and too much confidence.', personaWeights: { mascota: 2 } },
      { id: 'q1-a3', text: 'The hallway between businesses that feels accidentally haunted.', personaWeights: { bigfoot: 2 } },
      { id: 'q1-a4', text: 'The directory by the elevator. I need the layout first.', personaWeights: { captainClipboard: 2 } },
      { id: 'q1-a5', text: 'The boutique that looks closed but has one candle burning.', personaWeights: { elondra: 2 } },
      { id: 'q1-a6', text: 'The place with covered windows and a handwritten “back soon” sign.', personaWeights: { theGobbler: 2 } }
    ]
  },
  {
    id: 'q2',
    screenId: 'FT-SCR-Q2-LOCAL-REC',
    prompt: 'You need a local recommendation, but the person at the counter looks busy. What do you do?',
    weight: 1,
    stickyNote: 'TR: "Think about your reputation. Or lack thereof."',
    answers: [
      { id: 'q2-a1', text: 'Ask what they personally order when nobody’s judging.', personaWeights: { mallRat: 2 } },
      { id: 'q2-a2', text: 'Open with a compliment and somehow leave with their life story.', personaWeights: { mascota: 2 } },
      { id: 'q2-a3', text: 'Hover politely, panic, then read every flyer by the register.', personaWeights: { bigfoot: 2 } },
      { id: 'q2-a4', text: 'Ask one clear question and thank them in under 30 seconds.', personaWeights: { captainClipboard: 2 } },
      { id: 'q2-a5', text: 'Ask where they’d send someone with taste and limited patience.', personaWeights: { elondra: 2 } },
      { id: 'q2-a6', text: 'Ask one question, then immediately discover six follow-ups.', personaWeights: { theGobbler: 2 } }
    ]
  },
  {
    id: 'q3',
    screenId: 'FT-SCR-Q3-MYSTERY-SNACKS',
    prompt: 'Someone brought mystery-flavor snacks to the hangout. You:',
    weight: 1,
    trevorVoice: 'TREVOR: "Safety first! Technically."',
    answers: [
      { id: 'q3-a1', text: 'Check the package first. I’ve been hurt by limited editions.', personaWeights: { mallRat: 2 } },
      { id: 'q3-a2', text: 'Turn it into a group taste test immediately.', personaWeights: { mascota: 2 } },
      { id: 'q3-a3', text: 'Smell it, inspect it, and say, “Interesting,” too quietly.', personaWeights: { bigfoot: 2 } },
      { id: 'q3-a4', text: 'Make everyone rate it from 1 to 10.', personaWeights: { captainClipboard: 2 } },
      { id: 'q3-a5', text: 'Take one bite and give it a very specific review.', personaWeights: { elondra: 2 } },
      { id: 'q3-a6', text: 'Keep the wrapper because something about this feels documented.', personaWeights: { theGobbler: 2 } }
    ]
  },
  {
    id: 'q4',
    screenId: 'FT-SCR-Q4-GROUP-CHAT',
    prompt: 'Your friends are trying to pick one place for dinner, and the group chat is collapsing in real time. You are:',
    weight: 1,
    stickyNote: 'TR: "Emotional proximity varies by asset ID."',
    answers: [
      { id: 'q4-a1', text: 'Sending the safest crowd-pleaser with decent fries.', personaWeights: { mallRat: 2 } },
      { id: 'q4-a2', text: 'Keeping morale alive with voice notes and unnecessary emojis.', personaWeights: { mascota: 2 } },
      { id: 'q4-a3', text: 'Silently reacting to messages, then suggesting a perfect wildcard.', personaWeights: { bigfoot: 2 } },
      { id: 'q4-a4', text: 'Making a shortlist, checking hours, and ending the madness.', personaWeights: { captainClipboard: 2 } },
      { id: 'q4-a5', text: 'Rejecting bad lighting, weird chairs, and places with no vibe.', personaWeights: { elondra: 2 } },
      { id: 'q4-a6', text: 'Reading old reviews like I’m uncovering a municipal scandal.', personaWeights: { theGobbler: 2 } }
    ]
  },
  {
    id: 'q5',
    screenId: 'FT-SCR-Q5-EMPLOYEES-ONLY',
    prompt: 'You find a door with a tiny “Employees Only” sign at a weird little shop. Your first thought is:',
    weight: 1,
    trevorVoice: 'TREVOR: "Social signals are high-bandwidth metadata."',
    answers: [
      { id: 'q5-a1', text: 'Not my business. I’m here for snacks and vibes.', personaWeights: { mallRat: 2 } },
      { id: 'q5-a2', text: 'Maybe if I’m charming enough, someone will explain it.', personaWeights: { mascota: 2 } },
      { id: 'q5-a3', text: 'I will observe from afar and become part of the wall.', personaWeights: { bigfoot: 2 } },
      { id: 'q5-a4', text: 'There is probably a reason, and I respect posted signage.', personaWeights: { captainClipboard: 2 } },
      { id: 'q5-a5', text: 'I could walk in confidently and no one would question it.', personaWeights: { elondra: 2 } },
      { id: 'q5-a6', text: 'That sign is hiding a story, and I need the footnotes.', personaWeights: { theGobbler: 2 } }
    ]
  },
  {
    id: 'q6',
    screenId: 'FT-SCR-Q6-ZERO-REACTION',
    prompt: 'Your post gets zero reaction in the group chat. What do you do next?',
    weight: 1,
    stickyNote: 'TR: "Authenticity is in the eye of the auditor."',
    answers: [
      { id: 'q6-a1', text: 'Delete it quietly and pretend I never cared.', personaWeights: { mallRat: 2 } },
      { id: 'q6-a2', text: 'Ask the group what would make it funnier.', personaWeights: { mascota: 2 } },
      { id: 'q6-a3', text: 'Disappear for 48 hours, then return with something better.', personaWeights: { bigfoot: 2 } },
      { id: 'q6-a4', text: 'Review the assignment and fix the missing pieces.', personaWeights: { captainClipboard: 2 } },
      { id: 'q6-a5', text: 'Repost it later with better lighting and less desperation.', personaWeights: { elondra: 2 } },
      { id: 'q6-a6', text: 'Screenshot everything and investigate what went wrong.', personaWeights: { theGobbler: 2 } }
    ]
  },
  {
    id: 'q7',
    screenId: 'FT-SCR-Q7-FERAL-WEATHER',
    prompt: 'You finally make plans, and then the weather turns feral. You:',
    weight: 1,
    trevorVoice: 'TREVOR: "FOMO is a powerful behavioral driver. Use it."',
    answers: [
      { id: 'q7-a1', text: 'Suggest moving somewhere indoors with fries.', personaWeights: { mallRat: 2 } },
      { id: 'q7-a2', text: 'Decide this is now a rain-themed memory.', personaWeights: { mascota: 2 } },
      { id: 'q7-a3', text: 'Find shelter and quietly enjoy the atmosphere.', personaWeights: { bigfoot: 2 } },
      { id: 'q7-a4', text: 'Check the forecast, parking, exits, and backup plan.', personaWeights: { captainClipboard: 2 } },
      { id: 'q7-a5', text: 'Refuse to waste the outfit and find better lighting.', personaWeights: { elondra: 2 } },
      { id: 'q7-a6', text: 'Document the storm like it personally betrayed me.', personaWeights: { theGobbler: 2 } }
    ]
  },
  {
    id: 'q8',
    screenId: 'FT-SCR-Q8-LIFE-UPGRADE',
    prompt: 'You win one impossible life upgrade. What are you choosing?',
    weight: 1,
    stickyNote: 'TR: "Resilience is the ultimate field asset."',
    answers: [
      { id: 'q8-a1', text: 'Unlimited food court money and no parking anxiety.', personaWeights: { mallRat: 2 } },
      { id: 'q8-a2', text: 'A group chat that actually makes plans.', personaWeights: { mascota: 2 } },
      { id: 'q8-a3', text: 'A one-way ticket with no itinerary.', personaWeights: { bigfoot: 2 } },
      { id: 'q8-a4', text: 'Executive access, color-coded calendar included.', personaWeights: { captainClipboard: 2 } },
      { id: 'q8-a5', text: 'VIP entry anywhere with flattering lighting.', personaWeights: { elondra: 2 } },
      { id: 'q8-a6', text: 'A master key and absolutely no explanation.', personaWeights: { theGobbler: 2 } }
    ]
  }
];

export const TIE_BREAKER_PRIORITY: FieldTypeId[] = [
  'captainClipboard',
  'mallRat',
  'mascota',
  'elondra',
  'theGobbler',
  'bigfoot'
];
