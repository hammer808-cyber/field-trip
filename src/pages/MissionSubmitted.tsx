import React from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CheckCircle, Home, LayoutGrid, Camera, Sparkles } from 'lucide-react';
import { Confetti } from '../components/Confetti';
import { FieldTape } from '../components/UI';

export default function MissionSubmittedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const missionId = searchParams.get('id');
  const { trips } = useApp();

  const mission = trips.find(t => t.id === missionId);

  return (
    <div className="min-h-screen bg-[#FCF8F2] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <Confetti />
      
      {/* Background Grid Pattern (field trip dossier style) */}
      <div className="absolute inset-0 bg-[#FFFCEB] bg-[radial-gradient(rgba(0,0,0,0.03)_1.5px,transparent_1.5px)] bg-[size:16px_16px] pointer-events-none opacity-60" />
      
      {/* Tape Deco and Visual Background Elements */}
      <div className="absolute inset-0 opacity-15 pointer-events-none select-none">
        <div className="absolute top-10 left-10 w-40 h-40 border-[3.5px] border-on-surface rounded-full rotate-12" />
        <div className="absolute bottom-20 right-10 w-60 h-60 border-[3.5px] border-on-surface rotate-45" />
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-sm space-y-8 relative z-10 text-center"
      >
        {/* Core Tactical Card Container */}
        <div className="bg-white border-[4px] border-on-surface p-8 shadow-[10px_10px_0px_black] relative rotate-[-0.5deg]">
          
          {/* Decorative Tape */}
          <FieldTape className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-brand-lime" rotation={-2} />
          
          <div className="space-y-6">
            <motion.div 
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 2 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-20 h-20 bg-brand-lime border-4 border-on-surface flex items-center justify-center mx-auto shadow-[4px_4px_0px_black]"
            >
              <CheckCircle className="w-10 h-10 text-on-surface stroke-[2.5]" />
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-black uppercase italic tracking-tighter leading-none text-on-surface">
                Memory Captured!
              </h1>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-orange text-white text-[9px] font-mono font-black uppercase tracking-widest border-2 border-on-surface rotate-[-1deg]">
                <Sparkles className="w-3 h-3 text-white" />
                <span>PHOTO SUBMITTED</span>
              </div>
            </div>

            <div className="bg-[#FFFCEB] border-2 border-dashed border-on-surface/15 p-4 rounded-xl space-y-1.5 text-center relative">
              <p className="text-[9px] font-mono font-black uppercase tracking-wider text-brand-orange-dark">AWAITING REVIEW</p>
              <p className="text-xs font-serif italic text-on-surface leading-normal">
                "Your photo is being verified. Once approved, it will be added to your crew feed and earn points toward the season!"
              </p>
            </div>
          </div>

          {mission && (
            <div className="mt-5 bg-on-surface/[0.02] border-2 border-on-surface/5 p-4 rounded-xl">
              <span className="text-[8px] font-mono font-black uppercase tracking-widest text-on-surface/30 block mb-1">COMPLETED MISSION</span>
              <p className="text-xs font-bold text-on-surface flex items-center justify-center gap-1.5">
                <Camera className="w-4 h-4 text-brand-orange" />
                {mission.title}
              </p>
            </div>
          )}

          {/* End of Season Banner Quote */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-on-surface/10">
            <p className="font-mono text-[9px] uppercase tracking-wider leading-relaxed text-on-surface/40">
              Take photos. Earn points. Make the summer reel. Win the season!
            </p>
          </div>
        </div>

        {/* Dynamic Nav CTAs */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/collection')}
            className="w-full py-4 bg-brand-lime text-on-surface border-[4px] border-on-surface shadow-[6px_6px_0px_black] hover:bg-brand-lime/95 hover:-translate-y-1 hover:shadow-[8px_8px_0px_black] active:translate-y-0.5 active:shadow-none transition-all font-display text-xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3"
          >
            <LayoutGrid className="w-5 h-5 stroke-[2.5]" />
            <span>View My Memories</span>
          </button>

          <button
            onClick={() => navigate('/basecamp')}
            className="w-full py-4 bg-white text-on-surface border-[4px] border-on-surface shadow-[6px_6px_0px_black] hover:bg-on-surface/[0.02] hover:-translate-y-1 hover:shadow-[8px_8px_0px_black] active:translate-y-0.5 active:shadow-none transition-all font-display text-xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3"
          >
            <Home className="w-5 h-5 stroke-[2.5]" />
            <span>Back to Basecamp</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
