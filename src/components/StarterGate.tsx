import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Lock, ArrowLeft, Layers } from 'lucide-react';
import { canAccessFeature, getStarterProgress } from '../services/canonicalProgress';

interface StarterGateProps {
  requiredFeature: 'crew' | 'memories' | 'leaderboard' | 'voting';
  children: React.ReactNode;
}

export function StarterGate({ requiredFeature, children }: StarterGateProps) {
  const { isAdmin, canonicalProgress } = useApp();
  const navigate = useNavigate();
  const starterProgress = getStarterProgress(canonicalProgress);
  const approvedStarterCount = starterProgress.starterApprovedCount;
  const featureKey = requiredFeature === 'leaderboard' ? 'voting' : requiredFeature;
  const isFeatureUnlocked = canAccessFeature(canonicalProgress, featureKey, { isAdmin });

  // If the user has completed the starter deck, or they have admin bypass, show the content.
  if (isFeatureUnlocked || isAdmin) {
    return <>{children}</>;
  }

  // Otherwise, render a stunning retro Lock-Screen
  return (
    <div className="min-h-screen bg-paper-light flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.02)_1.5px,transparent_1.5px)] bg-[size:16px_16px] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-4 bg-brand-magenta" />
      
      <div className="max-w-md w-full bg-white border-[8px] border-on-surface shadow-[14px_14px_0px_rgba(0,0,0,1)] rounded-3xl p-6 sm:p-8 text-on-surface relative z-10 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-3 -right-6 w-16 h-6 bg-brand-yellow border-2 border-on-surface rotate-12 flex items-center justify-center text-[7px] font-black tracking-widest uppercase">
          RESTRICTED
        </div>
        
        {/* Locked Feature Heading */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full border-4 border-on-surface overflow-hidden bg-brand-magenta mb-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-center relative">
            <Lock className="w-10 h-10 text-white stroke-[2.5]" />
          </div>

          <h1 className="font-display font-black uppercase text-2xl sm:text-3xl italic tracking-tight text-on-surface leading-none mb-1">
            ACCESS RESTRICTED
          </h1>
          <p className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#AF2283] bg-brand-magenta/10 px-3 py-1 border-2 border-[#AF2283] rounded-full mb-6">
            SECURITY PROTOCOLS IN EFFECT
          </p>

          {/* Status Message */}
          <div className="bg-brand-cyan/15 border-2 border-on-surface rounded-2xl p-6 mb-6 w-full text-left shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <p className="font-serif italic text-sm leading-relaxed text-on-surface/90">
                Complete all 3 Starter Signals to unlock this.
              </p>
          </div>


          {/* Progress Section */}
          <div className="w-full bg-[#FAFAFA] border-2 border-on-surface rounded-xl p-4 mb-6 flex flex-col items-center">
            <span className="font-display font-black uppercase text-[10px] tracking-widest text-on-surface/50 mb-2">
              YOUR PROGRESS TO UNLOCKING
            </span>
            <div className="w-full bg-white border-2 border-on-surface h-6 rounded-full overflow-hidden relative shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              <div 
                className="bg-brand-lime h-full transition-all duration-500 ease-out border-r-2 border-on-surface"
                    style={{ width: `${Math.min(100, Math.max(0, (approvedStarterCount / 3) * 100))}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-black uppercase">
                {approvedStarterCount} / 3 UNIQUE APPROVED STARTER MISSIONS
              </div>
            </div>
          </div>

          {/* Guide steps */}
          <div className="w-full space-y-2 mb-6 text-left">
            <div className="flex items-center gap-3 p-2 bg-white border border-on-surface/10 rounded-lg">
              <div className="w-5 h-5 rounded-full border border-on-surface flex items-center justify-center font-mono text-[10px] font-black">1</div>
              <p className="font-mono text-xs text-on-surface/70">Unique missions within the "Starter Deck"</p>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white border border-on-surface/10 rounded-lg">
              <div className="w-5 h-5 rounded-full border border-on-surface flex items-center justify-center font-mono text-[10px] font-black">2</div>
              <p className="font-mono text-xs text-on-surface/70">Status must be approved (no pending or rejected)</p>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white border border-on-surface/10 rounded-lg">
              <div className="w-5 h-5 rounded-full border border-on-surface flex items-center justify-center font-mono text-[10px] font-black">3</div>
              <p className="font-mono text-xs text-on-surface/70">Duplicates from same mission do not double-count</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => navigate('/deck')}
              className="bg-brand-lime hover:bg-brand-lime/90 text-on-surface font-display font-black uppercase italic tracking-wider py-4 px-4 border-4 border-on-surface rounded-xl shadow-[5px_5px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-5 h-5 stroke-[2.5]" />
              CHOOSE STARTER MISSIONS
            </button>
            <button
              onClick={() => navigate('/basecamp')}
              className="font-mono text-[10px] uppercase font-black text-on-surface/50 hover:text-on-surface flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              RETURN TO BASECAMP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
