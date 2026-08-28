
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { validateAccessCode } from '../../services/authService';
import { cn } from '../../lib/utils';

interface AccessCodeGateProps {
  onSuccess: (code: string) => void;
  onBack: () => void;
}

function toHumanAccessError(raw?: string | null): string {
  const message = String(raw || '').toUpperCase();
  if (!message) return "That code didn't work. Check it and try again.";
  if (
    message.includes('CONNECTIVITY')
    || message.includes('UNREACHABLE')
    || message.includes('MALFORMED')
    || message.includes('EMPTY_RESPONSE')
    || message.includes('OUT_OF_SYNC')
    || message.includes('ENDPOINT_NOT_FOUND')
    || message.includes('AUTH_PROTOCOL_ERROR')
  ) {
    return "We couldn't check your code. Try again.";
  }
  if (message.includes('EXHAUSTED') || message.includes('MAXIMUM')) {
    return 'This invite code has already been used up.';
  }
  if (message.includes('INACTIVE')) {
    return 'This invite code is no longer active.';
  }
  if (message.includes('INVALID') || message.includes('SPELLING') || message.includes('NOT_FOUND')) {
    return "That code didn't work. Check it and try again.";
  }
  return "That code didn't work. Check it and try again.";
}

export default function AccessCodeGate({ onSuccess, onBack }: AccessCodeGateProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter your invite code first.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await validateAccessCode(trimmed);
    if (result.valid) {
      onSuccess(trimmed);
    } else {
      setError(toHumanAccessError(result.error));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-sm mx-auto px-4 py-4 md:px-0">
      <div className="text-center space-y-2 md:space-y-4">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-brand-lime flex items-center justify-center rounded-none border-4 border-on-surface shadow-[4px_4px_0px_black]">
          <Shield className="w-6 h-6 md:w-8 md:h-8 text-on-surface" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter leading-none pt-4 font-black italic">
          Enter your invite code
        </h1>
        <p className="text-sm font-sans font-bold text-on-surface/70 leading-snug">
          Fieldtrip is invite-only during beta.
        </p>
        <p className="text-[10px] opacity-100 font-bold uppercase tracking-[0.4em] bg-brand-lime inline-block px-2 border border-on-surface">
          BETA CLEARANCE
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="space-y-2">
          <label className="micro-label opacity-60 ml-1" htmlFor="invite-code-input">Invite code</label>
          <input 
            id="invite-code-input"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            placeholder="FIELD-TRIP-XXXX"
            className={cn(
              "bureau-input text-center text-xl tracking-[0.2em] font-mono font-black",
              error && "border-error text-error bg-error/5"
            )}
            autoFocus
            autoComplete="one-time-code"
          />
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-4 bg-error text-white font-bold text-sm leading-snug border-2 border-on-surface shadow-[4px_4px_0px_black]"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <button 
            type="submit"
            disabled={loading}
            className="w-full bureau-btn-huge group disabled:opacity-60"
          >
            <div className="flex items-center justify-center gap-4">
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <>Continue <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" /></>}
            </div>
          </button>
          
          <button 
            type="button"
            onClick={onBack}
            className="w-full p-6 text-[11px] uppercase font-black tracking-[0.4em] opacity-40 hover:opacity-100 hover:text-brand-orange transition-all font-mono"
          >
            &lt; Back
          </button>
        </div>
      </form>

      <div className="bureau-panel p-6 border-4 border-on-surface bg-white shadow-[8px_8px_0px_var(--color-brand-cyan)]">
        <p className="text-[11px] font-sans font-bold tracking-tight opacity-80 leading-relaxed text-left">
          Need a code? Ask the person who invited you.
        </p>
        <p className="mt-2 text-[9px] uppercase font-mono font-bold tracking-widest opacity-40 text-left">
          Fieldtrip HQ // single-use invites
        </p>
      </div>
    </div>
  );
}
