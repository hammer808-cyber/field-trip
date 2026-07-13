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
      { id: 'q1-a1', text: 'The snack spot. I need to know what the regulars know.', personaWeights: { mallRat: 3, bigfoot: 1 } },
      { id: 'q1-a2', text: 'The karaoke bar with no sign and too much confidence.', personaWeights: { mascota: 3, elondra: 1 } },
      { id: 'q1-a3', text: 'The hallway between businesses that feels accidentally haunted.', personaWeights: { bigfoot: 3, theGobbler: 1 } },
      { id: 'q1-a4', text: 'The directory by the elevator. I need the layout first.', personaWeights: { captainClipboard: 3, mallRat: 1 } },
      { id: 'q1-a5', text: 'The boutique that looks closed but has one candle burning.', personaWeights: { elondra: 3, mascota: 1 } },
      { id: 'q1-a6', text: 'The place with covered windows and a handwritten “back soon” sign.', personaWeights: { theGobbler: 3, captainClipboard: 1 } }
    ]
  },
  {
    id: 'q2',
    screenId: 'FT-SCR-Q2-LOCAL-REC',
    prompt: 'You need a local recommendation, but the person at the counter looks busy. What do you do?',
    weight: 1,
    stickyNote: 'TR: "Think about your reputation. Or lack thereof."',
    answers: [
      { id: 'q2-a1', text: 'Ask what they personally order when nobody’s judging.', personaWeights: { mallRat: 3, captainClipboard: 1 } },
      { id: 'q2-a2', text: 'Open with a compliment and somehow leave with their life story.', personaWeights: { mascota: 3, mallRat: 1 } },
      { id: 'q2-a3', text: 'Hover politely, panic, then read every flyer by the register.', personaWeights: { bigfoot: 3, elondra: 1 } },
      { id: 'q2-a4', text: 'Ask one clear question and thank them in under 30 seconds.', personaWeights: { captainClipboard: 3, theGobbler: 1 } },
      { id: 'q2-a5', text: 'Ask where they’d send someone with taste and limited patience.', personaWeights: { elondra: 3, bigfoot: 1 } },
      { id: 'q2-a6', text: 'Ask one question, then immediately discover six follow-ups.', personaWeights: { theGobbler: 3, mascota: 1 } }
    ]
  },
  {
    id: 'q3',
    screenId: 'FT-SCR-Q3-MYSTERY-SNACKS',
    prompt: 'Someone brought mystery-flavor snacks to the hangout. You:',
    weight: 1,
    trevorVoice: 'TREVOR: "Safety first! Technically."',
    answers: [
      { id: 'q3-a1', text: 'Check the package first. I’ve been hurt by limited editions.', personaWeights: { mallRat: 3, captainClipboard: 1 } },
      { id: 'q3-a2', text: 'Turn it into a group taste test immediately.', personaWeights: { mascota: 3, elondra: 1 } },
      { id: 'q3-a3', text: 'Smell it, inspect it, and say, “Interesting,” too quietly.', personaWeights: { bigfoot: 3, mascota: 1 } },
      { id: 'q3-a4', text: 'Make everyone rate it from 1 to 10.', personaWeights: { captainClipboard: 3, theGobbler: 1 } },
      { id: 'q3-a5', text: 'Take one bite and give it a very specific review.', personaWeights: { elondra: 3, theGobbler: 1 } },
      { id: 'q3-a6', text: 'Keep the wrapper because something about this feels documented.', personaWeights: { theGobbler: 3, bigfoot: 1 } }
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
