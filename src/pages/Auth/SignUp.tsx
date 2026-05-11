
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Loader2, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { checkUsernameUnique, registerWithAccessCode } from '../../services/authService';
import { cn } from '../../lib/utils';

interface SignUpProps {
  accessCode: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function SignUp({ accessCode, onSuccess, onBack }: SignUpProps) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const validateUsername = (name: string) => {
    if (!name) return null;
    if (name.length < 3 || name.length > 20) return '3-20 characters';
    if (!/^[a-z0-9_]+$/.test(name)) return 'Lowercase, numbers, and underscores only';
    return null;
  };

  const passwordRequirements = [
    { label: '8+ chars', test: (p: string) => p.length >= 8 },
    { label: 'Uppercase', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Lowercase', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Symbol', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  useEffect(() => {
    const checkUsername = async () => {
      const name = formData.username;
      
      if (!name) {
        setUsernameStatus('idle');
        setUsernameError(null);
        return;
      }

      const validationError = validateUsername(name);
      if (validationError) {
        setUsernameStatus('invalid');
        setUsernameError(validationError);
        return;
      }

      setUsernameStatus('checking');
      setUsernameError(null);

      try {
        const isUnique = await checkUsernameUnique(name);
        setUsernameStatus(isUnique ? 'available' : 'taken');
        if (!isUnique) setUsernameError('Username already taken');
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
      }
    };

    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Final Validation
    if (usernameStatus === 'taken') {
      setError('Username is already taken');
      return;
    }
    
    if (usernameStatus === 'invalid' || usernameStatus === 'checking') {
      setError('Please provide a valid username');
      return;
    }

    const allPasswordMet = passwordRequirements.every(req => req.test(formData.password));
    if (!allPasswordMet) {
      setError('Password does not meet requirements');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // 1. Check unique username
      const isUnique = await checkUsernameUnique(formData.username);
      if (!isUnique) {
        throw new Error('USERNAME_TAKEN');
      }

      // 2. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // 3. Register Profile (Atomic Transaction)
      await registerWithAccessCode(
        userCredential.user.uid,
        formData.email,
        formData.username,
        accessCode
      );

      onSuccess();
    } catch (err: any) {
      console.error('Sign up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password too weak.');
      } else if (err.message === 'USERNAME_TAKEN') {
        setError('Username already taken.');
      } else {
        setError('System error during registration. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-sm mx-auto">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-brand-orange/10 flex items-center justify-center rounded-full">
          <UserPlus className="w-8 h-8 text-brand-orange" />
        </div>
        <h1 className="font-display text-4xl uppercase tracking-tighter">Initialize Asset</h1>
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 italic">PROFILE_CREATION // AUTH_SECURE</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1 text-left">
          <label className="micro-label opacity-40 ml-1 flex justify-between">
            <span>Username (unique, lowercase)</span>
            {usernameStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
          </label>
          <div className="relative">
            <input 
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().trim() }))}
              placeholder="recon_agent"
              className={cn(
                "bureau-input pr-10",
                usernameStatus === 'available' && "border-success/50",
                usernameStatus === 'taken' && "border-error/50",
                usernameStatus === 'invalid' && "border-error/50"
              )}
              required
              autoComplete="off"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'available' && <Check className="w-4 h-4 text-success" />}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X className="w-4 h-4 text-error" />}
            </div>
          </div>
          <AnimatePresence>
            {usernameError && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[9px] uppercase font-bold tracking-tighter text-error mt-0.5 ml-1"
              >
                {usernameError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1 text-left">
          <label className="micro-label opacity-40 ml-1">Email_Address</label>
          <input 
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.trim() }))}
            placeholder="agent@bureau.net"
            className="bureau-input"
            required
          />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left relative">
              <label className="micro-label opacity-40 ml-1">Password</label>
              <input 
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="bureau-input pr-10"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-on-surface/40 hover:text-on-surface"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="space-y-1 text-left">
              <label className="micro-label opacity-40 ml-1">Confirm</label>
              <input 
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bureau-input"
                required
              />
            </div>
          </div>

          {formData.password && (
            <div className="grid grid-cols-3 gap-2 px-1">
              {passwordRequirements.map((req, idx) => {
                const met = req.test(formData.password);
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-3 h-3 rounded-full flex items-center justify-center border transition-colors",
                      met ? "bg-success border-success" : "bg-transparent border-on-surface/20"
                    )}>
                      {met && <Check className="w-2 h-2 text-white" />}
                    </div>
                    <span className={cn(
                      "text-[8px] uppercase font-bold tracking-tighter transition-colors",
                      met ? "text-success" : "opacity-30"
                    )}>
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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

        <div className="pt-4 space-y-3">
          <button 
            type="submit"
            disabled={loading}
            className="w-full bureau-btn bg-brand-orange text-white flex items-center justify-center gap-2 disabled:opacity-20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'REGISTER PROFILE'}
          </button>
          
          <button 
            type="button"
            onClick={onBack}
            className="w-full p-4 text-[10px] uppercase font-bold tracking-widest opacity-40"
          >
            Wrong access code? Go Back
          </button>
        </div>
      </form>
    </div>
  );
}
