import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Users, 
  Trophy, 
  Shield, 
  BarChart3, 
  Sparkles, 
  ShieldAlert, 
  MoreHorizontal,
  Flame,
  Waves,
  Sun,
  Lock,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Card, Sticker } from '../components/UI';
import { AvatarPreview } from '../components/AvatarPreview';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { FIELD_TYPES } from '../constants';
import { getLeaderboardPage, UserProfile } from '../services/userService';
import { subscribeToRecentScoreEvents } from '../services/activityService';
import { getWeeklySummary } from '../services/summaryService';
import { ScoreEvent, WeeklySummary } from '../types/game';
import { ContentMenu } from '../components/ContentMenu';
import { SabotageHub } from '../components/SabotageHub';
import { CrewArtifactsGallery } from '../components/CrewArtifactsGallery';
import { getCrew, getCrewLore, getLatestDispatch } from '../services/crewService';
import { Crew as CrewType, CrewLore, CrewDispatch } from '../types/crew';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare } from '../components/SkinAssets';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { MARKER_STICKERS } from '../data/markers';

const SEASON_TOKEN_GOAL = 1000;

export default function BigBoardPage() {
  const { 
    user, profile, points, completedCoreChallenges, isCrewUnlocked, isFieldCheckUnlocked,
    currentWeekNumber, activeSeason, crewArtifacts, blockedIds,
    onboardingCompletedCount, memories, fieldTokens
  } = useApp();
  const { skin, frankieMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get('view') === 'crew' ? 'crew' : 'leaderboard';
  const [activeView, setActiveView] = useState<'leaderboard' | 'crew' | 'badges' | 'trail'>(initialView as any);
  
  // Progress calculation
  const progressPercent = Math.min(100, Math.round((fieldTokens / SEASON_TOKEN_GOAL) * 100));
  const userMarker = MARKER_STICKERS.find(s => s.id === (profile?.preferences?.selectedMarkerStickerId || 'default-scout')) || MARKER_STICKERS[0];

  // For beta, we just show the user's progress. 
  // TODO: In future, fetch other crew members' progress and markers.
  const activeTrailMembers = profile?.preferences?.showOnBigBoard !== false 
    ? [{ 
        id: user?.uid || 'me', 
        name: profile?.name || 'Explorer', 
        progress: progressPercent, 
        marker: userMarker,
        isMe: true,
        showPoints: profile?.preferences?.showExactPoints,
        tokens: fieldTokens,
        missions: onboardingCompletedCount + (memories?.length || 0),
        memories: memories?.length || 0
      }]
    : [];
  const [crewTab, setCrewTab] = useState<'home' | 'lore' | 'members' | 'stats' | 'dispatch'>('home');
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [fullBoard, setFullBoard] = useState<UserProfile[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<ScoreEvent[]>([]);
  
  // Crew specific state
  const [crew, setCrew] = useState<CrewType | null>(null);
  const [lore, setLore] = useState<CrewLore | null>(null);
  const [dispatch, setDispatch] = useState<CrewDispatch | null>(null);
  const crewId = profile?.crewId;

  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  useEffect(() => {
    if (!user || !activeSeason?.id || !currentWeekNumber) return;
    async function loadSummary() {
       const summary = await getWeeklySummary(activeSeason!.id, currentWeekNumber);
       setWeeklySummary(summary);
    }
    loadSummary();
  }, [user, activeSeason?.id, currentWeekNumber]);

  useEffect(() => {
    if (!user) return;
    async function loadInit() {
      setLoadingBatch(true);
      const result = await getLeaderboardPage(15);
      if (result) {
        setFullBoard(result.docs);
        setLastVisible(result.lastVisible);
        setHasMore(result.docs.length === 15);
      }
      setLoadingBatch(false);
    }
    loadInit();
    return subscribeToRecentScoreEvents(10, setRecentActivity);
  }, [user]);

  useEffect(() => {
    if (!crewId || !isCrewUnlocked) return;
    async function loadCrewData() {
      const c = await getCrew(crewId!);
      if (c) {
        setCrew(c);
        const l = await getCrewLore(crewId!);
        setLore(l);
        const d = await getLatestDispatch(crewId!);
        setDispatch(d);
      }
    }
    loadCrewData();
  }, [crewId, isCrewUnlocked]);

  const loadMore = async () => {
    if (loadingBatch || !hasMore) return;
    setLoadingBatch(true);
    const result = await getLeaderboardPage(15, lastVisible);
    if (result) {
      setFullBoard(prev => [...prev, ...result.docs]);
      setLastVisible(result.lastVisible);
      setHasMore(result.docs.length === 150 / 10);
    }
    setLoadingBatch(false);
  };

  const visibleActivity = recentActivity.filter(event => !blockedIds.includes(event.userId));
  const fieldTypeData = profile?.fieldType ? FIELD_TYPES[profile.fieldType] : null;

  const playerRankings = weeklySummary ? Object.entries(weeklySummary.playerStats).map(([id, stats]: [string, any]) => ({
    id,
    name: stats.userName,
    points: stats.points,
    fieldTypeName: stats.fieldTypeName,
    avatar: stats.userAvatar
  })).sort((a, b) => b.points - a.points) : fullBoard;

  const crewRankings = weeklySummary ? Object.entries(weeklySummary.crewStats).map(([id, stats]: [string, any]) => ({
    id,
    name: stats.crewName,
    score: stats.totalScore
  })).sort((a, b) => b.score - a.score) : [];

  const crewStanding = weeklySummary?.crewStats?.[crewId!] || null;
  const crewRank = weeklySummary ? (Object.entries(weeklySummary.crewStats)
    .sort(([, a]: any, [, b]: any) => b.totalScore - a.totalScore)
    .findIndex(([id]) => id === crewId) + 1) : 0;

  const crewTabs = [
    { id: 'home', label: 'Identity', icon: Users },
    { id: 'lore', label: 'Lore', icon: MessageSquare },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'dispatch', label: 'Dispatch', icon: Sparkles },
  ];

  return (
    <div className="pb-40 px-4 pt-10 sm:px-6 sm:pt-12 space-y-12 sm:space-y-16 max-w-5xl mx-auto relative overflow-hidden">
      {/* Background Decor */}
      {isBaja && !frankieMode && <HibiscusDecor />}
      {isDiamond && !frankieMode && <DiamondDecor />}
      {isHeat && !frankieMode && <HeatDecor />}

      {/* Header: User Status Card */}
      <header className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <div className="inline-block bg-brand-lime text-on-surface px-4 py-2 border-2 border-on-surface font-bold text-[11px] uppercase tracking-wider italic">
            Season Progress // Week {currentWeekNumber}
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 text-center sm:text-left">
             <AvatarPreview avatar={profile?.avatar || DEFAULT_AVATAR} size="lg" className="border-4 border-on-surface shadow-[6px_6px_0px_black] sm:shadow-[8px_8px_0px_black] bg-white w-20 h-20 sm:w-24 sm:h-24 shrink-0" />
             <div className="space-y-1 sm:space-y-2">
                <h1 className="font-outfit text-4xl sm:text-7xl uppercase tracking-tighter leading-none font-black text-on-surface italic">Big Board</h1>
                <p className="font-outfit text-sm sm:text-lg italic opacity-50 uppercase font-black tracking-widest leading-tight">Your Field Status</p>
             </div>
          </div>
        </div>

        <div className="bg-white border-4 sm:border-8 border-on-surface p-5 sm:p-8 shadow-[8px_8px_0px_black] sm:shadow-[16px_16px_0px_black] relative overflow-hidden group hover:-translate-y-1 transition-all">
           <div className="absolute top-0 right-0 w-24 h-full bg-brand-orange opacity-10 -skew-x-12 translate-x-12" />
           <div className="flex justify-between items-center mb-4 sm:mb-6 text-on-surface">
              <p className="micro-label font-black opacity-50 uppercase tracking-widest">Total Field XP</p>
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-brand-orange" />
           </div>
           <p className="text-4xl sm:text-7xl font-outfit font-black leading-none italic text-on-surface">{points}</p>
           <div className="pt-4 sm:pt-6 border-t-4 border-on-surface/5 mt-4 sm:mt-8">
              <p className="micro-label text-[10px] sm:text-[11px] font-black uppercase text-brand-orange tracking-widest leading-none">Field Credential: {fieldTypeData?.name || 'Unclassified'}</p>
           </div>
        </div>

        {/* Badge/Rank Teaser */}
        <button 
           onClick={() => setActiveView('badges')}
           className="bg-white border-4 sm:border-8 border-on-surface p-6 sm:p-8 shadow-[8px_8px_0px_var(--color-brand-lime)] sm:shadow-[16px_16px_0px_var(--color-brand-lime)] relative overflow-hidden group hover:-translate-y-1 transition-all text-left"
         >
            <div className="absolute top-0 right-0 w-24 h-full bg-brand-lime opacity-10 skew-x-12 -translate-x-12" />
            <div className="flex justify-between items-center w-full mb-4 sm:mb-6 text-on-surface">
              <p className="micro-label font-black opacity-50 uppercase tracking-widest">Next Phase Goal</p>
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-on-surface group-hover:rotate-12 transition-transform" />
            </div>
            <div className="space-y-2 sm:space-y-3 text-left relative z-10">
              <p className="text-3xl sm:text-4xl font-outfit font-black uppercase tracking-tight italic text-on-surface">Veteran Scout</p>
              <p className="text-[10px] sm:text-[11px] font-mono font-black opacity-70 uppercase tracking-widest text-brand-orange">Progress to Level 15</p>
            </div>
            <div className="w-full h-3 sm:h-4 bg-on-surface/5 mt-4 sm:mt-6 border-2 border-on-surface shadow-[3px_3px_0px_black] sm:shadow-[4px_4px_0px_black] relative overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '65%' }}
                 transition={{ duration: 1.5, ease: "easeOut" }}
                 className="h-full bg-brand-lime" 
               />
            </div>
         </button>
      </header>

      {/* Main View Toggle */}
      <div className="flex gap-2 sm:gap-4 border-b-4 sm:border-b-8 border-on-surface pb-0 flex-nowrap overflow-x-auto no-scrollbar">
        {[
          { id: 'leaderboard', label: 'Global Board' },
          { id: 'trail', label: 'The Big Board' },
          { id: 'crew', label: 'Crew Status' },
          { id: 'badges', label: 'Ranks & Badges' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={cn(
              "px-6 sm:px-8 py-4 sm:py-6 font-outfit uppercase tracking-widest text-[11px] sm:text-xs transition-all border-b-4 sm:border-b-8 font-black shrink-0",
              activeView === tab.id 
                ? "border-brand-orange text-on-surface bg-on-surface/5" 
                : "border-transparent text-on-surface/30 hover:text-on-surface hover:border-on-surface/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-16">
        {activeView === 'trail' ? (
          <section className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b-8 border-on-surface pb-8 gap-4">
              <div className="space-y-2">
                <h3 className="text-5xl sm:text-7xl font-outfit font-black italic uppercase tracking-tighter text-on-surface drop-shadow-[5px_5px_0_var(--color-brand-cyan)]">The_Trail</h3>
                <p className="font-serif italic text-xl opacity-60">"A visual record of your seasonal journey through the field."</p>
              </div>
              <div className="bg-brand-orange text-white px-4 py-2 border-2 border-on-surface shadow-[4px_4px_0px_black] font-black text-[10px] uppercase tracking-widest italic shrink-0">BETA_V.01</div>
            </div>

            {/* The Trail Visual */}
            <div className="bg-white border-8 border-on-surface p-6 sm:p-12 shadow-[16px_16px_0px_black] relative overflow-hidden min-h-[400px] flex flex-col justify-center">
              {/* Grid Background */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(var(--color-on-surface) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              
              {/* The Path */}
              <div className="relative w-full h-8 bg-on-surface/5 border-4 border-on-surface shadow-[4px_4px_0px_black] rounded-full overflow-hidden mb-24">
                <div className="absolute inset-0 flex justify-between px-4 sm:px-12 items-center opacity-20">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-on-surface rounded-full" />
                  ))}
                </div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-brand-cyan shadow-[0_0_20px_var(--color-brand-cyan)]"
                />
              </div>

              {/* Marker Container */}
              <div className="relative w-full">
                {activeTrailMembers.length > 0 ? (
                  activeTrailMembers.map((member) => (
                    <motion.div
                      key={member.id}
                      initial={{ left: 0 }}
                      animate={{ left: `${member.progress}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                      className="absolute -top-32 -translate-x-1/2 flex flex-col items-center gap-4 group cursor-help z-20"
                    >
                      {/* Interaction Bubble */}
                      <div className="bg-on-surface text-white px-4 py-2 border-2 border-on-surface shadow-[4px_4px_0px_var(--color-brand-lime)] opacity-0 group-hover:opacity-100 transition-opacity absolute -top-24 whitespace-nowrap text-center">
                        <p className="text-[10px] font-black tracking-widest uppercase">{member.name}</p>
                        <p className="text-[8px] font-mono opacity-60">{member.progress}% COMPLETE</p>
                      </div>

                      {/* The Sticker Marker */}
                      <div className="relative">
                        <div className="w-20 h-20 bg-white border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center text-5xl rotate-[-3deg] group-hover:rotate-0 transition-transform">
                          {member.marker.emoji}
                        </div>
                        {member.isMe && (
                          <div className="absolute -top-2 -right-2 bg-brand-lime text-on-surface px-2 py-0.5 text-[8px] font-black italic border-2 border-on-surface shadow-[2px_2px_0px_black]">YOU</div>
                        )}
                      </div>

                      {/* Vertical Indicator Line */}
                      <div className="w-1 h-12 bg-on-surface/40 group-hover:bg-brand-orange transition-colors" />
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <p className="font-outfit text-xl font-black uppercase italic opacity-40 italic">Visibility: Hidden</p>
                    <button 
                      onClick={() => navigate('/profile')}
                      className="text-xs font-black uppercase tracking-widest text-brand-orange underline underline-offset-4"
                    >
                      Enable in Profile Settings
                    </button>
                  </div>
                )}
              </div>
              
              {/* Goal Marker */}
              <div className="absolute top-1/2 right-4 sm:right-12 -translate-y-[4.5rem] flex flex-col items-center gap-2">
                 <div className="w-12 h-12 bg-on-surface border-4 border-brand-lime text-brand-lime flex items-center justify-center rotate-45 shadow-[4px_4px_0px_black]">
                    <Trophy className="w-6 h-6 -rotate-45" />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] italic opacity-40 pt-4">SEASON GOAL</p>
              </div>
            </div>

            {/* Detailed Progress Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
               {activeTrailMembers.map(member => (
                 <React.Fragment key={member.id}>
                    <div className="bg-white border-4 border-on-surface p-8 shadow-[8px_8px_0px_black] space-y-4">
                       <p className="micro-label font-black opacity-40 uppercase tracking-widest">MISSION_LOG</p>
                       <div className="flex items-end justify-between">
                          <p className="text-6xl font-outfit font-black italic leading-none">{member.missions}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange">COMPLETE</p>
                       </div>
                       <p className="text-xs font-serif italic opacity-60">"Every footprint counts toward the final seasonal zine seed pool."</p>
                    </div>

                    <div className="bg-white border-4 border-on-surface p-8 shadow-[8px_8px_0px_black] space-y-4">
                       <p className="micro-label font-black opacity-40 uppercase tracking-widest">MEMORIES_LOCKED</p>
                       <div className="flex items-end justify-between">
                          <p className="text-6xl font-outfit font-black italic leading-none">{member.memories}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">ARCHIVED</p>
                       </div>
                       <p className="text-xs font-serif italic opacity-60">"Captured field data is encrypted until end-of-season zine synthesis."</p>
                    </div>

                    <div className="bg-white border-4 border-on-surface p-8 shadow-[8px_8px_0px_black] space-y-4">
                       <p className="micro-label font-black opacity-40 uppercase tracking-widest">UTILITY_TOKENS</p>
                       <div className="flex items-end justify-between">
                          <p className="text-6xl font-outfit font-black italic leading-none">
                            {member.showPoints ? member.tokens : '???'}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-lime">FIELD_XP</p>
                       </div>
                       {!member.showPoints && <p className="text-[8px] font-mono opacity-40 font-black italic">EXACT TOKEN COUNT HIDDEN BY PROFILE SETTINGS</p>}
                       <p className="text-xs font-serif italic opacity-60">"Current resource allocation for seasonal utility rewards."</p>
                    </div>
                 </React.Fragment>
               ))}
            </div>
            
            {/* Legend/Info */}
            <div className="border-t-4 border-on-surface/5 pt-12 text-center space-y-4">
               <p className="font-outfit text-sm italic opacity-40 uppercase font-black tracking-[0.3em]">Operational Trail Beta // Uplink: {new Date().toISOString().slice(0, 10)}</p>
               <p className="max-w-2xl mx-auto text-xs opacity-60 font-serif italic">
                 "The Big Board is a non-competitive visual trail representing your progression through the current field cycle.
                 Your status and token visibility can be managed via Bureau Settings. TODO: Integrate Real Crew Live Data."
               </p>
            </div>
          </section>
        ) : activeView === 'leaderboard' ? (
          <>
            {/* Progress Section */}
            <section className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500 relative px-1 sm:px-0">
              <div className="flex justify-between items-end border-b-4 sm:border-b-8 border-on-surface pb-4 sm:pb-8">
                 <h2 className="font-outfit text-3xl sm:text-5xl italic font-black uppercase tracking-tight text-on-surface">Season Status</h2>
                 <div className="bg-brand-lime text-on-surface px-4 sm:px-6 py-1.5 sm:py-2 border-2 border-on-surface font-black text-[10px] sm:text-[12px] uppercase tracking-widest italic rotate-3">Live Metrics</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-16 relative">
                {/* Players */}
                <div className={cn("space-y-6 sm:space-y-10 transition-all duration-700", !isCrewUnlocked && "blur-[8px] grayscale opacity-40 select-none pointer-events-none")}>
                  <div className="flex items-center gap-4">
                    <h3 className="font-outfit text-lg sm:text-2xl font-black text-brand-orange uppercase tracking-widest italic bg-on-surface px-4 sm:px-6 py-1.5 sm:py-2">Your Standing</h3>
                    <div className="h-1 flex-grow bg-on-surface/10" />
                  </div>
                  <div className="space-y-4 sm:space-y-6">
                    {(isCrewUnlocked ? playerRankings.slice(0, 10) : [1,2,3,4,5,6,7,8,9,10]).map((u: any, idx) => (
                      <div key={idx} className="flex items-center gap-4 sm:gap-6 group">
                        <span className="font-outfit text-xl sm:text-3xl font-black text-on-surface/10 group-hover:text-brand-orange transition-colors w-8 sm:w-12 shrink-0 italic leading-none">{(idx + 1).toString().padStart(2, '0')}</span>
                        <div className="w-10 h-10 sm:w-14 sm:h-14 border-2 sm:border-4 border-on-surface bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-[2px_2px_0px_black] sm:shadow-[4px_4px_0px_black] group-hover:scale-110 transition-transform">
                           {isCrewUnlocked && u.avatar ? <AvatarPreview avatar={u.avatar} size="xs" /> : <div className="w-full h-full bg-on-surface/5" />}
                        </div>
                        <div className="flex-grow border-b-2 sm:border-b-4 border-dashed border-on-surface/10 pb-2 sm:pb-4 flex justify-between items-end group-hover:border-on-surface transition-colors">
                           <div className="space-y-1 sm:space-y-2">
                               <p className="font-outfit text-lg sm:text-2xl font-black uppercase tracking-tight text-on-surface italic leading-none group-hover:text-brand-orange transition-colors">{isCrewUnlocked ? u.name : 'Agent Pending'}</p>
                              <p className="text-[10px] font-mono font-black opacity-50 uppercase tracking-widest">{isCrewUnlocked ? (u.fieldTypeName || 'EXPLORER') : 'CLASSIFIED'}</p>
                           </div>
                           <p className="font-outfit text-xl sm:text-3xl font-black italic text-on-surface leading-none shrink-0">{isCrewUnlocked ? u.points : '???'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Units */}
                <div className="space-y-6 sm:space-y-10">
                   <div className="flex items-center gap-4">
                     <h3 className="font-outfit text-lg sm:text-2xl font-black text-brand-lime uppercase tracking-widest italic bg-on-surface px-4 sm:px-6 py-1.5 sm:py-2">Crew Status</h3>
                     <div className="h-1 flex-grow bg-on-surface/10" />
                   </div>
                   {isCrewUnlocked ? (
                     <div className="space-y-4 sm:space-y-6">
                        {crewRankings.map((c, idx) => (
                          <div key={c.id} className="flex items-center gap-4 sm:gap-6 group">
                             <span className="font-outfit text-xl sm:text-3xl font-black text-on-surface/10 group-hover:text-brand-lime w-8 sm:w-10 shrink-0 italic leading-none">{(idx + 1).toString().padStart(2, '0')}</span>
                             <div className="flex-grow border-b-2 sm:border-b-4 border-dashed border-on-surface/10 pb-2 sm:pb-3 flex justify-between items-end group-hover:border-on-surface transition-colors">
                                <p className="font-outfit text-lg sm:text-2xl font-black uppercase tracking-tighter italic text-on-surface leading-none group-hover:text-brand-lime transition-colors">{c.name}</p>
                                <p className="font-outfit text-xl sm:text-3xl font-black italic text-on-surface leading-none shrink-0">{c.score}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <div className="bg-white border-4 sm:border-8 border-dashed border-on-surface/20 p-8 sm:p-12 text-center space-y-6 sm:space-y-8 shadow-[8px_8px_0px_white] sm:shadow-[12px_12px_0px_white] relative">
                        <div className="absolute inset-0 bg-on-surface/5 pointer-events-none" />
                        <Lock className="w-12 h-12 sm:w-16 sm:h-16 opacity-10 mx-auto" />
                         <p className="font-outfit text-base sm:text-lg italic opacity-40 uppercase font-black tracking-widest leading-tight">"Unit metrics are encrypted until your solo utility is verified."</p>
                        <div className="w-full h-3 sm:h-4 bg-on-surface/5 border-2 border-on-surface overflow-hidden shadow-[3px_3px_0px_black] sm:shadow-[4px_4px_0px_black]">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min((completedCoreChallenges / 3) * 100, 100)}%` }}
                             className="h-full bg-brand-orange" 
                           />
                        </div>
                        <p className="font-outfit text-[10px] sm:text-xs font-black opacity-60 uppercase tracking-[0.2em] italic">{Math.min(completedCoreChallenges, 3)}/3 CORE CHALLENGES COMPLETE</p>
                     </div>
                   )}
                </div>

                {!isCrewUnlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-4">
                    <div className="bg-white p-8 sm:p-12 border-4 sm:border-8 border-on-surface shadow-[12px_12px_0px_black] sm:shadow-[24px_24px_0px_black] text-center max-w-sm sm:max-w-md space-y-6 sm:space-y-8 pointer-events-auto -rotate-2">
                       <ShieldAlert className="w-16 h-16 sm:w-20 sm:h-20 text-brand-orange mx-auto" />
                       <div className="space-y-2 sm:space-y-4">
                         <h4 className="font-outfit text-3xl sm:text-5xl font-black uppercase tracking-tighter italic leading-none text-on-surface">Access Restricted</h4>
                         <p className="font-outfit text-sm sm:text-xl italic font-black uppercase tracking-widest opacity-40 leading-none">
                           Mission Required
                         </p>
                       </div>
                       <div className="flex items-center justify-center gap-4 sm:gap-6">
                         {[1, 2, 3].map((step) => (
                           <div 
                             key={step} 
                             className={cn(
                               "w-6 h-6 sm:w-8 sm:h-8 border-4 border-on-surface transition-all duration-500",
                               completedCoreChallenges >= step ? "bg-brand-orange rotate-45" : "bg-on-surface/5 scale-90"
                             )} 
                           />
                         ))}
                       </div>
                       <button 
                         onClick={() => navigate('/deck')}
                         className="w-full bureau-btn bg-on-surface text-brand-lime font-black py-4 shadow-[4px_4px_0px_var(--color-brand-orange)] sm:shadow-[8px_8px_0px_var(--color-brand-orange)] text-xs sm:text-sm"
                       >
                         Resume Mission
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Activity Feed */}
            <section className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-8">
               <div className="flex items-center gap-4 sm:gap-6">
                  <h3 className="font-outfit text-2xl sm:text-4xl italic font-black uppercase tracking-tighter text-on-surface">Recent Activity</h3>
                  <div className="h-2 flex-grow bg-on-surface/10" />
               </div>
               <div className="space-y-px bg-on-surface border-2 sm:border-4 border-on-surface shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] overflow-hidden">
                  {visibleActivity.length === 0 ? (
                    <div className="bg-white p-12 text-center space-y-4">
                       <p className="font-outfit text-xl sm:text-2xl font-black uppercase italic text-on-surface">No recent field notes yet.</p>
                       <p className="font-outfit text-xs sm:text-sm opacity-40 uppercase font-black tracking-widest leading-none">Complete a mission to start your activity log.</p>
                    </div>
                  ) : (
                    visibleActivity.map(event => (
                      <div key={event.id} className="flex gap-4 sm:gap-6 items-center p-4 sm:p-8 bg-white border-b-2 border-on-surface/5 last:border-b-0 hover:bg-on-surface/5 transition-colors group">
                         <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 sm:border-4 border-on-surface shadow-[3px_3px_0px_black] sm:shadow-[4px_4px_0px_black] bg-white group-hover:scale-105 transition-transform shrink-0">
                           <AvatarPreview avatar={(event as any).userAvatar || DEFAULT_AVATAR} size="xs" className="rounded-none h-full w-full object-cover" />
                         </div>
                         <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-center gap-2">
                               <div className="space-y-0.5 sm:space-y-1 min-w-0">
                                  <p className="font-outfit text-lg sm:text-xl font-black uppercase tracking-tighter italic text-on-surface leading-none truncate">
                                     {event.userName}
                                  </p>
                                  <p className="text-[9px] sm:text-[11px] font-mono font-black opacity-40 uppercase tracking-widest truncate">
                                     {event.description}
                                  </p>
                               </div>
                               <div className="flex items-center gap-3 sm:gap-6 italic shrink-0">
                                  <div className="text-xl sm:text-3xl font-black font-outfit text-brand-orange">+{event.points}XP</div>
                                  <ContentMenu targetId={event.id} targetType="entry" authorId={event.userId} authorName={event.userName} />
                               </div>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </section>

            {/* Sabotage Hub */}
            <SabotageHub />
          </>
        ) : activeView === 'crew' ? (
          /* Crew Section */
          <section className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-16">
            {!isCrewUnlocked ? (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-12 bg-white border-8 border-dashed border-on-surface/20 shadow-[16px_16px_0px_white] relative overflow-hidden group">
                <div className="absolute inset-0 bg-on-surface/5 pointer-events-none" />
                <ShieldAlert className="w-24 h-24 text-brand-orange mx-auto group-hover:rotate-12 transition-transform" />
                <div className="space-y-6 relative z-10">
                  <h2 className="font-outfit text-4xl sm:text-6xl font-black uppercase tracking-tighter leading-none text-on-surface">Unit Access Locked</h2>
                  <p className="font-outfit text-xl sm:text-2xl italic font-black uppercase tracking-widest opacity-40 leading-none">Complete onboarding Missions to unlock unit access.</p>
                </div>
                <div className="w-full max-w-md space-y-6 relative z-10">
                  <div className="h-4 bg-on-surface/5 border-2 border-on-surface shadow-[4px_4px_0px_black] overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((onboardingCompletedCount / 3) * 100, 100)}%` }}
                      className="h-full bg-brand-orange" 
                    />
                  </div>
                  <div className="flex justify-center gap-8">
                    {[1, 2, 3].map((step) => (
                      <div 
                        key={step} 
                        className={cn(
                          "w-6 h-6 border-4 border-on-surface transition-all duration-500",
                          onboardingCompletedCount >= step ? "bg-brand-orange scale-110" : "bg-on-surface/5 rotate-45"
                        )} 
                      />
                    ))}
                  </div>
                  <p className="font-outfit text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-brand-orange italic">{Math.min(onboardingCompletedCount, 3)} / 3 ONBOARDING MISSIONS</p>
                  
                  <div className="pt-6">
                    <button 
                      onClick={() => navigate('/deck')} 
                      className="bureau-btn bg-brand-orange text-white hover:bg-on-surface hover:text-white transition-colors uppercase tracking-[0.2em] px-8 py-3 font-black shadow-[4px_4px_0px_black]"
                    >
                      Go to Onboarding Deck
                    </button>
                  </div>
                </div>
              </div>
            ) : crew ? (
              <div className="space-y-12">
                 {/* Crew Sub-Nav */}
                 <div className="flex gap-2 sm:gap-4 border-b-4 sm:border-b-8 border-on-surface pb-0 flex-nowrap overflow-x-auto no-scrollbar">
                    {crewTabs.map(tab => (
                      <button
                         key={tab.id}
                         onClick={() => setCrewTab(tab.id as any)}
                         className={cn(
                           "px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-3 font-outfit uppercase tracking-[0.2em] text-[9px] sm:text-[11px] transition-all border-b-4 sm:border-b-8 font-black shrink-0",
                           crewTab === tab.id 
                             ? "border-brand-orange text-on-surface scale-105" 
                             : "border-transparent text-on-surface/30 hover:text-on-surface hover:border-on-surface/10"
                         )}
                       >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                 </div>

                 {crewTab === 'home' && (
                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-500">
                       <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
                          <div className="w-40 h-40 bg-white border-8 border-on-surface shadow-[12px_12px_0px_black] flex items-center justify-center overflow-hidden -rotate-3 hover:rotate-0 transition-transform group">
                             {crew.badge ? <img src={crew.badge || undefined} className="w-full h-full object-cover" /> : <Users className="w-20 h-20 text-on-surface/10 group-hover:text-on-surface transition-colors" />}
                          </div>
                          <div className="space-y-4 text-center md:text-left flex-1">
                             <div className="inline-block bg-brand-orange text-white px-3 py-1 border-2 border-on-surface font-black text-[10px] uppercase tracking-widest italic shadow-[4px_4px_0px_black]">Field Unit</div>
                             <h2 className="font-outfit text-4xl sm:text-7xl uppercase tracking-tighter leading-none italic font-black text-on-surface">{crew.name}</h2>
                             <div className="flex justify-center md:justify-start gap-3 sm:gap-4 pt-1 sm:pt-2 font-outfit text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-black italic text-on-surface/40">
                                <span className="bg-on-surface text-brand-lime px-3 py-1 border-2 border-on-surface -rotate-2">EST. 2026</span>
                                <span className="bg-brand-lime text-on-surface px-3 py-1 border-2 border-on-surface rotate-2">ACTIVE</span>
                             </div>
                          </div>
                       </div>

                       <section className="space-y-10">
                          <div className="flex items-center gap-6">
                            <h3 className="font-outfit text-2xl sm:text-4xl italic uppercase tracking-tighter text-on-surface font-black">Operational Members</h3>
                            <div className="h-2 flex-grow bg-on-surface/10" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                             {crew.members.map((m, i) => (
                                <div key={i} className="bg-white border-4 border-on-surface p-6 flex items-center gap-6 shadow-[8px_8px_0px_black] hover:-translate-y-1 transition-all group">
                                   <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-lime border-4 border-on-surface flex items-center justify-center font-outfit font-black text-base sm:text-lg italic -rotate-3 group-hover:rotate-0 transition-transform">
                                      {m.slice(0, 2).toUpperCase()}
                                   </div>
                                   <div className="flex-1 space-y-1 text-left">
                                      <p className="font-outfit text-xl sm:text-2xl uppercase tracking-tighter italic font-black text-on-surface">Agent {m.slice(0, 8)}</p>
                                      <p className="text-[10px] font-mono font-black opacity-40 uppercase tracking-widest text-brand-orange">Role: Field Scout</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </section>

                       <section className="space-y-10">
                          <div className="flex items-center gap-6">
                            <h3 className="font-outfit text-2xl sm:text-4xl italic uppercase tracking-tighter text-on-surface font-black">Unit Artifacts</h3>
                            <div className="h-2 flex-grow bg-on-surface/10" />
                          </div>
                          <CrewArtifactsGallery artifacts={crewArtifacts} />
                       </section>
                    </div>
                 )}

                 {crewTab === 'lore' && (
                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-500">
                       <section className="space-y-10">
                          <div className="flex items-center gap-6">
                            <h3 className="font-outfit text-2xl sm:text-4xl italic uppercase tracking-tighter text-on-surface font-black">Seasonal Highlights</h3>
                            <div className="h-2 flex-grow bg-on-surface/10" />
                            <Sparkles className="w-8 h-8 text-brand-orange" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {[
                                { label: 'Suspicious Activity', value: lore?.highlights?.mostSuspiciousEntry ? `Entry ${lore.highlights.mostSuspiciousEntry.slice(-4).toUpperCase()}` : 'Minimal anomalies recorded.', color: 'var(--color-brand-lime)' },
                                { label: 'Collective Comeback', value: lore?.highlights?.biggestComeback || 'Steady state maintained.', color: 'var(--color-brand-orange)' },
                                { label: 'Chaos Metric', value: lore?.highlights?.mostChaoticTrip || 'Fieldtrip excellence achieved.', color: 'var(--color-brand-cyan)' },
                                { label: 'Compliance Level', value: lore?.highlights?.mostFieldChecksSurvived || 'High (Zero violations)', color: 'var(--color-on-surface)' },
                             ].map(h => (
                                <div key={h.label} className="bg-white border-4 border-on-surface p-10 shadow-[8px_8px_0px_black] relative group">
                                   <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: h.color }} />
                                   <p className="micro-label font-black opacity-40 mb-4">{h.label.toUpperCase()}</p>
                                   <p className="font-outfit text-xl sm:text-3xl italic font-black uppercase text-on-surface leading-tight leading-none group-hover:text-brand-orange transition-colors">{h.value}</p>
                                </div>
                             ))}
                          </div>
                       </section>

                       <section className="space-y-10">
                          <div className="flex items-center gap-6">
                            <h3 className="font-outfit text-2xl sm:text-4xl italic uppercase tracking-tighter text-on-surface font-black">Collective Record</h3>
                            <div className="h-2 flex-grow bg-on-surface/10" />
                          </div>
                          <div className="space-y-6">
                             {lore?.insideJokes?.length ? lore.insideJokes.map((joke, i) => (
                                <div key={i} className="bg-white border-4 border-on-surface p-8 shadow-[12px_12px_0px_var(--color-brand-lime)] relative group">
                                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-100 transition-opacity">
                                      <MessageSquare className="w-12 h-12 text-on-surface" />
                                   </div>
                                   <p className="font-outfit text-xl sm:text-3xl italic font-black text-on-surface uppercase tracking-tight">"{joke}"</p>
                                </div>
                             )) : (
                                <p className="font-outfit text-lg sm:text-2xl italic opacity-40 text-center py-12 uppercase tracking-widest leading-none">Awaiting updates. No recent notes.</p>
                             )}
                          </div>
                       </section>
                    </div>
                 )}

                 {crewTab === 'stats' && (
                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-500">
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                          {[
                             { label: 'Approved', val: lore?.seasonStats?.S1?.totalApprovedEntries || 0, icon: Shield, color: 'var(--color-brand-lime)' },
                             { label: 'Questioned', val: lore?.seasonStats?.S1?.totalRejectedEntries || 0, icon: ShieldAlert, color: 'var(--color-error)' },
                             { label: 'Weekly Score', val: crewStanding?.totalScore || 0, icon: Trophy, color: 'var(--color-brand-orange)' },
                             { label: 'Weekly Rank', val: crewRank > 0 ? `#${crewRank}` : '---', icon: BarChart3, color: 'var(--color-brand-cyan)' },
                          ].map(stat => (
                             <div key={stat.label} className="bg-white border-4 border-on-surface p-8 flex flex-col items-center justify-center space-y-4 shadow-[8px_8px_0px_black] relative group">
                                <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: stat.color }} />
                                <stat.icon className="w-10 h-10 opacity-20 group-hover:opacity-100 transition-opacity" style={{ color: stat.color }} />
                                <p className="text-3xl sm:text-5xl italic font-black leading-none text-on-surface">{stat.val}</p>
                                <p className="micro-label font-black opacity-40 uppercase tracking-widest">{stat.label}</p>
                             </div>
                          ))}
                       </div>
                       
                       <div className="bg-white border-8 border-on-surface p-12 shadow-[16px_16px_0px_black] relative overflow-hidden h-80 flex items-center justify-center">
                          <div className="absolute inset-0 opacity-5 flex flex-col justify-around pointer-events-none">
                            {[...Array(10)].map((_, i) => <div key={i} className="h-0.5 w-full bg-on-surface" />)}
                            <div className="absolute inset-0 flex justify-around">
                               {[...Array(10)].map((_, i) => <div key={i} className="w-0.5 h-full bg-on-surface" />)}
                            </div>
                          </div>
                          <div className="text-center space-y-6 relative z-10">
                             <BarChart3 className="w-20 h-20 opacity-10 mx-auto" />
                             <div className="space-y-4">
                               <p className="font-outfit text-xl sm:text-3xl uppercase tracking-tighter italic font-black text-on-surface">Unlock More Stats</p>
                               <p className="font-outfit text-sm sm:text-lg italic opacity-40 uppercase font-black tracking-widest leading-none">Seasonal tracking will expand as field cycles complete.</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {crewTab === 'dispatch' && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                       {!dispatch ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center space-y-8 bg-paper border-8 border-dashed border-on-surface/20 shadow-[16px_16px_0px_var(--color-on-surface)] opacity-40">
                             <Lock className="w-20 h-20 text-on-surface" />
                             <div className="space-y-4">
                                <h2 className="font-outfit text-3xl sm:text-5xl uppercase tracking-tighter italic font-black">Updates Locked</h2>
                                <p className="font-outfit text-base sm:text-xl italic opacity-60 uppercase font-black tracking-widest leading-none">"Notes issued upon seasonal closure. Keep at it."</p>
                             </div>
                          </div>
                       ) : (
                          <div className="bg-white border-8 border-on-surface p-16 space-y-16 shadow-[24px_24px_0px_black] relative overflow-hidden">
                             <div className="absolute top-12 right-12 opacity-40 scale-125 z-20">
                                <div className="w-40 h-40 bg-brand-orange text-white border-8 border-on-surface flex items-center justify-center rotate-12 font-black text-center text-xs uppercase tracking-widest shadow-[12px_12px_0px_black]">Certified<br/>Season 01</div>
                             </div>

                             <header className="space-y-6 border-b-8 border-on-surface pb-12 relative z-10">
                                <div className="w-fit bg-on-surface text-brand-lime px-4 py-1 border-2 border-on-surface font-black text-[11px] uppercase tracking-[0.4em] italic mb-4">Recent Field Notes // S01</div>
                                <h2 className="font-outfit text-huge uppercase tracking-tighter leading-none italic font-black text-on-surface">{crew.name}</h2>
                                <div className="flex justify-between items-end">
                                   <div className="space-y-2">
                                      <p className="font-outfit text-xl sm:text-3xl font-black uppercase text-on-surface leading-none">Season Standing: #{dispatch.finalRank}</p>
                                      <p className="font-display text-base sm:text-xl font-black uppercase text-brand-orange leading-none">Score: {dispatch.finalScore}XP</p>
                                   </div>
                                   <div className="w-40 h-0.5 bg-on-surface/20" />
                                </div>
                             </header>

                             <div className="space-y-12 relative z-10">
                                <p className="font-outfit text-2xl sm:text-4xl italic font-black text-on-surface leading-tight uppercase tracking-tight">"{dispatch.summary.recapParagraph}"</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                   <div className="space-y-8">
                                      <h4 className="font-outfit text-2xl sm:text-3xl italic font-black uppercase bg-on-surface text-white px-4 py-1 w-fit -rotate-2">Unit Awards</h4>
                                      <ul className="space-y-6">
                                         {dispatch.summary.awards.map(a => (
                                           <li key={a} className="flex items-center gap-4 group">
                                             <div className="w-10 h-10 border-4 border-on-surface bg-brand-lime flex items-center justify-center font-black group-hover:rotate-12 transition-transform">★</div>
                                             <span className="font-outfit text-xl sm:text-2xl uppercase tracking-tighter font-black text-on-surface">{a}</span>
                                           </li>
                                         ))}
                                      </ul>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )}
                    </div>
                 )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-12 bg-white border-8 border-dashed border-on-surface/20 shadow-[16px_16px_0px_white]">
                 <Users className="w-24 h-24 text-on-surface/10" />
                 <div className="space-y-6">
                   <h2 className="font-outfit text-4xl sm:text-6xl font-black uppercase tracking-tighter italic leading-none text-on-surface">No Unit Affiliation</h2>
                   <p className="font-outfit text-lg sm:text-xl italic opacity-60 uppercase font-black tracking-widest leading-none">Standalone operations have limits. Join a unit to begin collective recon.</p>
                 </div>
                 <button onClick={() => navigate('/frontlines')} className="bureau-btn bg-brand-orange text-white px-12 py-4 shadow-[8px_8px_0px_black]">Find Your Crew</button>
              </div>
            )}
          </section>
        ) : (
          /* Badges Section */
          <section className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-12 sm:space-y-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 sm:gap-16">
               <div className="lg:col-span-2 space-y-8 sm:space-y-10">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <h3 className="font-outfit text-2xl sm:text-4xl italic uppercase tracking-tighter text-on-surface font-black">Your Badge Collection</h3>
                    <div className="h-1 sm:h-2 flex-grow bg-on-surface/10" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:grid-cols-3 sm:gap-8">
                     {/* Existing badges placeholder */}
                     {[...Array(6)].map((_, i) => (
                       <div key={i} className="aspect-square bg-white border-2 sm:border-4 border-dashed border-on-surface/20 flex flex-col items-center justify-center p-4 sm:p-8 group hover:border-on-surface transition-all">
                          <Trophy className="w-8 h-8 sm:w-16 sm:h-16 text-on-surface/10 mb-2 sm:mb-4 group-hover:text-brand-orange transition-colors" />
                          <p className="font-outfit text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-20 group-hover:opacity-100 text-center">Locked Badge {i+1}</p>
                       </div>
                     ))}
                  </div>
               </div>
               
               <div className="space-y-8 sm:space-y-10">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <h3 className="font-outfit text-2xl sm:text-4xl italic uppercase tracking-tighter text-on-surface font-black shrink-0">Rank Progression</h3>
                    <div className="h-1 sm:h-2 flex-grow bg-on-surface/10" />
                  </div>
                  <div className="space-y-4 sm:space-y-6">
                     {[
                        { label: 'Greenhorn agent', unlocked: true },
                        { label: 'Evidence specialist', unlocked: true },
                        { label: 'Veteran Operative', unlocked: false },
                        { label: 'Bureau Legend', unlocked: false },
                     ].map((rank, i) => (
                        <div key={i} className={cn(
                           "p-6 sm:p-8 border-2 sm:border-4 transition-all flex items-center justify-between shadow-[4px_4px_0px_black] sm:shadow-[8px_8px_0px_black] group",
                           rank.unlocked ? "border-on-surface bg-brand-lime rotate-1 hover:rotate-0" : "border-on-surface/10 bg-white opacity-40 grayscale"
                        )}>
                           <p className="font-outfit text-xl sm:text-2xl font-black uppercase tracking-tighter italic text-on-surface leading-none">{rank.label}</p>
                           {rank.unlocked ? <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-on-surface group-hover:rotate-12 transition-transform" /> : <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-on-surface/20" />}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Helpers for background assets
function HibiscusDecor() {
  return (
    <>
      <Hibiscus className="absolute top-10 right-[-40px] w-64 h-64 opacity-10 -z-10" />
      <Hibiscus className="absolute bottom-20 left-[-60px] w-80 h-80 opacity-5 -z-10 rotate-12" />
      <ChromeStar className="absolute top-40 left-10 w-12 h-12 opacity-30 -z-10" />
    </>
  );
}

function DiamondDecor() {
  return (
    <>
      <DiamondStar className="absolute top-20 left-[-20px] w-48 h-48 text-white opacity-5 -z-10" />
      <Sparkle className="absolute top-1/4 right-0 w-12 h-12 text-white opacity-10 animate-pulse -z-10" />
      <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
    </>
  );
}

function HeatDecor() {
  return (
    <>
      <SunFlare className="absolute top-40 right-[-100px] w-80 h-80" />
      <div className="absolute inset-x-0 bottom-1/4 h-1 bg-white/20 -skew-y-3 -z-10" />
    </>
  );
}
