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
      className="min-h-screen bg-white relative overflow-x-hidden pt-20 pb-32"
    >
      {/* HV-LE Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" 
           style={{ 
             backgroundImage: 'linear-gradient(var(--color-on-surface) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--color-on-surface) 1.5px, transparent 1.5px)', 
             backgroundSize: '40px 40px' 
           }} 
      />
      
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
