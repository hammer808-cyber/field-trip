
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Loader2, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { checkUsernameUnique, registerWithAccessCode } from '../../services/authService';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

interface SignUpProps {
  accessCode: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function SignUp({ accessCode, onSuccess, onBack }: SignUpProps) {
  const { frankieMode, fc } = useTheme();
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
        // Try to extract Firestore error info if present
        try {
          const info = JSON.parse(err.message);
          if (info.error?.includes('permission')) {
            setError(`SECURITY_DENIAL: ACCESS_STATUS_PENDING // ${info.operationType.toUpperCase()}_FAIL`);
          } else {
            setError(info.error || 'System error during registration. Try again.');
          }
        } catch {
          setError('System error during registration. Try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-sm mx-auto px-4 py-4 md:px-0">
      <div className="text-center space-y-2 md:space-y-4">
        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-brand-cyan flex items-center justify-center rounded-none border-4 border-on-surface shadow-[4px_4px_0px_black]">
          <UserPlus className="w-6 h-6 md:w-8 md:h-8 text-on-surface" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tighter leading-none pt-4">{fc('Create Profile', 'Create Profile')}</h1>
        <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-60">{fc('PROFILE_SETUP // AUTH_SECURE', 'PROFILE SETUP')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="space-y-1 text-left">
          <label className="micro-label opacity-40 ml-1 flex justify-between">
            <span>{fc('Username (unique, lowercase)', 'Username')}</span>
            {usernameStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin border-on-surface" />}
          </label>
          <div className="relative">
            <input 
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().trim() }))}
              placeholder="explorer_name"
              className={cn(
                "bureau-input pr-10 font-bold",
                usernameStatus === 'available' && "border-brand-lime ring-4 ring-brand-lime/20",
                usernameStatus === 'taken' && "border-error bg-error/5 ring-4 ring-error/20",
                usernameStatus === 'invalid' && "border-error/50"
              )}
              required
              autoComplete="off"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'available' && <Check className="w-5 h-5 text-on-surface" />}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X className="w-5 h-5 text-error" />}
            </div>
          </div>
          <AnimatePresence>
            {usernameError && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[10px] uppercase font-black tracking-tighter text-error mt-1 ml-1"
              >
                SYSTEM_MESSAGE: {usernameError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1 text-left">
          <label className="micro-label opacity-40 ml-1">{fc('Email_Address', 'Email Address')}</label>
          <input 
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.trim() }))}
            placeholder="friend@email.com"
            className="bureau-input font-bold"
            required
          />
        </div>

        <div className="space-y-1 text-left">
          <div className="flex flex-col gap-4">
            <div className="space-y-1 text-left relative">
              <label className="micro-label opacity-40 ml-1">Password</label>
              <input 
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="bureau-input pr-10 font-bold"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-10 text-on-surface/40 hover:text-on-surface"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="space-y-1 text-left relative">
              <label className="micro-label opacity-40 ml-1">{fc('Confirm Password', 'Confirm Password')}</label>
              <input 
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bureau-input font-bold"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            {formData.password && (
              <div className="grid grid-cols-2 gap-2 px-1">
                {passwordRequirements.map((req, idx) => {
                  const met = req.test(formData.password);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={cn(
                        "w-4 h-4 rounded-none flex items-center justify-center border-2 transition-colors",
                        met ? "bg-brand-lime border-on-surface" : "bg-transparent border-on-surface/20"
                      )}>
                        {met && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <span className={cn(
                        "text-[9px] uppercase font-black tracking-widest transition-colors",
                        met ? "text-on-surface" : "opacity-30"
                      )}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 bg-error text-white font-black text-[10px] uppercase tracking-widest border-4 border-on-surface shadow-[8px_8px_0px_black]"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            CRITICAL: {error}
          </motion.div>
        )}

        <div className="pt-4 space-y-4">
          <button 
            type="submit"
            disabled={loading}
            className="w-full bureau-btn bg-brand-orange text-white flex items-center justify-center gap-3 disabled:opacity-20 py-6 border-4 border-on-surface shadow-[10px_10px_0px_var(--color-brand-lime)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : fc('READY_FOR_LAUNCH', 'CREATE PROFILE')}
          </button>
          
          <button 
            type="button"
            onClick={onBack}
            className="w-full p-4 text-[10px] uppercase font-black tracking-[0.3em] opacity-40 hover:opacity-100 hover:text-brand-orange transition-all"
          >
            &lt; {fc('Return Home', 'Back')}
          </button>
        </div>
      </form>
    </div>
  );
}
