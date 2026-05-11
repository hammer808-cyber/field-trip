
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { validateAccessCode } from '../../services/authService';
import { cn } from '../../lib/utils';

interface AccessCodeGateProps {
  onSuccess: (code: string) => void;
  onBack: () => void;
}

export default function AccessCodeGate({ onSuccess, onBack }: AccessCodeGateProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-8 w-full max-w-sm mx-auto">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-brand-orange/10 flex items-center justify-center rounded-full">
          <Shield className="w-8 h-8 text-brand-orange" />
        </div>
        <h1 className="font-display text-4xl uppercase tracking-tighter">Enter Clearance</h1>
        <p className="text-xs opacity-50 uppercase tracking-widest font-bold">Beta_Access_Required</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="micro-label opacity-40 ml-1">Access_Code</label>
          <input 
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="FIELD-XXXX-XXXX"
            className={cn(
              "bureau-input text-center text-xl tracking-[0.2em] font-mono",
              error && "border-error text-error"
            )}
            autoFocus
          />
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 text-error text-[10px] uppercase font-bold tracking-widest"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </div>

        <div className="space-y-3">
          <button 
            type="submit"
            disabled={!code || loading}
            className="w-full bureau-btn bg-brand-orange text-white flex items-center justify-center gap-2 disabled:opacity-20 disabled:grayscale transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>VALIDATE CLEARANCE <ArrowRight className="w-5 h-5" /></>}
          </button>
          
          <button 
            type="button"
            onClick={onBack}
            className="w-full p-4 text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </form>

      <div className="notice-card p-4 space-y-2 border-brand-orange/20 bg-brand-orange/[0.02]">
        <p className="text-[10px] uppercase font-mono tracking-tighter opacity-40 leading-relaxed">
          Access codes are single-use artifacts distributed via the Bureau of Recreation. If you do not have a code, you cannot initialize a profile at this time.
        </p>
      </div>
    </div>
  );
}
