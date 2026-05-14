import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FieldClipboardSequence } from '../components/FieldClipboardSequence';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

export default function ClassificationPage() {
  const navigate = useNavigate();
  const { profile } = useApp();

  const handleComplete = () => {
    // Navigate to profile or a designated "Welcome" screen for the persona
    navigate('/profile');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-black overflow-x-hidden"
    >
      <FieldClipboardSequence onComplete={handleComplete} />
    </motion.div>
  );
}
