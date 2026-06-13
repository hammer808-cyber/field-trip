import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Compass, 
  Users, 
  Scale, 
  X, 
  CheckCircle2, 
  ChevronRight,
  BookOpen,
  ArrowRight
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

export function BetaAccessGate({ userId, onAccepted }: BetaAccessGateProps) {
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);

  const handleAccept = async () => {
    if (!consentChecked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await saveConsent(userId);
      onAccepted();
    } catch (error) {
      console.error("[BetaAccessGate] Error saving consent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bulletPoints = [
    {
      id: 'age',
      icon: <Users className="w-5 h-5 text-brand-orange shrink-0 stroke-[2.5]" />,
      text: "You are 18 or older."
    },
    {
      id: 'posts',
      icon: <Compass className="w-5 h-5 text-brand-orange shrink-0 stroke-[2.5]" />,
      text: "You understand Fieldtrip involves optional public/community posts."
    },
    {
      id: 'conduct',
      icon: <ShieldCheck className="w-5 h-5 text-brand-orange shrink-0 stroke-[2.5]" />,
      text: "You agree to participate safely and respectfully."
    },
    {
      id: 'laws',
      icon: <Scale className="w-5 h-5 text-brand-orange shrink-0 stroke-[2.5]" />,
      text: "You agree to the Terms & Conditions, Privacy Policy, and Community Guidelines."
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-paper flex items-center justify-center p-4 overflow-y-auto">
      {/* Visual background lines to keep consistent with the Fieldtrip aesthetic */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
        <div className="absolute top-10 left-10 text-huge rotate-12">REPORT</div>
        <div className="absolute bottom-20 right-10 text-huge -rotate-45">0704-B</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-on-surface rotate-45" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-on-surface -rotate-45" />
      </div>

      <div className="max-w-md w-full py-6 md:py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-4 border-on-surface p-6 md:p-8 space-y-6 shadow-[12px_12px_0px_rgba(0,0,0,1)] rounded-2xl"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="font-display text-4xl uppercase tracking-tighter text-on-surface font-black italic">
              Before We Wander Off
            </h1>
            <p className="text-xs text-on-surface/70 leading-relaxed font-serif italic">
              Fieldtrip is a social photo-based adventure game. Before you start, please confirm the basics:
            </p>
          </div>

          {/* Key Agreements List */}
          <div className="space-y-3 pt-2">
            {bulletPoints.map((bp) => (
              <div 
                key={bp.id} 
                className="flex items-start gap-4 p-3.5 bg-on-surface/[0.02] border-2 border-on-surface/10 rounded-xl hover:bg-on-surface/[0.04] transition-colors"
              >
                {bp.icon}
                <span className="text-xs font-serif font-bold text-on-surface/90 leading-relaxed italic">
                  {bp.text}
                </span>
              </div>
            ))}
          </div>

          {/* Policy Links Grid */}
          <div className="border-t border-b border-on-surface/10 py-4">
            <p className="text-[10px] uppercase font-mono tracking-wider text-on-surface/40 text-center mb-3">
              Review Official Documents
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalContent({ title: 'Terms & Conditions', content: BETA_TERMS })}
                className="py-2.5 px-3 border border-on-surface/10 bg-on-surface/[0.02] hover:bg-on-surface/5 hover:border-on-surface/25 text-left rounded-lg text-[10px] font-mono uppercase tracking-wider text-on-surface flex items-center justify-between transition-all"
              >
                <span>Terms & T&C</span>
                <ChevronRight className="w-3   h-3 text-brand-orange" />
              </button>
              <button
                type="button"
                onClick={() => setModalContent({ title: 'Privacy Policy', content: PRIVACY_SUMMARY })}
                className="py-2.5 px-3 border border-on-surface/10 bg-on-surface/[0.02] hover:bg-on-surface/5 hover:border-on-surface/25 text-left rounded-lg text-[10px] font-mono uppercase tracking-wider text-on-surface flex items-center justify-between transition-all"
              >
                <span>Privacy Policy</span>
                <ChevronRight className="w-3   h-3 text-brand-orange" />
              </button>
              <button
                type="button"
                onClick={() => setModalContent({ title: 'Community Rules', content: COMMUNITY_RULES })}
                className="py-2.5 px-3 border border-on-surface/10 bg-on-surface/[0.02] hover:bg-on-surface/5 hover:border-on-surface/25 text-left rounded-lg text-[10px] font-mono uppercase tracking-wider text-on-surface flex items-center justify-between transition-all"
              >
                <span>Community Rules</span>
                <ChevronRight className="w-3   h-3 text-brand-orange" />
              </button>
              <button
                type="button"
                onClick={() => setModalContent({ title: 'Safety & Participation', content: SAFETY_RULES })}
                className="py-2.5 px-3 border border-on-surface/10 bg-on-surface/[0.02] hover:bg-on-surface/5 hover:border-on-surface/25 text-left rounded-lg text-[10px] font-mono uppercase tracking-wider text-on-surface flex items-center justify-between transition-all"
              >
                <span>Safety Notice</span>
                <ChevronRight className="w-3   h-3 text-brand-orange" />
              </button>
            </div>
          </div>

          {/* Unified Checkbox */}
          <label className="flex items-start gap-4 p-4 border-2 border-on-surface/20 hover:border-brand-orange bg-on-surface/[0.01] hover:bg-brand-orange/[0.02] transition-colors rounded-xl cursor-pointer group">
            <input 
              id="legal-agreement-checkbox"
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 w-5 h-5 accent-brand-orange cursor-pointer"
            />
            <span className="text-xs font-serif font-bold italic leading-relaxed text-on-surface/95 select-none transition-colors group-hover:text-brand-orange">
              I confirm that I am 18 or older, I have read and agree to the Terms & Conditions, Privacy Policy, and community participation guidelines.
            </span>
          </label>

          {/* Action Button CTA */}
          <button 
            disabled={!consentChecked || isSubmitting}
            onClick={handleAccept}
            className={cn(
              "w-full py-4 bg-brand-orange text-white border-2 border-on-surface font-display text-xl font-black uppercase italic shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all rounded-2xl flex items-center justify-center gap-2",
              (!consentChecked || isSubmitting) && "opacity-30 pointer-events-none cursor-not-allowed"
            )}
          >
            <span>{isSubmitting ? "AUTHORIZING..." : "Agree & Continue"}</span>
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </motion.div>
      </div>

      {/* Policy Details pop-up modal */}
      <AnimatePresence>
        {modalContent && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-paper w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border-4 border-on-surface rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b-2 border-on-surface flex items-center justify-between bg-on-surface/[0.04]">
                <h2 className="font-display text-xl uppercase tracking-tighter font-black italic">{modalContent.title}</h2>
                <button 
                  onClick={() => setModalContent(null)}
                  className="p-1 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 md:p-8 overflow-y-auto bg-paper flex-grow">
                <div className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed text-on-surface/80">
                  {modalContent.content}
                </div>
              </div>
              <div className="p-4 border-t-2 border-on-surface bg-on-surface/[0.04] text-right">
                <button 
                  onClick={() => setModalContent(null)}
                  className="px-6 py-2.5 bg-on-surface text-paper font-display uppercase tracking-widest text-xs font-bold font-black italic border border-on-surface rounded-xl hover:bg-on-surface/90 active:scale-[0.98] transition-all"
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
