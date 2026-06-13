import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FieldClipboardSequence } from '../components/onboarding/FieldClipboardSequence';
import { PersonaQuiz } from '../components/onboarding/PersonaQuiz';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

type ClassificationStep = 'INTRO' | 'QUIZ';

export default function ClassificationPage() {
  const navigate = useNavigate();
  const { profile } = useApp();
  const [step, setStep] = useState<ClassificationStep>('INTRO');

  // Guard: If already complete, go to results
  React.useEffect(() => {
    if (profile?.fieldClassificationComplete) {
      navigate('/field-type');
    }
  }, [profile?.fieldClassificationComplete, navigate]);

  // Reset scroll to top on local step transitions
  React.useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'instant' as any });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    requestAnimationFrame(resetScroll);
  }, [step]);

  const handleSequenceComplete = () => {
    setStep('QUIZ');
  };

  const handleQuizComplete = () => {
    // Navigate to the result screen
    navigate('/field-type');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="page-scroll bg-transparent relative pt-20"
    >
      <div className="relative z-10">
        <AnimatePresence mode="wait">
        {step === 'INTRO' ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <FieldClipboardSequence onComplete={handleSequenceComplete} />
          </motion.div>
        ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full py-12"
          >
            <PersonaQuiz onComplete={handleQuizComplete} />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
