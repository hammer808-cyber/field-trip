import React from 'react';
import { VotingHub } from '../components/VotingHub';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VotingBallotPage() {
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
        <VotingHub />
      </main>
    </div>
  );
}
