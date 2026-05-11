import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { PersonaId, PERSONAS } from '../constants';
import { Card } from '../components/UI';
import { Bed, Megaphone, Clipboard, Dices, Hammer } from 'lucide-react';
import { cn } from '../lib/utils';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

interface Question {
  id: number;
  text: string;
  options: {
    text: string;
    persona: PersonaId;
    icon: any;
    label: string;
  }[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Your favorite way to spend a Saturday afternoon?",
    options: [
      { text: "Curled up under a heavy blanket", persona: "house-goblin", icon: Bed, label: "Comfort Level: Max" },
      { text: "Hosting a loud, chaotic dinner", persona: "social-menace", icon: Megaphone, label: "Volume Level: 11" },
      { text: "Finding a way into a private club", persona: "soft-criminal", icon: Clipboard, label: "Access: Restricted" },
      { text: "Flipping a coin for my next move", persona: "wild-card", icon: Dices, label: "Logic: Random" },
      { text: "Rearranging my entire living room", persona: "static-breaker", icon: Hammer, label: "State: Flux" },
    ]
  },
  {
    id: 2,
    text: "What's the best kind of 'trouble'?",
    options: [
      { text: "Eating breakfast food for dinner", persona: "house-goblin", icon: Bed, label: "Risk: Low" },
      { text: "Answering 'Yes' to literally everything", persona: "wild-card", icon: Dices, label: "Risk: Unknown" },
      { text: "Organizing an unsanctioned street race", persona: "social-menace", icon: Megaphone, label: "Risk: High" },
      { text: "Borrowing a traffic cone for 'art'", persona: "soft-criminal", icon: Clipboard, label: "Risk: Medium" },
      { text: "Starting a new hobby at 3 AM", persona: "static-breaker", icon: Hammer, label: "Risk: Sleep-deprived" },
    ]
  },
  {
    id: 3,
    text: "Pick an 'official' tool for your missions:",
    options: [
      { text: "A very long, soft scarf", persona: "house-goblin", icon: Bed, label: "Spec: Cozy" },
      { text: "A megaphone that only plays sirens", persona: "social-menace", icon: Megaphone, label: "Spec: Loud" },
      { text: "A folder labeled 'Tax Documents'", persona: "soft-criminal", icon: Clipboard, label: "Spec: Invisible" },
      { text: "A d20 that you roll for every decision", persona: "wild-card", icon: Dices, label: "Spec: Fate" },
      { text: "A master key to your own habits", persona: "static-breaker", icon: Hammer, label: "Spec: Freedom" },
    ]
  },
  {
    id: 4,
    text: "How do you handle a long queue?",
    options: [
      { text: "I don't. I go home immediately.", persona: "house-goblin", icon: Bed, label: "Action: Retreat" },
      { text: "I start a communal singalong.", persona: "social-menace", icon: Megaphone, label: "Action: Lead" },
      { text: "I act like the manager's cousin.", persona: "soft-criminal", icon: Clipboard, label: "Action: Infiltrate" },
      { text: "I roll the dice to see if I stay.", persona: "wild-card", icon: Dices, label: "Action: Randomize" },
      { text: "I walk the other way just to see what's there.", persona: "static-breaker", icon: Hammer, label: "Action: Diverge" },
    ]
  },
  {
    id: 5,
    text: "What's your ultimate field trip goal?",
    options: [
      { text: "Finding a secret reading nook", persona: "house-goblin", icon: Bed, label: "Target: Sanctuary" },
      { text: "Making 50 strangers take a selfie", persona: "social-menace", icon: Megaphone, label: "Target: Viral" },
      { text: "Getting into the 'Staff Only' lounge", persona: "soft-criminal", icon: Clipboard, label: "Target: Restricted" },
      { text: "Ending up in a different city by accident", persona: "wild-card", icon: Dices, label: "Target: Anywhere" },
      { text: "Breaking every rule I set for myself", persona: "static-breaker", icon: Hammer, label: "Target: Evolution" },
    ]
  }
];

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<PersonaId, number>>({
    'house-goblin': 0,
    'social-menace': 0,
    'soft-criminal': 0,
    'static-breaker': 0,
    'wild-card': 0
  });
  const { setPersona } = useApp();
  const { skin } = useTheme();
  const navigate = useNavigate();

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  const handleSelect = async (personaId: PersonaId) => {
    const newScores = { ...scores, [personaId]: scores[personaId] + 1 };
    setScores(newScores);
    
    if (step === QUESTIONS.length - 1) {
      const winner = Object.entries(newScores).reduce((a, b) => a[1] > b[1] ? a : b)[0] as PersonaId;
      await setPersona(winner);
      navigate('/persona');
    } else {
      setStep(s => s + 1);
    }
  };

  const currentQ = QUESTIONS[step];
  const shuffledOptions = useMemo(() => shuffle(currentQ.options), [currentQ]);

  return (
    <div className={cn(
      "min-h-screen p-6 space-y-12 max-w-4xl mx-auto relative overflow-hidden",
      isBaja ? "bg-baja-sand text-baja-pink" : 
      isDiamond ? "bg-black text-white" :
      isHeat ? "bg-heat-yellow text-white" : ""
    )}>
      {isBaja && (
        <>
          <Hibiscus className="absolute top-10 right-[-40px] w-64 h-64 opacity-10 -z-10" />
          <ChromeStar className="absolute bottom-20 left-10 w-12 h-12 opacity-30 -z-10" />
        </>
      )}

      {isDiamond && (
        <>
          <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
          <DiamondStar className="absolute top-1/4 right-0 w-32 h-32 text-white opacity-10 -z-10" />
          <Sparkle className="absolute bottom-1/4 left-0 w-8 h-8 text-white opacity-20 -z-10 animate-pulse" />
        </>
      )}

      {isHeat && (
        <>
          <SunFlare className="absolute top-0 right-[-50px] w-64 h-64" />
          <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-heat-pink rounded-full blur-[120px] opacity-20 -z-10" />
        </>
      )}

      <header className="flex justify-between items-center py-4 relative z-10">
        <h1 className={cn(
          "text-2xl italic skew-title", 
          isBaja ? "text-baja-pink font-display uppercase font-normal" : 
          isDiamond ? "liquid-chrome bg-clip-text text-transparent font-black" :
          isHeat ? "text-white font-display uppercase shadow-sm" :
          "text-on-surface font-display uppercase tracking-widest font-black"
        )}>{isBaja ? 'Field Trip' : 'BUREAU_RECRUITMENT'}</h1>
        <div className="flex flex-col items-end">
           <span className="micro-label">SERVICE_ID: FT-08-41</span>
           <span className="text-[8px] font-mono opacity-40">FORM_B.112_REACTION_MGMT</span>
        </div>
      </header>

      <section className="space-y-6 relative z-10">
        <div className="flex items-center gap-2">
           <div className="bureau-tag bg-brand-orange text-white text-[10px]">ELIGIBILITY_EVALUATION</div>
           <p className={cn(
            "font-accent micro-label font-bold",
            isBaja ? "text-baja-pink" : isDiamond ? "text-diamond-silver" : isHeat ? "text-heat-pink font-display" : "text-on-surface/60"
          )}>{isBaja ? 'Preliminary Assessment' : 'PSYCHOLOGICAL_ORIENTATION'}</p>
        </div>
        <h2 className={cn(
          "text-huge leading-none tracking-tighter",
          isBaja ? "text-baja-pink font-normal" : isDiamond ? "text-white font-mono uppercase tracking-[0.2em] font-light" : isHeat ? "text-white font-display uppercase tracking-tight shadow-md" : "text-on-surface uppercase font-black"
        )}>
          {currentQ.text}
        </h2>
        <div className={cn(
          "h-px relative w-full",
          isBaja ? "bg-baja-pink" : isDiamond ? "bg-white/20" : isHeat ? "bg-white" : "bg-on-surface/10"
        )}>
           <div className="absolute right-0 top-1 micro-label opacity-30">RESPONSE_REQUIRED</div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {shuffledOptions.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(opt.persona)}
            className={cn(
              "text-left group transition-all active:scale-[0.98]",
              i === 4 && "md:col-span-2"
            )}
          >
            <div className={cn(
              "relative transition-all h-full p-6 border-4 shadow-md",
              isBaja ? "bg-white border-baja-pink rounded-3xl" : 
              isDiamond ? "bg-white/5 border-white/10 hover:border-white rounded-none" :
              isHeat ? "bg-white border-white rounded-[2.5rem] hover:rotate-2 shadow-lg" :
              "notice-card flex-row p-6 hover:bg-neutral-50"
            )}>
              {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.1 : 0.2} />}
              <div className="flex justify-between items-start w-full">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                     {!isBaja && !isDiamond && !isHeat && <div className="w-1.5 h-1.5 bg-brand-orange" />}
                     <span className={cn(
                      "micro-label uppercase tracking-wider",
                      isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-heat-mango" : "text-on-surface/40"
                    )}>
                      {opt.label}
                    </span>
                  </div>
                  <h3 className={cn(
                    "text-2xl transition-all leading-tight",
                    isBaja ? "text-baja-pink group-hover:text-baja-aqua font-display uppercase font-normal" : 
                    isDiamond ? "text-white font-mono group-hover:text-diamond-blue" :
                    isHeat ? "text-heat-pink font-display uppercase" :
                    "text-on-surface font-display uppercase tracking-tight font-black group-hover:text-brand-orange"
                  )}>{opt.text}</h3>
                </div>
                <opt.icon className={cn(
                  "w-6 h-6 transition-colors", 
                  isBaja ? "text-baja-aqua" : isDiamond ? "text-white" : isHeat ? "text-heat-mango" : "text-on-surface-variant group-hover:text-brand-orange"
                )} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <footer className="flex flex-col items-center gap-6 pt-12 pb-24 relative z-10">
        <div className="flex gap-4">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={cn(
              "h-1 transition-all",
              i === step 
                ? (isBaja ? "w-12 bg-baja-pink" : isDiamond ? "w-12 bg-white" : isHeat ? "w-12 bg-white" : "w-12 bg-brand-orange") 
                : (isBaja ? "w-8 bg-baja-pink/20" : isDiamond ? "w-8 bg-white/10" : isHeat ? "w-8 bg-white/40" : "w-8 bg-on-surface/10")
            )} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
           <p className={cn("micro-label font-bold uppercase tracking-widest", isBaja && "text-baja-pink")}>EVALUATION_PHASE {step + 1} OF {QUESTIONS.length}</p>
           {!isBaja && !isDiamond && !isHeat && <p className="text-[10px] font-mono opacity-40">CALIBRATING_PERSONA_INDEX...</p>}
        </div>
      </footer>
    </div>
  );
}
