import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Users, 
  History, 
  BarChart3, 
  FileText, 
  Settings, 
  AlertTriangle, 
  Lock, 
  Sparkles, 
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Trophy,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getCrew, getCrewLore, subscribeToCrewLore, getLatestDispatch } from '../services/crewService';
import { Crew, CrewLore, CrewDispatch } from '../types/crew';
import { Card, Sticker } from '../components/UI';
import { CrewArtifactsGallery } from '../components/CrewArtifactsGallery';

export default function CrewPage() {
  const { skin } = useTheme();
  const { user, crewArtifacts } = useApp();
  const [activeTab, setActiveTab] = useState<'home' | 'lore' | 'members' | 'stats' | 'dispatch'>('home');
  const [crew, setCrew] = useState<Crew | null>(null);
  const [lore, setLore] = useState<CrewLore | null>(null);
  const [dispatch, setDispatch] = useState<CrewDispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // For demo purposes, we'll assume the user belongs to a crew or is looking at one
  // In a real app, we'd fetch the user's crewId from their profile
  const crewId = 'sample-baja-bratz-crew'; 

  useEffect(() => {
    async function init() {
      const c = await getCrew(crewId);
      if (c) {
        setCrew(c);
        const l = await getCrewLore(crewId);
        setLore(l);
        const d = await getLatestDispatch(crewId);
        setDispatch(d);
      }
      setLoading(false);
    }
    init();

    const unsub = subscribeToCrewLore(crewId, (data) => setLore(data));
    return () => unsub();
  }, [crewId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen font-mono">LOADING_CREW_IDENTITY...</div>;

  if (!crew) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-8">
        <Users className="w-16 h-16 opacity-10" />
        <div className="space-y-4">
           <h1 className="text-huge text-4xl">NO_CREW_ASSIGNED</h1>
           <p className="font-serif italic opacity-60 max-w-sm">
             Standalone agents are efficient, but the Bureau incentivizes collective reconnaissance. Join or initialize a crew to access Lore and Dispatches.
           </p>
        </div>
        <button onClick={() => navigate('/frontlines')} className="bureau-btn">FIND_RECRUITMENT_NODE</button>
      </div>
    );
  }

  const tabs = [
    { id: 'home', label: 'Identity', icon: Users },
    { id: 'lore', label: 'Lore', icon: MessageSquare },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'dispatch', label: 'Dispatch', icon: FileText },
  ];

  return (
    <div className="pb-40 px-6 pt-12 space-y-12 max-w-4xl mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 bg-paper border-4 border-on-surface shadow-[8px_8px_0px_black] overflow-hidden flex items-center justify-center">
             {crew.badge ? <img src={crew.badge} alt="Badge" className="w-full h-full object-cover" /> : <Users className="w-12 h-12" />}
          </div>
          <div className="space-y-1">
             <div className="bureau-tag bg-on-surface text-paper w-fit text-[8px]">{crew.currentSeason}_UNIT</div>
             <h1 className="font-display text-5xl uppercase tracking-tighter leading-none">{crew.name}</h1>
             <p className="micro-label opacity-40">ESTABLISHED: {new Date(crew.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Tab Rail */}
        <div className="flex gap-2 border-b-2 border-on-surface/10 pb-2 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-2 flex items-center gap-2 font-display uppercase tracking-widest text-xs transition-all border-b-4",
                activeTab === tab.id ? "border-brand-orange text-on-surface" : "border-transparent text-on-surface/40 hover:text-on-surface"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Content */}
      <div className="min-h-[40vh]">
        {activeTab === 'home' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
            <section className="space-y-4">
               <h3 className="micro-label font-bold text-brand-orange">CURRENT_DEPLOYMENT</h3>
               <div className="notice-card p-8 flex flex-col items-center text-center space-y-4">
                  <RotateCcw className="w-12 h-12 opacity-10 animate-spin-slow" />
                  <div className="space-y-2">
                    <p className="font-display text-2xl uppercase tracking-tighter">Season 1: The First Exit</p>
                    <p className="font-serif italic opacity-60">"Crews are currently operating in the Mayflower quadrant. Intelligence is flowing."</p>
                  </div>
               </div>
            </section>

            <section className="space-y-4">
              <h3 className="micro-label font-bold">OPERATIONAL_MEMBERS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {crew.members.map((m, i) => (
                  <div key={i} className="bg-paper border-2 border-on-surface/10 p-4 flex items-center gap-4 hover:border-on-surface transition-all">
                    <div className="w-10 h-10 rounded-full bg-on-surface/5 flex items-center justify-center font-mono text-xs">
                      {m.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                       <p className="font-display uppercase tracking-tighter">Agent_{m.slice(0, 8)}</p>
                       <p className="text-[8px] font-mono opacity-40">ROLE: RECONNAISSANCE</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'lore' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
            <section className="space-y-6">
               <h3 className="micro-label font-bold text-brand-orange flex items-center gap-2">
                 <Sparkles className="w-3 h-3" /> SEASONAL_HIGHLIGHTS
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Most Suspicious Entry', value: lore?.highlights.mostSuspiciousEntry ? `ENTRY_${lore.highlights.mostSuspiciousEntry.slice(-4).toUpperCase()}` : 'No suspicious activity yet. Boring, but respectable.' },
                    { label: 'Biggest Comeback', value: lore?.highlights.biggestComeback || 'Steady state maintained. No major swings recorded.' },
                    { label: 'Most Chaotic Trip', value: lore?.highlights.mostChaoticTrip || 'This crew has not caused enough trouble to be studied.' },
                    { label: 'Field Checks Survived', value: lore?.highlights.mostFieldChecksSurvived || '0 (Clean Record)' },
                  ].map(h => (
                    <div key={h.label}>
                      <Card className="p-6 space-y-2">
                         <p className="micro-label opacity-40">{h.label.toUpperCase()}</p>
                         <p className="font-serif italic text-lg leading-snug">{h.value}</p>
                      </Card>
                    </div>
                  ))}
               </div>
            </section>

            <section className="space-y-4">
               <h3 className="micro-label font-bold">INSIDE_LOGS (JOKES)</h3>
               <div className="space-y-4">
                  {lore?.insideJokes.length ? lore.insideJokes.map((joke, i) => (
                     <div key={i} className="bg-paper border-l-4 border-brand-orange p-4 italic font-serif opacity-80">
                       "{joke}"
                     </div>
                  )) : (
                    <p className="font-mono text-[10px] opacity-40 italic">Waiting for collective humor to manifest...</p>
                  )}
               </div>
               <div className="pt-4 flex gap-4">
                  <input 
                    type="text" 
                    placeholder="Document a collective moment..."
                    className="flex-1 bg-on-surface/5 border-b-2 border-on-surface p-2 text-xs font-mono outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // handleAddJoke(e.currentTarget.value)
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button className="bureau-btn-outline text-[10px]">ADD_LORE</button>
               </div>
            </section>

            <section className="space-y-4 pt-8 border-t border-on-surface/10">
               <CrewArtifactsGallery artifacts={crewArtifacts} />
            </section>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'APPROVED', val: lore?.seasonStats.S1?.totalApprovedEntries || 0, icon: ShieldCheck },
                  { label: 'QUESTIONED', val: lore?.seasonStats.S1?.totalRejectedEntries || 0, icon: AlertTriangle },
                  { label: 'COMPLETED', val: lore?.seasonStats.S1?.totalCompletedChallenges || 0, icon: Trophy },
                  { label: 'RANK', val: '#42', icon: BarChart3 },
                ].map(stat => (
                  <div key={stat.label} className="notice-card p-6 flex flex-col items-center justify-center space-y-2">
                    <stat.icon className="w-6 h-6 opacity-20" />
                    <p className="font-display text-3xl leading-none">{stat.val}</p>
                    <p className="micro-label opacity-40">{stat.label}</p>
                  </div>
                ))}
             </div>
             
             {/* Score Journey Placeholder */}
             <div className="h-64 border-4 border-on-surface/10 bg-on-surface/5 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 flex flex-col justify-around">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-px w-full bg-on-surface" />)}
                </div>
                <div className="text-center space-y-2 z-10">
                   <p className="font-mono text-[10px] opacity-40 uppercase">Statistical Visualization Locked</p>
                   <p className="font-serif italic text-xs">Deep analytics require more seasonal data points.</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'dispatch' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
            {!dispatch ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 bg-on-surface/5 border-2 border-dashed border-on-surface/20 rounded-[3rem]">
                <Lock className="w-16 h-16 opacity-10" />
                <div className="space-y-2">
                   <h2 className="font-display text-3xl uppercase tracking-tighter">DISPATCH_LOCKED</h2>
                   <p className="font-serif italic opacity-60">"Dispatch locked until the season closes. Keep collecting evidence."</p>
                </div>
              </div>
            ) : (
              <div className="bg-paper border-8 border-double border-on-surface p-12 space-y-12 shadow-2xl relative">
                 <div className="absolute top-8 right-8 mix-blend-multiply opacity-20 grayscale brightness-125">
                   {/* Badge Sticker */}
                   <div className="w-24 h-24 border-4 border-brand-orange flex items-center justify-center rotate-12 text-brand-orange font-black text-center text-[10px]">
                     CERTIFIED<br/>SEASON_1<br/>VETERAN
                   </div>
                 </div>

                 <header className="space-y-2 border-b-4 border-on-surface pb-6">
                    <p className="micro-label text-brand-orange font-black">OFFICIAL_BUREAU_DISPATCH // SEASON_01</p>
                    <h2 className="font-display text-6xl uppercase tracking-tighter leading-none">{crew.name}</h2>
                    <div className="flex justify-between text-[10px] font-mono opacity-60">
                      <span>FINAL_RANK: #{dispatch.finalRank}</span>
                      <span>FINAL_SCORE: {dispatch.finalScore}XP</span>
                    </div>
                 </header>

                 <div className="space-y-8 font-serif italic text-xl">
                    <p>"{dispatch.summary.recapParagraph}"</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 not-italic">
                       <div className="space-y-4">
                          <p className="micro-label font-bold bg-on-surface text-paper w-fit px-2">CREW_AWARDS</p>
                          <ul className="space-y-2 text-sm uppercase font-display tracking-widest">
                             {dispatch.summary.awards.map(a => <li key={a} className="flex gap-2"><span>★</span> {a}</li>)}
                          </ul>
                       </div>
                       <div className="space-y-4">
                          <p className="micro-label font-bold bg-on-surface text-paper w-fit px-2">BEST_EVIDENCE</p>
                          <div className="aspect-square bg-on-surface/10 border-2 border-on-surface flex items-center justify-center overflow-hidden">
                             {/* Preview of best entry */}
                             <p className="text-[10px] font-mono opacity-40">IMAGE_DECRYPTING...</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <footer className="pt-8 border-t border-dashed border-on-surface/20 flex justify-between items-center">
                    <p className="micro-label opacity-40 uppercase">End of seasonal record. Base operations remain active.</p>
                    <button className="bureau-btn text-xs px-6">SHARE_REPORT</button>
                 </footer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
