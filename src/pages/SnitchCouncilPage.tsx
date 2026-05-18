import React from 'react';
import { ChevronRight, ShieldAlert, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/UI';

export default function SnitchCouncilPage() {
  return (
    <div className="min-h-screen pb-40 px-6 pt-16 space-y-12 max-w-6xl mx-auto relative overflow-hidden bg-white">
      <header className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/voting" className="p-3 bg-white border-2 border-on-surface shadow-[4px_4px_0px_black] hover:bg-brand-lime transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <ChevronRight className="w-6 h-6 rotate-180 stroke-[3]" />
          </Link>
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-magenta animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-magenta">AUDIT_MODE</p>
             </div>
             <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Field_Audit // Snitch_Council</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-[6rem] md:text-[8rem] font-display uppercase tracking-tighter italic leading-[0.8] font-black text-on-surface">
            Snitch Council
          </h1>
          <div className="bg-brand-magenta/5 p-6 border-l-4 border-brand-magenta max-w-2xl">
            <p className="font-serif italic text-2xl opacity-90 leading-tight">
              "Arbitrate disputes flagged by field ops. Consensus determines the finality of evidence."
            </p>
          </div>
        </div>
      </header>

      <main className="animate-in fade-in slide-in-from-bottom-4 relative z-10">
        <Card className="p-16 border-2 border-on-surface bg-white shadow-[20px_20px_0px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center text-center gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-magenta/5 border border-brand-magenta/10 rotate-45 translate-x-32 -translate-y-32" />
          
          <div className="p-8 bg-on-surface border-4 border-white shadow-[12px_12px_0px_var(--color-brand-magenta)] rotate-3 group hover:rotate-6 transition-transform">
            <ShieldAlert className="w-20 h-20 text-brand-lime animate-pulse" />
          </div>
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-center gap-2 mb-4">
               <span className="h-[2px] w-8 bg-on-surface/10" />
               <h2 className="font-display text-5xl uppercase tracking-tighter leading-none">Council_Dormant</h2>
               <span className="h-[2px] w-8 bg-on-surface/10" />
            </div>
            <p className="font-serif italic text-xl opacity-70 max-w-xl mx-auto leading-relaxed">
              The Snitch Council is currently in a state of suspended animation. No active disputes require arbitration at this cycle. The air is still.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 px-6 py-2 border-2 border-on-surface shadow-[4px_4px_0px_black] bg-brand-lime">
              <Clock className="w-5 h-5 text-on-surface" />
              <span className="font-mono text-[10px] uppercase tracking-widest font-black">System_v2.5_Awaiting_Signal</span>
            </div>
          </div>
        </Card>
      </main>

      {/* Decorative Shimmer Edge */}
      <div className="absolute top-0 left-0 w-1 h-full bg-brand-magenta opacity-30" />
    </div>
  );
}
