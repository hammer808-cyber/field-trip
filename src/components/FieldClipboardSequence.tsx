import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, 
  AlertCircle, 
  UserPlus, 
  ChevronRight, 
  RotateCcw, 
  Map as MapIcon, 
  Compass, 
  Trees, 
  ShoppingBag, 
  Crown,
  CheckCircle2,
  StickyNote
} from 'lucide-react';
import { QUIZ_QUESTIONS, PERSONAS, TIE_BREAKER_PRIORITY } from '../data/personaQuiz';
import { FieldTypeId, FIELD_TYPES } from '../constants';
import { QuizScore } from '../types/quiz';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

interface FieldClipboardSequenceProps {
  onComplete: () => void;
}

type ScreenType = 'WELCOME' | 'WARNING' | 'SETUP' | 'QUESTIONS' | 'RESULT';

export const FieldClipboardSequence: React.FC<FieldClipboardSequenceProps> = ({ onComplete }) => {
  const { profile, updateProfile } = useApp();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('WELCOME');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswer = (questionId: string, answerId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    if (questionIndex < QUIZ_QUESTIONS.length - 1) {
      setQuestionIndex(prev => prev + 1);
    } else {
      calculateAndSaveResult();
    }
  };

  const calculateAndSaveResult = async () => {
    // Calculate Scores
    const scores: QuizScore = {
      captainClipboard: 0,
      mallRat: 0,
      homecomingQueen: 0,
      lostCamper: 0,
      bigfoot: 0
    };

    QUIZ_QUESTIONS.forEach(q => {
      const selectedAnswerId = answers[q.id];
      const answer = q.answers.find(a => a.id === selectedAnswerId);
      if (answer) {
        Object.entries(answer.personaWeights).forEach(([personaId, weight]) => {
          scores[personaId as FieldTypeId] += (weight || 0) * q.weight;
        });
      }
    });

    // Handle last answer weight (as it might not be in the state yet from handleAnswer)
    // Actually handleAnswer is called with the final answer before this? 
    // No, I should pass the final answers-map to this function.
  };

  // Revised handleAnswer to include final state check
  const onSelectAnswer = (questionId: string, answerId: string) => {
    const updatedAnswers = { ...answers, [questionId]: answerId };
    setAnswers(updatedAnswers);
    
    if (questionIndex < QUIZ_QUESTIONS.length - 1) {
      setQuestionIndex(prev => prev + 1);
    } else {
      processFinalResults(updatedAnswers);
    }
  };

  const processFinalResults = async (finalAnswers: Record<string, string>) => {
    setIsSaving(true);
    setCurrentScreen('RESULT');
    
    try {
      const scores: QuizScore = {
        captainClipboard: 0,
        mallRat: 0,
        homecomingQueen: 0,
        lostCamper: 0,
        bigfoot: 0
      };

      QUIZ_QUESTIONS.forEach(q => {
        const selectedAnswerId = finalAnswers[q.id];
        const answer = q.answers.find(a => a.id === selectedAnswerId);
        if (answer) {
          Object.entries(answer.personaWeights).forEach(([personaId, weight]) => {
            scores[personaId as FieldTypeId] += (weight || 0) * q.weight;
          });
        }
      });

      // Find winner
      let maxScore = -1;
      let winners: FieldTypeId[] = [];

      Object.entries(scores).forEach(([id, score]) => {
        if (score > maxScore) {
          maxScore = score;
          winners = [id as FieldTypeId];
        } else if (score === maxScore) {
          winners.push(id as FieldTypeId);
        }
      });

      let finalPersona: FieldTypeId = winners[0];

      if (winners.length > 1) {
        // Tie breaker
        finalPersona = TIE_BREAKER_PRIORITY.find(p => winners.includes(p)) || winners[0];
      }

      // Save to profile
      if (profile) {
        const fieldTypeData = FIELD_TYPES[finalPersona];
        await updateProfile(profile.id, {
          fieldType: finalPersona,
          fieldTypeName: fieldTypeData.name,
          fieldClassificationComplete: true,
          fieldTypeQuizCompleted: true,
          fieldTypeScores: scores as any,
          fieldTypeAssignedAt: new Date().toISOString(),
          fieldTypeLastUpdatedAt: new Date().toISOString()
        });
      }

      setIsSaving(false);
    } catch (err) {
      console.error('Quiz Save Error:', err);
      setError('Failed to secure your identity. Bureau servers are unresponsive.');
      setIsSaving(false);
    }
  };

  const renderWelcome = () => (
    <div className="space-y-8" data-ft-screen="FT-SCR-FINAL-WELCOME">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-20 h-20 bg-brand-orange/10 rounded-full flex items-center justify-center border-4 border-brand-orange animate-pulse">
          <ClipboardCheck size={40} className="text-brand-orange" />
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Field_Classification</h1>
        <p className="text-brand-orange font-bold uppercase tracking-widest text-xs">Bureau Protocol 704-B</p>
      </div>

      <div className="bg-neutral-900/50 border border-white/5 p-6 space-y-4 rounded-sm relative">
        <div className="absolute -top-3 -right-3 rotate-12">
          <div className="bg-yellow-400 text-black px-2 py-1 text-[8px] font-black uppercase shadow-lg border border-black/10">
            URGENT
          </div>
        </div>
        <p className="text-sm opacity-80 leading-relaxed italic">
          "Welcome to the Bureau, Cadet. Before we issue your Field Kit, we need to know what kind of asset we\'re dealing with. Standard behavioral mapping is mandatory."
        </p>
        <div className="flex items-center gap-3 pt-2">
          <div className="w-8 h-8 rounded-full bg-brand-orange/20 overflow-hidden border border-brand-orange/40">
            <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Trevor" alt="Trevor" className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange">— TREVOR, CHIEF CAMP COUNSELOR</span>
        </div>
      </div>

      <button 
        onClick={() => setCurrentScreen('WARNING')}
        className="w-full bg-white text-neutral-950 py-4 font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-orange hover:text-white transition-all group"
      >
        <span>Initialize Sequence</span>
        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );

  const renderWarning = () => (
    <div className="space-y-8" data-ft-screen="FT-SCR-FINAL-WARNING">
      <div className="flex items-center gap-4 border-b-4 border-red-600 pb-4">
        <AlertCircle size={48} className="text-red-600 shrink-0" />
        <div>
          <h2 className="text-2xl font-black uppercase text-red-600 italic">Security_Warning</h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest">Protocol 00-RED</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm opacity-80">
          Field Classification is a <span className="text-red-500 font-bold">one-way hashing operation</span>. Once your behavioral persona is locked, your mission parameters and secondary perks will be hard-coded into your identity card.
        </p>
        
        <div className="bg-red-600/5 border border-red-600/20 p-4 rounded-sm">
          <ul className="space-y-3">
            {[
              'Answer instinctively. The static detects hesitation.',
              'Your Field Type dictates your starting equipment.',
              'Identity fraud is a level 4 offense.'
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start text-[10px] uppercase font-bold tracking-tight">
                <span className="text-red-600 shrink-0">[{i+1}]</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setCurrentScreen('WELCOME')}
          className="flex-1 border border-white/10 py-4 font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
        >
          Abort
        </button>
        <button 
          onClick={() => setCurrentScreen('SETUP')}
          className="flex-[2] bg-red-600 text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2"
        >
          Accept & Continue
        </button>
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="space-y-8" data-ft-screen="FT-SCR-FINAL-SETUP">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Calibrating_Sensors</h2>
        <p className="text-[8px] text-brand-orange uppercase tracking-[0.3em] font-black">Environment Preparation Required</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { icon: <Compass className="text-blue-400" />, label: 'Spatial Awareness', desc: 'Active' },
          { icon: <MapIcon className="text-green-400" />, label: 'Regional Dataset', desc: 'Syncing...' },
          { icon: <UserPlus className="text-brand-orange" />, label: 'Identity Hook', desc: 'Waiting' }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-4 bg-neutral-900 border border-white/5 p-4 rounded-sm">
            <div className="p-2 bg-white/5 rounded-full">{item.icon}</div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
              <p className="text-[8px] opacity-40 uppercase">{item.desc}</p>
            </div>
            {i === 0 && <CheckCircle2 size={16} className="text-blue-400" />}
          </div>
        ))}
      </div>

      <div className="bg-brand-orange/10 border border-brand-orange/40 p-4 rounded-sm flex items-start gap-3 italic">
        <StickyNote size={20} className="text-brand-orange shrink-0 animate-bounce" />
        <p className="text-[10px] opacity-80 leading-relaxed">
          "Don\'t worry about the sensors, they mostly measure heart rate and pupil dilation. Just keep your eyes on the clipboard."
        </p>
      </div>

      <button 
        onClick={() => setCurrentScreen('QUESTIONS')}
        className="w-full bg-white text-black py-4 font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        Start Classification
      </button>
    </div>
  );

  const renderQuestions = () => {
    const question = QUIZ_QUESTIONS[questionIndex];
    const progress = ((questionIndex + 1) / QUIZ_QUESTIONS.length) * 100;

    return (
      <div 
        className="space-y-8 relative" 
        data-ft-screen={question.screenId}
        data-ft-question-id={question.id}
        data-ft-weight={question.weight}
        data-ft-trevor-voice={question.trevorVoice}
      >
        {/* Progress Bar */}
        <div className="h-1 bg-white/5 w-full rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-brand-orange"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-2">
          <span className="text-[8px] font-black uppercase tracking-widest bg-brand-orange/20 text-brand-orange px-2 py-1 rounded-sm">
            Signal_{questionIndex + 1} / {QUIZ_QUESTIONS.length}
            {question.highSignal && " [HIGH_SIGNAL]"}
          </span>
          <h2 className="text-2xl font-black italic tracking-tighter leading-tight">
            {question.prompt}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-3"
            >
              {question.answers.map((answer) => (
                <button
                  key={answer.id}
                  onClick={() => onSelectAnswer(question.id, answer.id)}
                  className="w-full text-left p-4 bg-neutral-900 border border-white/5 rounded-sm hover:bg-neutral-800 hover:border-brand-orange group transition-all relative overflow-hidden"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-transparent group-hover:bg-brand-orange transition-all" />
                  <p className="text-xs font-bold opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    {answer.text}
                  </p>
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {(question.trevorVoice || question.stickyNote) && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-yellow-400/10 border-l-4 border-yellow-400 p-4 relative"
          >
            <div className="absolute -top-3 -left-2 rotate-[-5deg]">
               <div className="bg-yellow-400 text-black p-1">
                 <StickyNote size={12} />
               </div>
            </div>
            <p className="text-[10px] italic font-black uppercase text-yellow-400/80 leading-relaxed">
              {question.trevorVoice || question.stickyNote}
            </p>
          </motion.div>
        )}
      </div>
    );
  };

  const renderResult = () => {
    const finalPersonaId = profile?.fieldType;
    if (!finalPersonaId || isSaving) {
      return (
        <div className="flex flex-col items-center justify-center space-y-8 py-20">
          <div className="w-20 h-20 border-4 border-white border-t-brand-orange rounded-full animate-spin" />
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black uppercase italic animate-pulse">Analyzing_Pattern</h2>
            <p className="text-[10px] opacity-40 uppercase tracking-[0.4em]">Crunching_Metadata...</p>
          </div>
        </div>
      );
    }

    const persona = PERSONAS[finalPersonaId] || PERSONAS.lostCamper;
    const stats = FIELD_TYPES[finalPersonaId] || FIELD_TYPES.unclassified;

    return (
      <div className="space-y-8" data-ft-screen={`FT-SCR-FINAL-RESULT-${finalPersonaId}`}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-brand-orange/20 blur-[60px] opacity-20 rounded-full" />
          <div className="relative z-10 border-4 border-white/10 p-2 bg-black overflow-hidden aspect-video">
            <img src={persona.image} alt={persona.name} className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
               <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">
                 {persona.name}
               </h2>
               <p className="text-brand-orange font-black uppercase tracking-[0.2em] text-[10px]">Classification_Locked</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-neutral-900 border border-white/5 p-4 space-y-1">
              <span className="text-[8px] opacity-40 uppercase font-black">Primary_Perk</span>
              <p className="text-[10px] font-black uppercase text-brand-orange">{stats.perk}</p>
           </div>
           <div className="bg-neutral-900 border border-white/5 p-4 space-y-1">
              <span className="text-[8px] opacity-40 uppercase font-black">Regional_Stamp</span>
              <p className="text-[10px] font-black uppercase text-blue-400">{stats.stamp}</p>
           </div>
        </div>

        <div className="space-y-4">
           <p className="text-sm opacity-80 leading-relaxed font-bold italic">
             {persona.description}
           </p>
           <div className="p-4 bg-brand-orange/5 border border-brand-orange/20 rounded-sm">
              <p className="text-xs italic opacity-60">
                 {persona.quote}
              </p>
           </div>
        </div>

        {error && <p className="text-red-500 text-[10px] uppercase font-black text-center">{error}</p>}

        <div className="space-y-3">
          <button 
            onClick={onComplete}
            disabled={isSaving}
            className="w-full bg-brand-orange text-white py-4 font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(226,149,120,0.3)] hover:scale-[1.02] transition-all"
          >
            Claim Identity Card
          </button>
          <p className="text-[8px] opacity-20 uppercase text-center tracking-[0.3em]">
            This classification is permanent under section 88.A
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-black overflow-hidden font-mono text-white p-6 justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen + (currentScreen === 'QUESTIONS' ? questionIndex : '')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {currentScreen === 'WELCOME' && renderWelcome()}
          {currentScreen === 'WARNING' && renderWarning()}
          {currentScreen === 'SETUP' && renderSetup()}
          {currentScreen === 'QUESTIONS' && renderQuestions()}
          {currentScreen === 'RESULT' && renderResult()}
        </motion.div>
      </AnimatePresence>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20">
         <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/20 blur-[100px]" />
         <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 blur-[100px]" />
         {/* Grid lines */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>
    </div>
  );
};
