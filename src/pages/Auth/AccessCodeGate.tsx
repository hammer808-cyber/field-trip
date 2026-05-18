
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { validateAccessCode } from '../../services/authService';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

interface AccessCodeGateProps {
  onSuccess: (code: string) => void;
  onBack: () => void;
}

export default function AccessCodeGate({ onSuccess, onBack }: AccessCodeGateProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { frankieMode, fc } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    setError(null);

    const result = await validateAccessCode(code);
    if (result.valid) {
      onSuccess(code);
    } else {
      setError(result.error || 'INVALID_CODE');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-sm mx-auto px-4 py-4 md:px-0">
      <div className="text-center space-y-2 md:space-y-4">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-brand-lime flex items-center justify-center rounded-none border-4 border-on-surface shadow-[4px_4px_0px_black]">
          <Shield className="w-6 h-6 md:w-8 md:h-8 text-on-surface" />
        </div>
        <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter leading-none pt-4 font-black italic">{fc('Access_Code', 'Access Code')}</h1>
        <p className="text-[10px] opacity-100 font-bold uppercase tracking-[0.4em] bg-brand-lime inline-block px-2 border border-on-surface">{fc('Beta_Credential_Required', 'INVITATION REQUIRED')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="space-y-2">
          <label className="micro-label opacity-40 ml-1">{fc('VIBE CHECK', 'CODE')}</label>
          <input 
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="FIELD-TRIP-XXXX"
            className={cn(
              "bureau-input text-center text-xl tracking-[0.2em] font-mono font-black",
              error && "border-error text-error bg-error/5"
            )}
            autoFocus
          />
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-4 bg-error text-white font-black text-[10px] uppercase tracking-widest border-2 border-on-surface shadow-[4px_4px_0px_black]"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {fc('ERROR: ', '')}{error}
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <button 
            type="submit"
            disabled={!code || loading}
            className="w-full bureau-btn-huge group"
          >
            <div className="flex items-center justify-center gap-4">
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <>{fc('AUTH_CLEARANCE', 'ENTER')} <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" /></>}
            </div>
          </button>
          
          <button 
            type="button"
            onClick={onBack}
            className="w-full p-6 text-[11px] uppercase font-black tracking-[0.4em] opacity-40 hover:opacity-100 hover:text-brand-orange transition-all font-mono"
          >
            &lt; {fc('RETURN_TO_ENTRY_POINT', 'BACK')}
          </button>
        </div>
      </form>

      <div className="bureau-panel p-6 border-4 border-on-surface bg-white shadow-[8px_8px_0px_var(--color-brand-cyan)]">
        <p className="text-[11px] uppercase font-mono font-bold tracking-tight opacity-80 leading-relaxed text-left">
          Access codes are single-use invites distributed via Fieldtrip HQ. If you do not have a code, your invitation is pending.
        </p>
      </div>
    </div>
  );
}
