import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FieldClipboardSequence } from '../components/onboarding/FieldClipboardSequence';
import { PersonaQuiz } from '../components/onboarding/PersonaQuiz';
import { motion, AnimatePresence } from 'motion/react';

type QuizStep = 'INTRO' | 'QUIZ';

export default function Quiz() {
  const navigate = useNavigate();
  const [step, setStep] = useState<QuizStep>('INTRO');

  // Reset scroll on step changes
  React.useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'instant' as any });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    const rafId = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(rafId);
  }, [step]);

  const handleSequenceComplete = () => {
    setStep('QUIZ');
  };

  const handleQuizComplete = () => {
    navigate('/field-type');
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 'INTRO' ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <FieldClipboardSequence onComplete={handleSequenceComplete} />
          </motion.div>
        ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="w-full"
          >
            <PersonaQuiz onComplete={handleQuizComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
