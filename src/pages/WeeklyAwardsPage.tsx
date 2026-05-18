import React from 'react';
import { ChevronRight, Trophy, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function WeeklyAwardsPage() {
  const { currentWeekNumber } = useApp();

  return (
    <div className="min-h-screen bg-white pb-40 px-6 pt-16 space-y-16 max-w-6xl mx-auto relative overflow-hidden">
      {/* Background decoration */}
      <div className="fixed top-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none overflow-hidden h-full z-0">
        <h1 className="text-[25vw] font-display uppercase tracking-tighter leading-none italic rotate-90 origin-top-right font-black">
          LAUREATES
        </h1>
      </div>

      <header className="space-y-6 relative z-10">
        <div className="flex items-center gap-4">
          <Link to="/voting" className="p-3 bg-white border-2 border-on-surface shadow-[4px_4px_0px_black] hover:bg-brand-lime transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <ChevronRight className="w-6 h-6 rotate-180 stroke-[3]" />
          </Link>
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-orange animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-orange">PROTOCOL_HONORS</p>
             </div>
             <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Protocol_Archival // Weekly_Awards</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-[6rem] md:text-[8rem] font-display uppercase tracking-tighter leading-[0.8] font-black text-on-surface">
            The Honors
          </h1>
          <div className="bg-brand-lime/10 p-6 border-l-4 border-brand-lime max-w-2xl">
            <p className="font-serif italic text-2xl opacity-90 leading-tight">
              "Ceremonial recognition for exceptional field performance. The Bureau acknowledges your contribution to the vibe landscape."
            </p>
          </div>
        </div>
      </header>

      <main className="animate-in fade-in slide-in-from-bottom-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Card className="p-12 border-2 border-on-surface bg-white shadow-[20px_20px_0px_black] relative overflow-hidden group">
            {/* Shimmer effect */}
            <div className="absolute top-0 right-0 w-64 h-full bg-brand-lime/5 -skew-x-12 translate-x-16" />
            
            <div className="space-y-10 relative z-10">
              <div className="flex items-start gap-6">
                <div className="p-4 bg-on-surface text-brand-lime border-2 border-on-surface shadow-[6px_6px_0px_var(--color-brand-orange)] group-hover:rotate-12 transition-transform">
                  <Trophy className="w-10 h-10 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black tracking-widest text-brand-orange uppercase">CURRENT_CYCLE</p>
                  <h2 className="font-display text-5xl uppercase tracking-tighter leading-none font-black italic">Cycle {currentWeekNumber}<br/>Laureates</h2>
                </div>
              </div>
              
              <div className="p-8 bg-paper-dark border-2 border-on-surface shadow-inner space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-brand-magenta animate-ping" />
                    <p className="font-black text-xs uppercase tracking-widest">Consensus_Pending_Uplink</p>
                  </div>
                  <p className="font-serif italic text-lg opacity-80 leading-tight">The Bureau is currently distilling field transmissions to identify the cycle laureates. Structural finality is expected at cycle termination.</p>
                </div>
                
                <div className="pt-6 border-t border-on-surface/10 flex justify-between items-center">
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-on-surface" />
                      ))}
                   </div>
                   <span className="text-[9px] font-mono opacity-40 uppercase">Awaiting_Consensus</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <div className="h-1 flex-grow bg-brand-orange" />
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface">PROTOCOL_HISTORY</p>
              </div>
              <h3 className="font-display text-4xl uppercase tracking-tighter font-black">Hall of Records</h3>
            </div>

            <div className="p-12 text-center space-y-6 bg-paper-dark border-2 border-dashed border-on-surface/20 relative">
               <div className="absolute top-0 right-0 p-4">
                  <Sparkles className="w-6 h-6 text-brand-lime opacity-20" />
               </div>
               <div className="p-6 bg-white border-2 border-on-surface inline-block shadow-[8px_8px_0px_rgba(0,0,0,0.05)] rotate-3">
                  <Trophy className="w-12 h-12 opacity-10" />
               </div>
               <p className="font-serif italic text-xl opacity-40 leading-tight max-w-xs mx-auto">"Digital dust on the archives. No historical data clusters detected in this sector."</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
