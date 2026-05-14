import { QuizQuestion, PersonaRequirement } from '../types/quiz';
import { FieldTypeId } from '../constants';

export const PERSONAS: Record<FieldTypeId, PersonaRequirement> = {
  captainClipboard: {
    id: 'captainClipboard',
    name: 'Captain Clipboard',
    campRole: 'The Organizer',
    coreInstinct: 'Organize',
    description: 'The primary architect of the checklist. You ensure every detail is documented and every rule is optimized for maximum efficiency.',
    vibe: 'Organized, Rule-bound, Authoritative',
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04844?auto=format&fit=crop&q=80&w=400',
    quote: '"If it isn\'t documented, it never happened."'
  },
  mallRat: {
    id: 'mallRat',
    name: 'Mall Rat',
    campRole: 'The Scene Seeker',
    coreInstinct: 'Socialize',
    description: 'You find the pulse of the city in public spaces. You are a master of urban navigation and identifying the next social destination.',
    vibe: 'Social, Chill, Consumer-Adjacent',
    image: 'https://images.unsplash.com/photo-1541411138264-9743aadc26d0?auto=format&fit=crop&q=80&w=400',
    quote: '"The signal is strongest where the Wi-Fi is public."'
  },
  homecomingQueen: {
    id: 'homecomingQueen',
    name: 'Homecoming Queen',
    campRole: 'The Ringleader',
    coreInstinct: 'Lead / Compete',
    description: 'You are the gravitational center of any group. Competitive, charismatic, and always ready to lead the charge on any challenge.',
    vibe: 'Social, High-Profile, Aesthetic',
    image: 'https://images.unsplash.com/photo-1582213713303-9366e609748b?auto=format&fit=crop&q=80&w=400',
    quote: '"Main character energy isn\'t an ego trip, it\'s a field requirement."'
  },
  lostCamper: {
    id: 'lostCamper',
    name: 'Lost Camper',
    campRole: 'The Lonesome Traveler',
    coreInstinct: 'Explore',
    description: 'You wander perfectly. Serendipity is your compass, and you possess the unique ability to find wonder in the unintended.',
    vibe: 'Curious, Confused, Lucky',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=400',
    quote: '"I\'m not lost. I\'m identifying a new route to the same destination."'
  },
  bigfoot: {
    id: 'bigfoot',
    name: 'Bigfoot',
    campRole: 'The Elusive Observer',
    coreInstinct: 'Observe / Document',
    description: 'Elusive and silent. You connect with the fringes and document the world from a perspective others completely miss.',
    vibe: 'Solo, Elusive, Nature-First',
    image: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&q=80&w=400',
    quote: '"The most important entries are the ones nobody ever sees."'
  }
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    screenId: 'FT-SCR-FINAL-Q1-PARKING-LOT',
    prompt: 'You\'re in a deserted parking lot at 2 AM. Why?',
    weight: 1,
    trevorVoice: 'TREVOR: "Setting the scene. Atmosphere is 90% of the audit."',
    answers: [
      { id: 'q1-a1', text: 'Documenting the liminal space geometry.', personaWeights: { captainClipboard: 2, bigfoot: 1 } },
      { id: 'q1-a2', text: 'Vibe check for the next group hangout.', personaWeights: { homecomingQueen: 2, mallRat: 1 } },
      { id: 'q1-a3', text: 'Wait, how did I get here? Is this my car?', personaWeights: { lostCamper: 3 } },
      { id: 'q1-a4', text: 'Avoiding a social obligation I never agreed to.', personaWeights: { bigfoot: 3, mallRat: 1 } }
    ]
  },
  {
    id: 'q2',
    screenId: 'FT-SCR-FINAL-Q2-PUBLIC-CHALLENGE',
    prompt: 'A public challenge requires you to dance in a fountain. Your move?',
    weight: 1,
    stickyNote: 'TR: "Think about your reputation. Or lack thereof."',
    answers: [
      { id: 'q2-a1', text: 'Execute a pre-planned routine with precision.', personaWeights: { captainClipboard: 3 } },
      { id: 'q2-a2', text: 'Do it only if the whole crew joins for the photo.', personaWeights: { homecomingQueen: 3 } },
      { id: 'q2-a3', text: 'Subtly sway while nobody is looking.', personaWeights: { bigfoot: 2, mallRat: 1 } },
      { id: 'q2-a4', text: 'Accidentally fall in and call it a performance.', personaWeights: { lostCamper: 3 } }
    ]
  },
  {
    id: 'q3',
    screenId: 'FT-SCR-FINAL-Q3-BUDDY-SYSTEM',
    prompt: 'The Buddy System is mandatory. What kind of buddy are you?',
    weight: 1,
    trevorVoice: 'TREVOR: "Safety first! Technically."',
    answers: [
      { id: 'q3-a1', text: 'The one with the map and the first aid kit.', personaWeights: { captainClipboard: 3 } },
      { id: 'q3-a2', text: 'The one who knows everyone at the destination.', personaWeights: { homecomingQueen: 3 } },
      { id: 'q3-a3', text: 'The one asking "Are we there yet?" every five minutes.', personaWeights: { lostCamper: 2, mallRat: 1 } },
      { id: 'q3-a4', text: 'The one walking five feet behind, in the shadows.', personaWeights: { bigfoot: 3 } }
    ]
  },
  {
    id: 'q4',
    screenId: 'FT-SCR-FINAL-Q4-VAGUE-PROMPT',
    prompt: 'A prompt says: "Find something that feels like home." You go to:',
    weight: 1,
    stickyNote: 'TR: "Emotional proximity varies by asset ID."',
    answers: [
      { id: 'q4-a1', text: 'A well-organized filing cabinet.', personaWeights: { captainClipboard: 3 } },
      { id: 'q4-a2', text: 'The local mall food court.', personaWeights: { mallRat: 3 } },
      { id: 'q4-a3', text: 'Anywhere my best friends are.', personaWeights: { homecomingQueen: 3 } },
      { id: 'q4-a4', text: 'A hollow log in the woods.', personaWeights: { bigfoot: 3 } }
    ]
  },
  {
    id: 'q5',
    screenId: 'FT-SCR-FINAL-Q5-GROUP-CHAT',
    prompt: 'The group chat is blowing up. Your response?',
    weight: 1,
    trevorVoice: 'TREVOR: "Social signals are high-bandwidth metadata."',
    answers: [
      { id: 'q5-a1', text: 'Mute it. I have an actual mission to complete.', personaWeights: { bigfoot: 2, captainClipboard: 1 } },
      { id: 'q5-a2', text: 'React with a single emoji. Minimal input, max presence.', personaWeights: { mallRat: 3 } },
      { id: 'q5-a3', text: 'I am the one blowing it up. Drama is content.', personaWeights: { homecomingQueen: 3 } },
      { id: 'q5-a4', text: 'Reply to a message from three hours ago by mistake.', personaWeights: { lostCamper: 3 } }
    ]
  },
  {
    id: 'q6',
    screenId: 'FT-SCR-FINAL-Q6-EVIDENCE-PHOTO',
    prompt: 'Your evidence photo turns out blurry. What now?',
    weight: 1,
    stickyNote: 'TR: "Authenticity is in the eye of the auditor."',
    answers: [
      { id: 'q6-a1', text: 'Retake it. Blur is for amateurs.', personaWeights: { captainClipboard: 3 } },
      { id: 'q6-a2', text: 'Keep it. It\'s "aesthetic" and "mysterious."', personaWeights: { homecomingQueen: 2, bigfoot: 1 } },
      { id: 'q6-a3', text: 'Submitting it as "proof of cryptid activity."', personaWeights: { bigfoot: 3 } },
      { id: 'q6-a4', text: 'I didn\'t even notice. I was looking at a bug.', personaWeights: { lostCamper: 3 } }
    ]
  },
  {
    id: 'q7',
    screenId: 'FT-SCR-FINAL-Q7-LIMITED-TIME-BADGE',
    prompt: 'A limited-time badge is available across town. You:',
    weight: 2,
    highSignal: true,
    trevorVoice: 'TREVOR: "FOMO is a powerful behavioral driver. Use it."',
    answers: [
      { id: 'q7-a1', text: 'Calculate the most efficient route and execute.', personaWeights: { captainClipboard: 3 } },
      { id: 'q7-a2', text: 'Check if there\'s a Cinnabon near the location.', personaWeights: { mallRat: 3 } },
      { id: 'q7-a3', text: 'Post a story asking if anyone wants to carpool.', personaWeights: { homecomingQueen: 3 } },
      { id: 'q7-a4', text: 'Start walking, get distracted by a cool rock.', personaWeights: { lostCamper: 3 } }
    ]
  },
  {
    id: 'q8',
    screenId: 'FT-SCR-FINAL-Q8-CHALLENGE-SIDEWAYS',
    prompt: 'A challenge goes sideways. How do you recover?',
    weight: 2,
    highSignal: true,
    stickyNote: 'TR: "Resilience is the ultimate field asset."',
    answers: [
      { id: 'q8-a1', text: 'Refer to the Bureau Standard Operating Procedure.', personaWeights: { captainClipboard: 3 } },
      { id: 'q8-a2', text: 'Laugh it off. The disaster is better for the zine.', personaWeights: { homecomingQueen: 2, lostCamper: 1 } },
      { id: 'q8-a3', text: 'Disappear into the nearest thicket until it blows over.', personaWeights: { bigfoot: 3 } },
      { id: 'q8-a4', text: 'Improvise. I live in the "sideways" space anyway.', personaWeights: { lostCamper: 2, mallRat: 1 } }
    ]
  }
];

export const TIE_BREAKER_PRIORITY: FieldTypeId[] = [
  'captainClipboard',
  'mallRat',
  'homecomingQueen',
  'lostCamper',
  'bigfoot'
];
