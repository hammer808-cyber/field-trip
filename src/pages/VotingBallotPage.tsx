import React from 'react';
import { VotingHub } from '../components/VotingHub';
import { ChevronRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getStarterProgress } from '../services/canonicalProgress';

export default function VotingBallotPage() {
  const { canonicalProgress } = useApp();
  const starterProgress = getStarterProgress(canonicalProgress);
  const isVotingUnlocked = starterProgress.starterComplete === true;

  return (
    <div className="pb-40 px-6 pt-24 space-y-20 max-w-7xl mx-auto relative overflow-hidden bg-white min-h-screen">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-[40%] h-[600px] liquid-chrome opacity-5 -skew-x-12 translate-x-24 z-0 pointer-events-none" />

      <header className="space-y-10 relative z-10 text-left">
        <div className="flex items-center gap-6">
          <Link to="/voting" className="p-4 bg-white border-4 border-on-surface shadow-[8px_8px_0px_black] hover:bg-brand-lime transition-all active:translate-x-1 active:translate-y-1 active:shadow-none -rotate-2 hover:rotate-0">
            <ChevronRight className="w-8 h-8 rotate-180 stroke-[4]" />
          </Link>
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <span className="w-3 h-3 bg-brand-orange animate-pulse shadow-[0_0_10px_var(--color-brand-orange)]" />
                <p className="font-display text-xs font-black uppercase tracking-[0.4em] text-brand-orange italic">VOTE ACTIVE</p>
             </div>
             <p className="font-display text-[10px] font-black opacity-30 uppercase tracking-[0.5em] italic">Ballot Box // Zine Ballot</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="relative inline-block max-w-full">
            <h1 className="text-[clamp(3.5rem,15vw,8rem)] md:text-[12rem] font-display uppercase tracking-tighter italic leading-[0.75] font-black text-on-surface break-words">
              Zine Ballot
            </h1>
            <div className="absolute -bottom-4 left-0 w-full h-8 bg-brand-lime -z-10 rotate-[-1deg] opacity-60" />
          </div>
          
          <div className="bg-on-surface text-white p-8 border-l-[12px] border-brand-orange max-w-4xl shadow-[20px_20px_0px_rgba(0,0,0,0.05)] rotate-1">
            <p className="font-display text-3xl uppercase font-black italic leading-[0.9] tracking-tighter">
              "Designate the entries that define the current cycle. Your choice is documented, encrypted, and dispatched to HQ."
            </p>
          </div>
        </div>
      </header>

      <main className="animate-in fade-in slide-in-from-bottom-12 duration-700 relative z-10">
        {isVotingUnlocked ? (
          <VotingHub />
        ) : (
          <section className="max-w-3xl mx-auto border-4 border-on-surface bg-[#fff8e8] p-8 text-center shadow-[10px_10px_0px_black] rounded-[2rem]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-on-surface bg-brand-magenta text-white shadow-[5px_5px_0px_black]">
              <Lock className="h-10 w-10" />
            </div>
            <h2 className="mt-5 font-display text-4xl sm:text-6xl font-black italic uppercase leading-none">
              Ballot booth locked
            </h2>
            <p className="mx-auto mt-3 max-w-lg font-serif italic text-on-surface/65">
              Voting unlocks after your 3 Starter Signals are approved. The Voting page still opens; the ballot itself waits for field onboarding.
            </p>
            <div className="mx-auto mt-6 max-w-sm border-2 border-on-surface bg-white p-3 shadow-[3px_3px_0px_black]">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange">
                Starter approvals: {Math.min(3, Math.max(0, starterProgress.starterApprovedCount))} / 3
              </p>
            </div>
            <Link
              to="/voting"
              className="mt-6 inline-flex items-center justify-center gap-2 border-4 border-on-surface bg-brand-lime px-6 py-3 font-display text-lg font-black italic uppercase shadow-[5px_5px_0px_black] active:translate-y-1 active:shadow-none"
            >
              Back to Voting
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
