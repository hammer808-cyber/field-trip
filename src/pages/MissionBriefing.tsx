import React from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { MissionCard } from '../components/ChallengeCard';
import { ChevronLeft, Camera, Bookmark, Clock, Compass } from 'lucide-react';
import { FieldPageHero } from '../components/FieldPageHero';
import { cn } from '../lib/utils';

export default function MissionBriefingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const missionId = searchParams.get('id');
  const { trips, activeTrip, setActiveMissionCard, updateMissionCardStatus } = useApp();

  const mission = trips.find(t => t.id === missionId);

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-light p-6">
        <div className="text-center space-y-4">
          <p className="font-mono text-xs uppercase opacity-40">Error: Mission not found</p>
          <button onClick={() => navigate('/missions')} className="bureau-btn">Back to Missions</button>
        </div>
      </div>
    );
  }

  const handleStartMission = async () => {
    try {
      // Set as active in both profile and drawnMissionCards
      await setActiveMissionCard(mission.id);
      navigate(`/capture?id=${mission.id}`);
    } catch (err: any) {
      console.error("[MissionBriefing] Failed to start mission:", err.message);
    }
  };

  const handleSaveForLater = async () => {
    try {
      await updateMissionCardStatus(mission.id, 'saved_for_later', { isActive: false });
      navigate('/missions');
    } catch (err: any) {
      console.error("[MissionBriefing] Failed to save mission for later:", err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-40 ft-paper-texture">
      <header className="px-4 pt-6 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border-3 border-on-surface flex items-center justify-center shadow-[2px_2px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="font-mono text-[10px] font-black uppercase tracking-widest opacity-40">
          Mission_Briefing_{mission.id}
        </div>
        <div className="w-10" />
      </header>

      <main className="px-6 pt-8 space-y-12 max-w-xl mx-auto">
        <div className="space-y-4 text-center">
          <div className="inline-flex gap-2 items-center px-3 py-1 bg-brand-orange/10 border-2 border-brand-orange rounded-full text-[10px] font-black uppercase tracking-widest text-brand-orange">
            <Clock className="w-3 h-3" />
            Field Ready
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black uppercase italic tracking-tighter leading-none text-on-surface">
            Briefing Data
          </h1>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-brand-cyan/5 rounded-[3rem] -rotate-1 -z-10" />
          <MissionCard 
            challenge={mission} 
            className="shadow-[16px_16px_0px_black] rounded-[2.5rem] border-4 border-on-surface"
          />
        </div>

        <div className="space-y-6">
          <div className="bg-white border-3 border-on-surface p-6 rounded-[2rem] shadow-[8px_8px_0px_black] space-y-4">
            <h3 className="font-display text-xl font-black uppercase italic">The Objective</h3>
            <p className="font-serif italic text-on-surface/70 leading-relaxed">
              {mission.description || "Follow field instructions to capture the required evidence. Ensure lightning is optimal and the subject is clearly visible in frame."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white border-2 border-on-surface/10 p-4 rounded-2xl flex flex-col items-center gap-2 text-center">
                <Compass className="w-5 h-5 text-brand-cyan" />
                <span className="text-[10px] font-mono font-black uppercase opacity-40">Lane</span>
                <span className="text-xs font-bold uppercase">{mission.lane || 'Standard'}</span>
             </div>
             <div className="bg-white border-2 border-on-surface/10 p-4 rounded-2xl flex flex-col items-center gap-2 text-center">
                <Bookmark className="w-5 h-5 text-brand-orange" />
                <span className="text-[10px] font-mono font-black uppercase opacity-40">Reward</span>
                <span className="text-xs font-bold uppercase">{mission.basePoints || 250} XP</span>
             </div>
          </div>
        </div>

        <div className="pt-6 space-y-4">
          <button
            onClick={handleStartMission}
            className="w-full py-5 bg-brand-orange text-white border-[4px] border-on-surface shadow-[0_8px_0px_black] active:shadow-none active:translate-y-2 transition-all font-display text-2xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3"
          >
            <Camera className="w-6 h-6" />
            <span>Start Mission Now</span>
          </button>

          <button
            onClick={handleSaveForLater}
            className="w-full py-5 bg-white text-on-surface border-[4px] border-on-surface shadow-[0_8px_0px_black] active:shadow-none active:translate-y-2 transition-all font-display text-2xl font-black uppercase italic tracking-wide flex items-center justify-center gap-3"
          >
            <Bookmark className="w-6 h-6" />
            <span>Save for Later</span>
          </button>
        </div>

        <button 
          onClick={() => navigate('/missions')}
          className="w-full py-4 text-center text-on-surface/40 hover:text-on-surface font-mono text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
        >
          Dismiss Data
        </button>
      </main>
    </div>
  );
}
