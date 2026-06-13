import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  AlertCircle,
  StickyNote
} from 'lucide-react';
import { QUIZ_QUESTIONS, PERSONAS } from '../../data/personaQuiz';
import { FieldTypeId, FIELD_TYPES } from '../../constants';
import { PERSONA_AVATAR_PRESETS } from '../../constants/avatarAssets';
import { useApp } from '../../context/AppContext';
import { assignFieldType, getScores } from '../../logic/fieldTypeLogic';

interface PersonaQuizProps {
  onComplete: () => void;
}

export const PersonaQuiz: React.FC<PersonaQuizProps> = ({ onComplete }) => {
  const { profile, updateProfile } = useApp();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Reset scroll to top on question or index changes (highly mobile safe)
  React.useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'instant' as any });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    const rafId = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(rafId);
  }, [questionIndex]);

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
    setShowResult(true);
    setError(null);
    
    try {
      const finalPersona = assignFieldType(finalAnswers, profile?.id);
      const scores = getScores(finalAnswers);

      console.log('[PersonaQuiz] Selected result:', { finalPersona, scores });

      if (finalPersona === 'unclassified') {
        throw new Error('STRATEGIC_AMBIGUITY: HQ could not determine your field type from these responses. Please try adding more contrast to your answers.');
      }

      // Save to profile
      if (profile) {
        const fieldTypeData = FIELD_TYPES[finalPersona as FieldTypeId];
        const avatarPreset = PERSONA_AVATAR_PRESETS[finalPersona] || null;

        const classificationData = {
          fieldType: finalPersona,
          fieldTypeName: fieldTypeData?.name || 'Unclassified',
          fieldClassificationComplete: true,
          fieldTypeQuizCompleted: true,
          fieldTypeScores: scores as any,
          fieldTypeAssignedAt: new Date().toISOString(),
          fieldTypeLastUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Apply avatar preset if it hasn't been modified yet (or just apply as default)
          ...(avatarPreset && { avatar: avatarPreset })
        };

        console.log('[PersonaQuiz] Saving classification fields:', classificationData);
        await updateProfile(profile.id, classificationData);
        console.log('[PersonaQuiz] Save successful.');
      }

      setIsSaving(false);
    } catch (err: any) {
      console.error('Quiz Save Error:', err);
      setError(err.message || 'Bureau servers are unresponsive. Connection failed.');
      setIsSaving(false);
    }
  };

  const renderQuestions = () => {
    // Safety check for empty quiz data
    if (!QUIZ_QUESTIONS || QUIZ_QUESTIONS.length === 0) {
      return (
        <div className="bg-white border-4 border-on-surface p-10 shadow-[12px_12px_0px_black] space-y-6">
          <div className="text-red-500 font-bold text-lg uppercase tracking-tighter italic flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 animate-pulse" />
            DATA_INTEGRITY_FAILURE
          </div>
          <p className="font-serif italic text-xl">"It seems the Bureau rulebook has been misplaced. I can't start the audit without the proper questions."</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-on-surface text-white font-bold uppercase tracking-widest text-xs"
          >
            Re-Sync Protocol
          </button>
        </div>
      );
    }

    const question = QUIZ_QUESTIONS[questionIndex];
    if (!question) return null;

    const progress = ((questionIndex + 1) / QUIZ_QUESTIONS.length) * 100;

    return (
      <div className="space-y-4 md:space-y-6 relative">
        {/* Progress Bar */}
        <div className="h-6 md:h-8 bg-white w-full border-[3px] md:border-4 border-on-surface shadow-[4px_4px_0px_black] md:shadow-[8px_8px_0px_black] overflow-hidden p-1 relative group">
          <motion.div 
            className="h-full bg-brand-orange border border-on-surface shadow-[0_0_15px_var(--color-brand-orange)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-difference pointer-events-none">
             <span className="font-mono text-[9px] md:text-[10px] font-bold uppercase tracking-widest">SYSTEM_SCANNING</span>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 border-2 border-on-surface bg-on-surface text-brand-lime font-bold text-[10px] md:text-[12px] uppercase tracking-wider italic shadow-[2.5px_2.5px_0px_black]">
              SIGNAL_{questionIndex + 1} // {QUIZ_QUESTIONS.length}
            </span>
            {question.highSignal && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-brand-orange animate-ping" />
                <span className="text-[9px] md:text-[10px] font-mono font-extrabold uppercase tracking-widest text-brand-orange italic">High_Signal</span>
              </div>
            )}
          </div>
          <h2 className="persona-question-title font-display uppercase text-on-surface font-bold text-left italic">
            {question.prompt}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-3 md:space-y-4"
            >
              {question.answers.map((answer) => (
                <button
                  key={answer.id}
                  onClick={() => onSelectAnswer(question.id, answer.id)}
                  className="w-full text-left p-4 md:p-6 bg-white border-[3px] md:border-4 border-on-surface hover:bg-brand-lime group transition-all relative overflow-hidden shadow-[4px_4px_0px_black] md:shadow-[10px_10px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 md:active:translate-x-2 md:active:translate-y-2 hover:-translate-y-0.5 min-h-[48px]"
                >
                  <p className="font-mono text-xs sm:text-sm md:text-base font-bold uppercase tracking-normal group-hover:translate-x-1 md:group-hover:translate-x-2 transition-all flex items-center gap-3 italic leading-snug">
                    <span className="w-1.5 h-1.5 bg-on-surface shrink-0 group-hover:bg-brand-orange group-hover:scale-150 transition-all" />
                    {answer.text}
                  </p>
                  <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-20 transition-opacity">
                     <StickyNote className="w-8 h-8 md:w-12 md:h-12 rotate-12" />
                  </div>
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {(question.trevorVoice || question.stickyNote) && (
          <motion.div 
            initial={{ y: 15, opacity: 0, rotate: -1.5 }}
            animate={{ y: 0, opacity: 1, rotate: 1 }}
            className="bg-brand-lime p-4 md:p-6 border-[3px] md:border-4 border-on-surface relative shadow-[6px_6px_0px_rgba(0,0,0,0.05)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={18} className="text-on-surface stroke-[3]" />
              <p className="micro-label font-bold text-on-surface/60 uppercase tracking-widest italic">BUREAU_STAMPED_HV</p>
            </div>
            <p className="font-serif italic text-base sm:text-lg md:text-2xl text-on-surface font-medium leading-relaxed">
              "{question.trevorVoice || question.stickyNote}"
            </p>
          </motion.div>
        )}
      </div>
    );
  };

  const renderResult = () => {
    const finalPersonaId = profile?.fieldType;
    
    if (isSaving || (!finalPersonaId && !error)) {
      return (
        <div className="flex flex-col items-center justify-center space-y-12 py-24">
          <div className="relative">
            <div className="w-32 h-32 border-8 border-brand-lime border-t-brand-orange animate-spin shadow-[12px_12px_0px_black]" />
            <div className="absolute inset-0 flex items-center justify-center">
               <RotateCcw className="text-on-surface animate-reverse-spin opacity-20" size={32} />
            </div>
          </div>
          <div className="text-center space-y-6">
            <h2 className="text-5xl font-display uppercase font-bold animate-pulse tracking-tight italic">Analyzing_Signal</h2>
            <div className="flex flex-col items-center gap-2">
               <p className="micro-label !text-brand-orange tracking-widest font-bold uppercase italic">CRUNCHING_METADATA_HV</p>
               <div className="w-48 h-1 bg-on-surface/5 relative overflow-hidden">
                  <motion.div 
                    className="absolute inset-0 bg-brand-lime"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
               </div>
            </div>
          </div>
        </div>
      );
    }

    if (error && !finalPersonaId) {
      return (
        <div className="flex flex-col items-center justify-center space-y-8 py-20">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center border-4 border-error">
            <AlertCircle size={40} className="text-error" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-display uppercase italic font-bold text-error">System_Failure</h2>
            <p className="micro-label !text-error opacity-60">{error}</p>
          </div>
          <button 
            onClick={() => processFinalResults(answers)}
            className="bureau-btn !bg-error flex items-center gap-2"
          >
            <RotateCcw size={16} />
            <span>Retry Uplink</span>
          </button>
        </div>
      );
    }

    const persona = PERSONAS[finalPersonaId as FieldTypeId] || PERSONAS.theGobbler;
    const stats = FIELD_TYPES[finalPersonaId as FieldTypeId] || FIELD_TYPES.unclassified;

    return (
      <div className="space-y-10 max-w-sm mx-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="bg-white border-4 border-on-surface p-4 shadow-[16px_16px_0px_black]">
            <div className="aspect-[4/3] bg-paper-dark border-4 border-on-surface overflow-hidden relative group">
              <img 
                src={persona.image} 
                alt={persona.name} 
                className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" 
                onError={(e) => {
                  console.error(`[PersonaQuiz] Failed to load character image for ${persona.name}: ${persona.image}`);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                 <h2 className="text-5xl font-display uppercase tracking-tight font-bold leading-tight mb-1">
                   {persona.name}
                 </h2>
                 <p className="p-1 px-2 bg-brand-lime text-black font-bold text-[11px] uppercase tracking-wider inline-block">STATUS: CLASSIFICATION_LOCKED</p>
              </div>
            </div>
          </div>

          <div className="absolute -top-6 -right-6 bg-brand-orange text-white border-4 border-on-surface px-6 py-2 font-display text-2xl font-bold rotate-12 shadow-[4px_4px_0px_black]">
            APPROVED
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white border-4 border-on-surface p-4 shadow-[4px_4px_0px_black]">
              <span className="micro-label !text-[11px] font-bold opacity-60 uppercase tracking-widest mb-1 block">Instinct</span>
              <p className="font-display uppercase text-sm font-bold text-brand-orange truncate">{stats.coreInstinct}</p>
           </div>
           <div className="bg-white border-4 border-on-surface p-4 shadow-[4px_4px_0px_black]">
              <span className="micro-label !text-[11px] font-bold opacity-60 uppercase tracking-widest mb-1 block">Role</span>
              <p className="font-display uppercase text-sm font-bold text-on-surface truncate">{stats.campRole}</p>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-paper-dark p-6 border-l-8 border-on-surface italic shadow-inner">
             <p className="font-serif italic text-2xl leading-relaxed text-on-surface font-medium">
               "{persona.description}"
             </p>
           </div>
           
           <div className="bg-brand-lime p-5 border-4 border-on-surface shadow-[8px_8px_0px_rgba(0,0,0,0.1)] relative">
              <StickyNote size={24} className="text-on-surface opacity-20 absolute top-2 right-2 fill-white/20" />
              <p className="font-mono text-[12px] font-bold uppercase italic text-on-surface tracking-normal text-center leading-relaxed">
                 "{persona.quote}"
              </p>
           </div>
        </div>

        <div className="space-y-4 pt-6">
          <button 
            onClick={onComplete}
            disabled={isSaving}
            className="w-full bg-brand-orange text-white py-8 border-4 border-on-surface shadow-[10px_10px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            <span className="font-display font-bold text-3xl uppercase tracking-tight">APPROVE_BADGE</span>
          </button>
          <p className="micro-label !text-[10px] text-center opacity-50 !tracking-widest font-bold">
            PERMANENT_RECORD // SECTION 88.A
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1">
      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderQuestions()}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {renderResult()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
