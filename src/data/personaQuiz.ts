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
  lostCamper: {
    id: 'lostCamper',
    name: 'Lost Camper',
    campRole: 'The Detour Director',
    coreInstinct: 'Wander / Discover',
    description: 'You have mastered the art of the intentional wrong turn. Serendipity is your only authorized compass, and you find the best metadata where the map ends.',
    vibe: 'Curious, Confused, Lucky',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=400',
    quote: '"I\'m not lost. I\'m identifying a new route to the same destination."'
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
  }
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    screenId: 'FT-SCR-Q1-ATMOSPHERE',
    prompt: 'You\'re in a museum after hours. Where do you gravitate first?',
    weight: 1,
    trevorVoice: 'TREVOR: "Atmosphere is 90% of the audit. Keep your eyes on the exit."',
    answers: [
      { id: 'q1-a1', text: 'The thermostat. I need to verify if HQ\'s optimal humidity levels are being strictly enforced for the statuary.', personaWeights: { captainClipboard: 2, bigfoot: 1 } },
      { id: 'q1-a2', text: 'The gift shop glass. I’m checking if the commemorative tote bags are truly "limited edition" or just a social construct.', personaWeights: { mallRat: 2, mascota: 1 } },
      { id: 'q1-a3', text: 'The center of the atrium. The acoustic resonance is perfect for a spontaneous voguing session to bless the archives.', personaWeights: { mascota: 2, mallRat: 1 } },
      { id: 'q1-a4', text: 'The most expensive-looking velvet rope. I’m leaning against it to see which security guard has the best lighting for my inevitable "interrogated" look.', personaWeights: { elondra: 2, lostCamper: 1 } },
      { id: 'q1-a5', text: 'The janitor\'s closet. I was looking for the exit, but I found a very interesting mop and now I have several urgent questions.', personaWeights: { lostCamper: 2, elondra: 1 } },
      { id: 'q1-a6', text: 'The shadow behind the giant replica sphinx. It’s the highest signal-to-visibility ratio in the entire area.', personaWeights: { bigfoot: 2, captainClipboard: 1 } }
    ]
  },
  {
    id: 'q2',
    screenId: 'FT-SCR-Q2-LOCAL-CHALLENGE',
    prompt: 'A challenge requires you to "interact with a local". Your move?',
    weight: 1,
    stickyNote: 'TR: "Think about your reputation. Or lack thereof."',
    answers: [
      { id: 'q2-a1', text: 'Ask for their official residential status and cross-reference with the HQ District Occupancy Ledger for accuracy.', personaWeights: { captainClipboard: 2, lostCamper: 1 } },
      { id: 'q2-a2', text: 'Offer them a bit of local gossip in exchange for "geographic metadata"—specifically, who has the best public Wi-Fi nearby.', personaWeights: { mallRat: 2, mascota: 1 } },
      { id: 'q2-a3', text: 'Deliver a high-energy high-five. If they reciprocate, the sector is deemed a "Certified Vibe" and I record it in the log.', personaWeights: { mascota: 2, elondra: 1 } },
      { id: 'q2-a4', text: 'Deliver a 45-second dramatic monologue about the "unbearable lightness" of being an auditor until they provide a quote.', personaWeights: { elondra: 2, mallRat: 1 } },
      { id: 'q2-a5', text: 'Ask for directions to the "Second Best" local landmark. I find the primary landmarks to be structurally uninspired.', personaWeights: { lostCamper: 2, bigfoot: 1 } },
      { id: 'q2-a6', text: 'Nod silently from a safe 15-foot distance while taking meticulous notes on their choice of seasonal footwear.', personaWeights: { bigfoot: 2, captainClipboard: 1 } }
    ]
  },
  {
    id: 'q3',
    screenId: 'FT-SCR-Q3-MYSTERY-FLAVOR',
    prompt: 'The snacks at the Field Station are "Mystery Flavor". You:',
    weight: 1,
    trevorVoice: 'TREVOR: "Safety first! Technically."',
    answers: [
      { id: 'q3-a1', text: 'Consult the HQ "Suspicious Snack Ledger" before cataloging the visual texture and weight.', personaWeights: { captainClipboard: 2, bigfoot: 1 } },
      { id: 'q3-a2', text: 'Start a social poll to determine if the flavor is more "Aggressive Grape" or "Desperate Blueberry" before tasting.', personaWeights: { mallRat: 2, mascota: 1 } },
      { id: 'q3-a3', text: 'Eat the whole bag in one go. If it’s a breach of flavor safety protocols, I want it to be a dramatic and highly entertaining event.', personaWeights: { mascota: 2, elondra: 1 } },
      { id: 'q3-a4', text: 'Slowly describe the flavor profile as "bitter with a hint of existential dread" to my audience of admirers.', personaWeights: { elondra: 2, lostCamper: 1 } },
      { id: 'q3-a5', text: 'Relabel them "Ambiguous Citrus" and watch the other auditors experience a mild crisis of reality.', personaWeights: { lostCamper: 2, mallRat: 1 } },
      { id: 'q3-a6', text: 'Place one on an outdoor altar. If the local wildlife avoids it, I deem it "unfit for organic field assets".', personaWeights: { bigfoot: 2, captainClipboard: 1 } }
    ]
  },
  {
    id: 'q4',
    screenId: 'FT-SCR-Q4-SQUAD-GOALS',
    prompt: 'The "Squad Goals" protocol is active. You are:',
    weight: 1,
    stickyNote: 'TR: "Emotional proximity varies by asset ID."',
    answers: [
      { id: 'q4-a1', text: 'The one holding the physical clipboard and pointing out our current coordinates for the mission log.', personaWeights: { captainClipboard: 2, lostCamper: 1 } },
      { id: 'q4-a2', text: 'The one wearing the most context-appropriate streetwear for this specific urban sector.', personaWeights: { mallRat: 2, mascota: 1 } },
      { id: 'q4-a3', text: 'The one in the very center of the photo doing spirit fingers to boost team-wide shimmer and group synergy.', personaWeights: { mascota: 2, elondra: 1 } },
      { id: 'q4-a4', text: 'The one slightly in front, gazing into the distance like a tragic but beautiful protagonist in a high-budget audit.', personaWeights: { elondra: 2, mallRat: 1 } },
      { id: 'q4-a5', text: 'The one who is slightly blurry because I was distracted by a piece of interesting moss during the shutter.', personaWeights: { lostCamper: 2, bigfoot: 1 } },
      { id: 'q4-a6', text: 'The one who is actually taking the photo so my own face remains safely excluded from official Fieldtrip records.', personaWeights: { bigfoot: 2, captainClipboard: 1 } }
    ]
  },
  {
    id: 'q5',
    screenId: 'FT-SCR-Q5-REDACTED-SIGN',
    prompt: 'You find an "Authorized Personnel Only" sign. Your natural instinct?',
    weight: 1,
    trevorVoice: 'TREVOR: "Social signals are high-bandwidth metadata."',
    answers: [
      { id: 'q5-a1', text: 'Note the sign\'s kerning and placement for my "Ineffective Field Signage" audit report.', personaWeights: { captainClipboard: 2, bigfoot: 1 } },
      { id: 'q5-a2', text: 'Wait for someone to walk out and see if I can catch a glimpse of the interior lighting and upholstery.', personaWeights: { mallRat: 2, mascota: 1 } },
      { id: 'q5-a3', text: 'Knock in a syncopated rhythm. If they answer, I\'ll claim I\'m the new unofficial "Morale Consultant".', personaWeights: { mascota: 2, elondra: 1 } },
      { id: 'q5-a4', text: 'Walk straight in with a look of extreme boredom. Raw confidence is the only "authorization" I require.', personaWeights: { elondra: 2, lostCamper: 1 } },
      { id: 'q5-a5', text: 'Wonder if "Authorized" is a state of mind. I do have a name tag, which is a form of authority, technically.', personaWeights: { lostCamper: 2, mallRat: 1 } },
      { id: 'q5-a6', text: 'Record the sound of the activity behind the door from a perfectly concealed vantage point.', personaWeights: { bigfoot: 2, captainClipboard: 1 } }
    ]
  },
  {
    id: 'q6',
    screenId: 'FT-SCR-Q6-REJECTED-REPORT',
    prompt: 'Your field report is rejected for "lack of flair". Your response?',
    weight: 1,
    stickyNote: 'TR: "Authenticity is in the eye of the auditor."',
    answers: [
      { id: 'q6-a1', text: 'Submit a 40-page technical addendum explaining that "flair" is not a measurable Bureau metric.', personaWeights: { captainClipboard: 2, bigfoot: 1 } },
      { id: 'q6-a2', text: 'Ask my crew to "spiritually verify" the original anyway. Metrics are secondary to community consensus.', personaWeights: { mallRat: 2, mascota: 1 } },
      { id: 'q6-a3', text: 'Add fifteen digital lens flares and a background track of synthesized applause before re-submitting.', personaWeights: { mascota: 2, elondra: 1 } },
      { id: 'q6-a4', text: 'Post the rejection letter with a caption about "HQ\'s inability to perceive true narrative genius."', personaWeights: { elondra: 2, lostCamper: 1 } },
      { id: 'q6-a5', text: 'Assume the rejection was a typo and submit a completely different report about a very charismatic bird.', personaWeights: { lostCamper: 2, mallRat: 1 } },
      { id: 'q6-a6', text: 'Delete the report and go off-grid for 48 hours. If they want "flair," they can try to find me.', personaWeights: { bigfoot: 2, captainClipboard: 1 } }
    ]
  },
  {
    id: 'q7',
    screenId: 'FT-SCR-Q7-THUNDERSTORM',
    prompt: 'A thunderstorm hits during a high-stakes mission. You:',
    weight: 2,
    highSignal: true,
    trevorVoice: 'TREVOR: "FOMO is a powerful behavioral driver. Use it."',
    answers: [
      { id: 'q7-a1', text: 'Calculate the delay between flash and bang to determine our safe-zone radius for the audit log.', personaWeights: { captainClipboard: 2, lostCamper: 1 } },
      { id: 'q7-a2', text: 'Sprinting to the nearest department store. If I\'m getting wet, I\'m getting a new raincoat at a discount.', personaWeights: { mallRat: 2, mascota: 1 } },
      { id: 'q7-a3', text: 'Perform a dramatic rain dance to convince the crew that the storm is actually a curated "Mascota Event".', personaWeights: { mascota: 2, elondra: 1 } },
      { id: 'q7-a4', text: 'Leaning against a lamppost while soaking wet, looking like a disillusioned noir detective in a music video.', personaWeights: { elondra: 2, mallRat: 1 } },
      { id: 'q7-a5', text: 'Standing in the middle of the street wondering if the "Authorized Only" stairs are more or less slippery now.', personaWeights: { lostCamper: 2, bigfoot: 1 } },
      { id: 'q7-a6', text: 'Sheltering under a dense canopy and observing how the rain alters the local acoustic environment.', personaWeights: { bigfoot: 2, captainClipboard: 1 } }
    ]
  },
  {
    id: 'q8',
    screenId: 'FT-SCR-Q8-VACATION',
    prompt: 'HQ offers you a "Permanent Vacation" or "Executive Access". You choose:',
    weight: 2,
    highSignal: true,
    stickyNote: 'TR: "Resilience is the ultimate field asset."',
    answers: [
      { id: 'q8-a1', text: 'Executive Access. I want the fancy badge and the override codes for the Fieldtrip mainframe.', personaWeights: { captainClipboard: 2, bigfoot: 1 } },
      { id: 'q8-a2', text: 'Permanent Vacation, as long as it\'s a "long-term investigative lounge" in a city with a high density of public plazas.', personaWeights: { mallRat: 2, mascota: 1 } },
      { id: 'q8-a3', text: 'Executive Clearance, but I’m renaming the boardroom to "The Hype Sanctuary".', personaWeights: { mascota: 2, elondra: 1 } },
      { id: 'q8-a4', text: 'Permanent Vacation. I\'ll stage it as a mysterious disappearance to boost my post-audit influence.', personaWeights: { elondra: 2, mallRat: 1 } },
      { id: 'q8-a5', text: 'Permanent Vacation. I\'ll just keep taking buses until I find a city that feels like a beautiful mistake.', personaWeights: { lostCamper: 2, bigfoot: 1 } },
      { id: 'q8-a6', text: 'Permanent Vacation, provided I can keep my camera and the Bureau promises to archive my existence.', personaWeights: { bigfoot: 2, captainClipboard: 1 } }
    ]
  }
];

export const TIE_BREAKER_PRIORITY: FieldTypeId[] = [
  'captainClipboard',
  'mallRat',
  'mascota',
  'elondra',
  'lostCamper',
  'bigfoot'
];
