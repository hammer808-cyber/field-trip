
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Loader2, AlertCircle, Key } from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

interface SignInProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function SignIn({ onSuccess, onBack }: SignInProps) {
  const { frankieMode, fc } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError('System error during login. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      setError('Error sending reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-sm mx-auto px-4 py-4 md:px-0">
      <div className="text-center space-y-2 md:space-y-4">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-brand-cyan flex items-center justify-center rounded-none border-4 border-on-surface shadow-[4px_4px_0px_black]">
          <LogIn className="w-6 h-6 md:w-8 md:h-8 text-on-surface" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter leading-none pt-4">{fc('Welcome Back!', 'Sign In')}</h1>
        <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-60">{fc('ACCOUNT_RECOVERY // SECURE', 'ACCOUNT RECOVERY')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1 text-left">
          <label className="micro-label opacity-40 ml-1">{fc('Email_Address', 'Email Address')}</label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder="explorer@fieldtrip.com"
            className="bureau-input font-bold"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1 text-left">
          <div className="flex justify-between items-center px-1">
            <label className="micro-label opacity-40">Password</label>
            <button 
              type="button" 
              onClick={handleForgotPassword}
              className="text-[10px] uppercase font-black tracking-widest text-brand-orange hover:underline focus:outline-none"
            >
              {fc('Recover_Password', 'Forgot Password')}
            </button>
          </div>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bureau-input font-bold"
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 bg-error text-white font-black text-[10px] uppercase tracking-widest border-4 border-on-surface shadow-[8px_8px_0px_black]"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}

        {resetSent && (
          <div className="flex items-center gap-3 p-4 bg-brand-lime text-black font-black text-[10px] uppercase tracking-widest border-4 border-on-surface shadow-[8px_8px_0px_black]">
            <Key className="w-5 h-5 shrink-0" />
            Check your email for instructions.
          </div>
        )}

        <div className="pt-4 space-y-4">
          <button 
            type="submit"
            disabled={loading}
            className="w-full bureau-btn bg-on-surface text-white flex items-center justify-center gap-3 disabled:opacity-20 py-6 border-4 border-white/20 shadow-[10px_10px_0px_var(--color-brand-cyan)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : fc('LOG IN', 'SIGN IN')}
          </button>
          
          <button 
            type="button"
            onClick={onBack}
            className="w-full p-4 text-[10px] uppercase font-black tracking-[0.3em] opacity-40 hover:opacity-100 hover:text-brand-orange transition-all"
          >
            &lt; {fc('BACK', 'Back')}
          </button>
        </div>
      </form>
    </div>
  );
}
