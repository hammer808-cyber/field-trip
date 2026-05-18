import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Sticker } from './UI';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Camera, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Scale,
  Hand,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { saveConsent } from '../services/legalService';
import { 
  BETA_TERMS, 
  PRIVACY_SUMMARY, 
  COMMUNITY_RULES, 
  SAFETY_RULES 
} from '../constants/legalContent';

interface BetaAccessGateProps {
  userId: string;
  onAccepted: () => void;
}

type Screen = 'welcome' | 'safety' | 'consent' | 'final';

export function BetaAccessGate({ userId, onAccepted }: BetaAccessGateProps) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);

  // Screen 3 Checkboxes
  const [submissionCheck, setSubmissionCheck] = useState({
    reviewed: false,
    noHarm: false,
    rights: false
  });

  // Screen 4 Checkboxes
  const [finalCheck, setFinalCheck] = useState({
    age: false,
    terms: false,
    privacy: false,
    community: false,
    safety: false
  });

  const handleAccept = async () => {
    setIsSubmitting(true);
    await saveConsent(userId);
    setIsSubmitting(false);
    onAccepted();
  };

  const steps = {
    welcome: (
      <motion.div 
        key="welcome"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-brand-orange/10 flex items-center justify-center rounded-full">
            <Info className="w-8 h-8 text-brand-orange" />
          </div>
          <h1 className="font-display text-4xl uppercase tracking-tighter">You’ve Been Selected</h1>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-sm opacity-60 leading-relaxed">
            Field Trip is currently in an experimental beta phase. Your clearance allows you to help us map the environment, but please be aware:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {['Features may break or change', 'Data may be reset or archived', 'Performance may fluctuate'].map((text, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-on-surface/5 border border-on-surface/5 text-left">
                <div className="w-1.5 h-1.5 bg-brand-orange shrink-0" />
                <span className="text-[10px] uppercase font-bold tracking-widest">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setScreen('safety')}
          className="w-full bureau-btn bg-on-surface text-paper flex items-center justify-center gap-2"
        >
          PROCEED <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    ),

    safety: (
      <motion.div 
        key="safety"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-error/10 flex items-center justify-center rounded-full">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>
          <h1 className="font-display text-4xl uppercase tracking-tighter">The Fine Print</h1>
        </div>

        <div className="notice-card p-6 border-error/20 bg-error/[0.02]">
          <p className="micro-label text-error mb-4 font-bold">MANDATORY_FIELD_CONDUCT</p>
          <ul className="text-xs space-y-3 opacity-80">
            <li className="flex gap-2">
              <span className="text-error font-bold">•</span>
              Do not trespass on private property.
            </li>
            <li className="flex gap-2">
              <span className="text-error font-bold">•</span>
              Never use the app while driving or operating machinery.
            </li>
            <li className="flex gap-2">
              <span className="text-error font-bold">•</span>
              Avoid unsafe areas (cliffs, high traffic, closed zones).
            </li>
            <li className="flex gap-2">
              <span className="text-error font-bold">•</span>
              Respect others' privacy. Do not photograph people without consent.
            </li>
          </ul>
        </div>

        <button 
          onClick={() => setScreen('consent')}
          className="w-full bureau-btn bg-error text-white flex items-center justify-center gap-2"
        >
          ACKNOWLEDGED <CheckCircle2 className="w-4 h-4" />
        </button>
      </motion.div>
    ),

    consent: (
      <motion.div 
        key="consent"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-brand-orange/10 flex items-center justify-center rounded-full">
            <Camera className="w-8 h-8 text-brand-orange" />
          </div>
          <h1 className="font-display text-3xl uppercase tracking-tighter">Evidence Handling</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">PROTOCOL_DATA_HANDLING</p>
        </div>

        <div className="space-y-4">
          {[
            { id: 'reviewed', label: 'I understand my submitted photos and notes may be reviewed.' },
            { id: 'noHarm', label: 'I will not upload private, harmful, illegal, abusive, or unsafe content.' },
            { id: 'rights', label: 'I have the legal right to share everything I submit.' }
          ].map((item) => (
            <label key={item.id} className="flex items-start gap-4 p-4 border-2 border-on-surface/10 cursor-pointer hover:border-brand-orange transition-all group">
              <input 
                type="checkbox"
                checked={submissionCheck[item.id as keyof typeof submissionCheck]}
                onChange={() => setSubmissionCheck(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof submissionCheck] }))}
                className="mt-1 w-5 h-5 accent-brand-orange"
              />
              <span className="text-xs leading-relaxed group-hover:text-brand-orange transition-colors">{item.label}</span>
            </label>
          ))}
        </div>

        <button 
          disabled={!Object.values(submissionCheck).every(Boolean)}
          onClick={() => setScreen('final')}
          className="w-full bureau-btn bg-on-surface text-paper flex items-center justify-center gap-2 disabled:opacity-20 transition-all font-display uppercase tracking-widest"
        >
          NEXT STEP <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    ),

    final: (
      <motion.div 
        key="final"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-on-surface/5 flex items-center justify-center rounded-full">
            <Scale className="w-8 h-8 opacity-40" />
          </div>
          <h1 className="font-display text-4xl uppercase tracking-tighter">Final Clearance</h1>
        </div>

        <div className="space-y-2">
          {[
            { id: 'age', label: 'I am at least 18 years old.' },
            { id: 'terms', label: 'I agree to the Beta Terms.', text: BETA_TERMS, title: 'Beta Terms' },
            { id: 'privacy', label: 'I agree to the Privacy Policy.', text: PRIVACY_SUMMARY, title: 'Privacy Policy' },
            { id: 'community', label: 'I agree to the Community Rules.', text: COMMUNITY_RULES, title: 'Community Rules' },
            { id: 'safety', label: 'I agree to the Safety Rules.', text: SAFETY_RULES, title: 'Safety Rules' }
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-3 border border-on-surface/10 hover:bg-on-surface/5 transition-all">
              <label className="flex items-center gap-4 flex-grow cursor-pointer">
                <input 
                  type="checkbox"
                  checked={finalCheck[item.id as keyof typeof finalCheck]}
                  onChange={() => setFinalCheck(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof finalCheck] }))}
                  className="w-4 h-4 accent-brand-orange"
                />
                <span className="text-[10px] uppercase font-bold tracking-widest">{item.label}</span>
              </label>
              {(item as any).text && (
                <button 
                  onClick={() => setModalContent({ title: (item as any).title, content: (item as any).text })}
                  className="text-[8px] uppercase font-bold tracking-widest text-brand-orange hover:underline shrink-0"
                >
                  View
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="Notice p-4 bg-paper rounded-xl border-2 border-on-surface shadow-[8px_8px_0px_#f4d35e]">
          <p className="text-[8px] font-mono opacity-40 leading-none mb-2">AUTH_TOKEN: 0x8891-BETA</p>
          <button 
            disabled={!Object.values(finalCheck).every(Boolean) || isSubmitting}
            onClick={handleAccept}
            className="w-full py-4 bg-brand-orange text-white font-display text-xl uppercase tracking-tighter hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale"
          >
            {isSubmitting ? 'AUTHORIZING...' : 'ENTER THE FIELD'}
          </button>
        </div>
      </motion.div>
    )
  };

  return (
    <div className="fixed inset-0 z-[200] bg-paper flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-md w-full py-12">
        <div className="flex justify-center mb-12">
          <div className="flex gap-2">
            {(['welcome', 'safety', 'consent', 'final'] as const).map((s) => (
              <div 
                key={s} 
                className={cn(
                  "h-1 w-8 transition-all",
                  screen === s ? "bg-brand-orange w-12" : "bg-on-surface/10"
                )} 
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {steps[screen]}
        </AnimatePresence>
      </div>

      {/* Legal Modal */}
      <AnimatePresence>
        {modalContent && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-paper w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border-2 border-on-surface"
            >
              <div className="p-4 border-b-2 border-on-surface flex items-center justify-between bg-on-surface/5">
                <h2 className="font-display text-xl uppercase tracking-tighter">{modalContent.title}</h2>
                <button 
                  onClick={() => setModalContent(null)}
                  className="p-1 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto bg-paper flex-grow">
                <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed opacity-80">
                  {modalContent.content}
                </div>
              </div>
              <div className="p-4 border-t-2 border-on-surface bg-on-surface/5 text-right">
                <button 
                  onClick={() => setModalContent(null)}
                  className="px-6 py-2 bg-on-surface text-paper font-display uppercase tracking-widest text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
