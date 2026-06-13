import React, { useState, useEffect } from 'react';
import { Share, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';

export function IOSHomeScreenPrompt() {
  const { isIOS, isStandalone } = useApp();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show if iOS, not standalone, and haven't dismissed it this session
    if (isIOS && !isStandalone) {
      const dismissed = sessionStorage.getItem('ios_pwa_prompt_dismissed');
      if (!dismissed) {
        // Delay slightly for better UX
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isIOS, isStandalone]);

  const dismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('ios_pwa_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[100]"
        >
          <div className="bg-white border-[3px] border-on-surface p-5 rounded-2xl shadow-[8px_8px_0px_black] relative overflow-hidden">
            <button 
              onClick={dismiss}
              className="absolute top-2 right-2 p-1 text-on-surface/40 hover:text-on-surface"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 bg-brand-lime border-2 border-on-surface rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_black]">
                <Plus className="w-6 h-6 text-on-surface" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-black uppercase italic text-sm tracking-tight leading-none">
                  Install Fieldtrip
                </h4>
                <p className="text-[10px] font-sans font-medium text-on-surface/70 leading-tight">
                  Tap <Share className="w-3 h-3 inline pb-0.5" /> then <span className="font-bold">"Add to Home Screen"</span> for the full experience.
                </p>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-lime" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
