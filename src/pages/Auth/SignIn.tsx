
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Loader2, AlertCircle, Key } from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface SignInProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function SignIn({ onSuccess, onBack }: SignInProps) {
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
    <div className="space-y-8 w-full max-w-sm mx-auto">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-on-surface/5 flex items-center justify-center rounded-full border border-on-surface/10">
          <LogIn className="w-8 h-8 text-on-surface" />
        </div>
        <h1 className="font-display text-4xl uppercase tracking-tighter">Welcome Back</h1>
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 italic">PROFILE_RECOVERY // AUTH_SECURE</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1 text-left">
          <label className="micro-label opacity-40 ml-1">Email_Address</label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder="agent@bureau.net"
            className="bureau-input"
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
              className="text-[8px] uppercase font-bold tracking-widest text-brand-orange hover:underline focus:outline-none"
            >
              Forgot?
            </button>
          </div>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bureau-input"
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 text-error text-[10px] uppercase font-bold tracking-widest"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {resetSent && (
          <div className="flex items-center gap-2 p-3 bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-[10px] uppercase font-bold tracking-widest">
            <Key className="w-4 h-4 shrink-0" />
            Reset instructions sent to your email.
          </div>
        )}

        <div className="pt-4 space-y-3">
          <button 
            type="submit"
            disabled={loading}
            className="w-full bureau-btn bg-on-surface text-paper flex items-center justify-center gap-2 disabled:opacity-20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'RESUME FIELD TRIP'}
          </button>
          
          <button 
            type="button"
            onClick={onBack}
            className="w-full p-4 text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-80 transition-opacity"
          >
            NOT SIGNED UP? GO BACK
          </button>
        </div>
      </form>
    </div>
  );
}
