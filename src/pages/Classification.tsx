import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonaQuiz } from '../components/onboarding/PersonaQuiz';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

export default function ClassificationPage() {
  const navigate = useNavigate();
  const { profile } = useApp();

  React.useEffect(() => {
    if (profile?.fieldClassificationComplete) {
      navigate('/field-type');
    }
  }, [profile?.fieldClassificationComplete, navigate]);

  const handleQuizComplete = () => {
    navigate('/field-type');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="page-scroll bg-transparent relative px-4 py-8 sm:py-12"
    >
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <PersonaQuiz onComplete={handleQuizComplete} />
      </div>
    </motion.div>
  );
}
