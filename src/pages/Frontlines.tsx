import { useApp } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { Card, Sticker } from '../components/UI';
import { ShieldAlert, Timer, Trophy, Send, Sparkles, Waves, Sun, Flame, MoreHorizontal, Shield, MessageSquare } from 'lucide-react';
import { cn, safeToDate, formatSafeDate } from '../lib/utils';
import { calculateLeaderboard } from '../logic/scoringLogic';
import { isLeaderboardVisible } from '../logic/progression';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import { getLeaderboardPage, UserProfile } from '../services/userService';
import { subscribeToRecentScoreEvents } from '../services/activityService';
import { getWeeklySummary } from '../services/summaryService';
import { ScoreEvent, WeeklySummary } from '../types/game';
import { ContentMenu } from '../components/ContentMenu';
import { FIELD_TYPES } from '../constants';
import { AvatarPreview } from '../components/AvatarPreview';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { SabotageHub } from '../components/SabotageHub';
import { getServerDate } from '../services/timeService';

export default function FrontlinesPage() {
  const { 
    isFieldCheckUnlocked, isCrewUnlocked, points, useFieldCheck, 
    canFieldCheckNow, fieldCheckEvents, standings, soloTripsCount, 
    fieldType, user, profile, currentWeekNumber, canCallFieldCheck,
    activeSeason, completedCoreChallenges
  } = useApp();

  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    if (!user || !activeSeason?.id || !currentWeekNumber) return;
    async function loadSummary() {
       const summary = await getWeeklySummary(activeSeason!.id, currentWeekNumber);
       setWeeklySummary(summary);
    }
    loadSummary();
  }, [user, activeSeason?.id, currentWeekNumber]);

  const leaderboard = calculateLeaderboard([]); // For now, empty or mock if needed
  
  const visible = isLeaderboardVisible({
    userId: user?.uid || null,
    email: user?.email || null,
    points,
    soloTripsCount: soloTripsCount || 0,
    completedCoreChallenges: completedCoreChallenges || 0,
    onboardingComplete: !!fieldType,
    fieldType,
    isAdmin: false, // Will be checked in helper
    currentDate: getServerDate(),
  });
  const [fieldCheckSent, setFieldCheckSent] = useState(false);
  const { skin, frankieMode } = useTheme();

  // Paginated state for full board
  const [fullBoard, setFullBoard] = useState<UserProfile[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [recentActivity, setRecentActivity] = useState<ScoreEvent[]>([]);

  useEffect(() => {
    return subscribeToRecentScoreEvents(10, setRecentActivity);
  }, []);

  const { blockedIds } = useApp();
  const visibleActivity = recentActivity.filter(event => !blockedIds.includes(event.userId));

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
  }, [user]);

  const loadMore = async () => {
    if (loadingBatch || !hasMore) return;
    setLoadingBatch(true);
    const result = await getLeaderboardPage(15, lastVisible);
    if (result) {
      setFullBoard(prev => [...prev, ...result.docs]);
      setLastVisible(result.lastVisible);
      setHasMore(result.docs.length === 15);
    }
    setLoadingBatch(false);
  };

  const lastFieldCheck = fieldCheckEvents[0];
  const isBaja = skin.id === 'baja-bratz';
  const isDiamond = skin.id === 'slippery-diamond';
  const isHeat = skin.id === 'heatwave';

  const isQuiet = profile?.quietCrewMode;

  const crewRankings = weeklySummary ? Object.entries(weeklySummary.crewStats).map(([id, stats]: [string, any]) => ({
    id,
    name: stats.crewName,
    score: stats.totalScore
  })).sort((a, b) => b.score - a.score) : [];

  const playerRankings = weeklySummary ? Object.entries(weeklySummary.playerStats).map(([id, stats]: [string, any]) => ({
    id,
    name: stats.userName,
    points: stats.points,
    fieldTypeName: stats.fieldTypeName 
  })).sort((a, b) => b.points - a.points) : (fullBoard as any[]);

  return (
    <div className="pb-40 px-6 pt-12 space-y-24 max-w-5xl mx-auto overflow-hidden relative">
      {!visible ? (
        <div className="flex flex-col items-center justify-center p-12 py-24 text-center space-y-12 bg-white min-h-[70vh] border-8 border-on-surface shadow-[24px_24px_0px_var(--color-brand-orange)] relative overflow-hidden">
           {/* Decorative Background Elements */}
           <div className="absolute top-0 left-0 w-full h-4 bg-brand-lime" />
           <div className="absolute -top-24 -right-24 w-64 h-64 border-8 border-on-surface rounded-full opacity-5 rotate-12" />
           <div className="absolute -bottom-24 -left-24 w-64 h-64 border-8 border-on-surface rounded-full opacity-5 -rotate-12" />

           <div className="w-32 h-32 bg-brand-orange border-4 border-on-surface flex items-center justify-center shadow-[10px_10px_0px_black] rotate-6 relative z-10">
             <ShieldAlert className="w-16 h-16 text-white stroke-[3]" />
           </div>
           <div className="space-y-8 relative z-10">
             <h2 className="font-display text-huge text-[6rem] md:text-[8rem] italic uppercase tracking-tight font-bold leading-tight">Scoreboard Locked</h2>
             <div className="bg-brand-lime p-8 border-4 border-on-surface shadow-[8px_8px_0px_black] -rotate-1 max-w-xl mx-auto">
               <p className="font-display text-2xl md:text-3xl italic leading-relaxed text-on-surface">"The Bureau only declassifies high-standing agents. Reach 50 points to access the Scoreboard."</p>
             </div>
           </div>
           <div className="w-full max-w-lg space-y-4 relative z-10">
             <div className="w-full h-12 bg-white border-4 border-on-surface shadow-[6px_6px_0px_black] overflow-hidden p-1.5">
               <div className="h-full bg-brand-lime transition-all duration-1000 border-2 border-on-surface shadow-[inset_0_4px_0_rgba(255,107,0,0.2)]" style={{ width: `${Math.min((points / 50) * 100, 100)}%` }} />
             </div>
             <p className="micro-label font-bold text-sm text-center bg-on-surface text-white py-2 px-6 inline-block mx-auto">{points} / 50 STANDING_POINTS</p>
           </div>
        </div>
      ) : (
        <>
          {isBaja && !frankieMode && (
        <>
          <Hibiscus className="absolute top-10 right-[-40px] w-64 h-64 opacity-10 -z-10" />
          <Hibiscus className="absolute bottom-20 left-[-60px] w-80 h-80 opacity-5 -z-10 rotate-12" />
          <ChromeStar className="absolute top-40 left-10 w-12 h-12 opacity-30 -z-10" />
        </>
      )}

      {isDiamond && !frankieMode && (
        <>
          <DiamondStar className="absolute top-20 left-[-20px] w-48 h-48 text-white opacity-5 -z-10" />
          <Sparkle className="absolute top-1/4 right-0 w-12 h-12 text-white opacity-10 animate-pulse -z-10" />
          <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
        </>
      )}

      {isHeat && !frankieMode && (
        <>
          <SunFlare className="absolute top-40 right-[-100px] w-80 h-80" />
          <div className="absolute inset-x-0 bottom-1/4 h-1 bg-white/20 -skew-y-3 -z-10" />
        </>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 relative border-b-8 border-on-surface pb-12">
        <div className="space-y-6 text-left">
          <div className="flex items-center gap-3">
             <span className="w-4 h-4 bg-brand-lime animate-pulse border-2 border-on-surface shadow-[2px_2px_0px_black]" />
             <p className="micro-label font-black tracking-[0.4em] bg-on-surface text-white px-3 py-1">
               {isBaja ? 'Coastal Heat List' : 
                isDiamond ? 'Elite Shine Index' :
                isHeat ? 'The Hot List' : 
                'MISSION_CONTROL // SIGNAL_STIR'}
             </p>
          </div>
          <h1 className={cn(
            "text-huge leading-[0.8] font-black uppercase tracking-tighter italic",
            isBaja ? "text-baja-pink drop-shadow-[4px_4px_0px_#40e0d0]" : 
            isDiamond ? "liquid-chrome bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" :
            isHeat ? "text-white drop-shadow-[0_4px_#ff007f] font-display" :
            "text-on-surface"
          )}>
            {isBaja ? 'High Tide' : isDiamond ? 'Diamond Rank' : isHeat ? 'Heat Rank' : 'Frontlines'}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="px-6 py-2 bg-brand-lime text-on-surface font-display italic text-2xl border-4 border-on-surface shadow-[6px_6px_0px_black]">WEEK {currentWeekNumber}</span>
            <span className="px-4 py-1.5 border-2 border-on-surface bg-white font-mono text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_black]">STATUS_UPSTREAM</span>
          </div>
          {!isBaja && !isDiamond && !isHeat && (
            <div className="bg-white p-6 border-4 border-on-surface shadow-[10px_10px_0px_var(--color-brand-lime)] max-w-lg -rotate-1 mt-6">
              <p className="font-display italic text-2xl text-on-surface leading-tight">"The field is active. Standing is everything. Document the vibe with prejudice."</p>
            </div>
          )}
          {isQuiet && (
            <div className="flex items-center gap-2 text-brand-orange animate-pulse">
               <Shield className="w-5 h-5 stroke-[2.5]" />
               <span className="font-mono text-[10px] uppercase font-black tracking-widest text-brand-orange">Quiet Mode Active // Visuals Filtered</span>
            </div>
          )}
        </div>
        <div className="text-left md:text-right bg-white p-8 border-4 border-on-surface shadow-[12px_12px_0px_black] relative">
          <div className="absolute top-0 right-0 w-8 h-8 bg-brand-lime border-l-4 border-b-4 border-on-surface" />
          <p className="micro-label opacity-40 font-black tracking-widest mb-2">
            {isBaja ? 'YOUR GLOW' : isDiamond ? 'GLARE DEPTH' : isHeat ? 'VIBE LEVEL' : 'STANDING_UNITS'}
          </p>
          <div className="flex items-baseline gap-2 justify-start md:justify-end">
            <p className={cn(
              "text-huge text-8xl leading-[0.8] font-black italic",
              isBaja ? "text-baja-aqua" : 
              isDiamond ? "text-white" :
              isHeat ? "text-heat-mango" :
              "text-brand-orange drop-shadow-[4px_4px_0px_black]"
            )}>
              {points}
            </p>
          </div>
        </div>
      </header>

      {/* Season Rankings */}
      <section className="space-y-8">
        <div className={cn(
          "flex justify-between items-end border-b-4 pb-4",
          isBaja ? "border-baja-pink" : 
          isDiamond ? "border-white/20" :
          isHeat ? "border-white" :
          "border-on-surface relative"
        )}>
          <div className="absolute -top-6 left-0 flex items-center gap-2">
             <span className="text-[10px] font-black uppercase text-brand-orange italic">LOG_ENTRY_01.HV</span>
             <div className="w-12 h-[1px] bg-brand-orange opacity-30" />
          </div>
          <h2 className={cn(
            "text-4xl",
            isBaja ? "text-baja-pink font-display uppercase font-normal tracking-wide" :
            isDiamond ? "text-white font-mono uppercase tracking-widest font-light" :
            isHeat ? "text-white font-display uppercase tracking-tight" : 
            "font-display uppercase text-on-surface tracking-tight font-bold"
          )}>
            {isBaja ? 'The Heat List' : isDiamond ? 'The Shine Board' : isHeat ? 'Splash Rankings' : 'Live Leadboard'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-lime" />
            <Sticker color="black" className="micro-label shadow-[2px_2px_0px_var(--color-brand-lime)]">
              {isBaja ? 'SUNKISSED' : isDiamond ? 'POLISHED' : isHeat ? 'WET' : 'SIGNAL STABLE'}
            </Sticker>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Individual Rankings */}
          <div className="space-y-4">
            <h3 className={cn("inline-block micro-label bg-brand-orange text-white px-3 py-1 border-2 border-on-surface shadow-[4px_4px_0px_black]", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-white" : "")}>
              {isBaja ? 'BEACH BABES' : isDiamond ? 'MIRROR ENTITIES' : isHeat ? 'POOLSIDE SQUAD' : 'GET PROOF'}
            </h3>
            <div className="space-y-8 mt-8">
              {playerRankings.map((user: any, idx) => (
                <div key={user.id} className="flex items-center gap-6 group">
                  <span className={cn(
                    "font-display text-5xl italic transition-colors w-12",
                    isBaja ? "text-baja-pink/20 group-hover:text-baja-aqua" : 
                    isDiamond ? "text-white/10 group-hover:text-white" :
                    isHeat ? "text-white/20 group-hover:text-heat-pink" :
                    "text-on-surface/10 group-hover:text-on-surface font-bold"
                  )}>{(idx + 1).toString().padStart(2, '0')}</span>
                  
                  <div className="shrink-0">
                    <AvatarPreview avatar={user.avatar || DEFAULT_AVATAR} size="sm" className="rounded-none border-2 border-on-surface shadow-[4px_4px_0px_var(--color-brand-lime)]" />
                  </div>

                  <div className={cn(
                    "flex-grow border-b-4 border-on-surface/10 pb-4 flex justify-between items-end transition-all",
                    isBaja ? "border-baja-aqua/30" : 
                    isDiamond ? "border-white/10" :
                    isHeat ? "border-white/30" :
                    "group-hover:border-on-surface group-hover:bg-brand-lime/10 px-4 -mx-4 group-hover:translate-x-2"
                  )}>
                    <div>
                      <p className={cn(
                        "font-display text-2xl italic uppercase font-bold transition-all", 
                        isBaja ? "text-baja-pink" : 
                        isDiamond ? "text-white group-hover:text-diamond-blue" :
                        isHeat ? "text-white group-hover:translate-x-2" : 
                        "text-on-surface"
                      )}>{user.name}</p>
                      <p className={cn(
                        "micro-label text-[10px] font-bold", 
                        isBaja ? "text-baja-coral" : 
                        isDiamond ? "text-white/30" :
                        isHeat ? "text-white font-display" : 
                        "text-brand-orange"
                      )}>{user.fieldTypeName || user.fieldType?.replace('-', ' ')}</p>
                    </div>
                    <p className={cn(
                      "font-display text-4xl italic font-bold", 
                      isBaja ? "text-baja-aqua" : 
                      isDiamond ? "text-white" :
                      isHeat ? "text-white underline decoration-heat-mango decoration-4" :
                      "text-on-surface"
                    )}>{user.points}</p>
                  </div>
                </div>
              ))}

              {hasMore && (
                <button 
                  onClick={loadMore}
                  disabled={loadingBatch}
                  className="w-full py-4 border-2 border-dashed border-on-surface/10 flex items-center justify-center gap-2 font-display text-[10px] tracking-widest uppercase opacity-40 hover:opacity-100 hover:border-brand-orange/40 hover:bg-brand-orange/5 transition-all text-on-surface"
                >
                  <MoreHorizontal className={cn("w-4 h-4", loadingBatch && "animate-pulse")} />
                  {loadingBatch ? 'Calibrating Batch...' : 'Load More Entries'}
                </button>
              )}
              <div className="flex items-center gap-6 group pt-4">
                <span className={cn(
                  "font-display text-4xl w-8", 
                  isBaja ? "text-baja-aqua" : 
                  isDiamond ? "text-white/50" :
                  isHeat ? "text-white" :
                  "text-brand-orange"
                )}>--</span>
                <div className="shrink-0">
                  <AvatarPreview avatar={profile?.avatar || DEFAULT_AVATAR} size="sm" className="rounded-full border border-brand-orange/40 shadow-[0_0_10px_rgba(226,149,120,0.2)]" />
                </div>
                <div className={cn(
                  "flex-grow border-b-2 pb-2 flex justify-between items-end",
                  isBaja ? "border-baja-pink" : 
                  isDiamond ? "border-white/40" :
                  isHeat ? "border-white shadow-[0_4px_white]" :
                  "border-brand-orange"
                )}>
                  <div>
                    <p className={cn(
                      "font-display text-2xl uppercase tracking-tighter", 
                      isBaja ? "text-baja-pink" : 
                      isDiamond ? "text-white" :
                      isHeat ? "text-white" : 
                      "text-on-surface"
                    )}>YOU // ASSET</p>
                    <p className={cn(
                      "micro-label text-[8px]", 
                      isBaja ? "text-baja-coral" : 
                      isDiamond ? "text-white/60" :
                      isHeat ? "text-white font-display" : 
                      "text-on-surface opacity-60"
                    )}>ACTIVE_STATUS</p>
                  </div>
                  <p className={cn(
                    "font-display text-3xl", 
                    isBaja ? "text-baja-aqua" : 
                    isDiamond ? "text-white" :
                    isHeat ? "text-white" :
                    "text-brand-orange"
                  )}>{points}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Crew Rankings */}
          <div className="space-y-6">
            <h3 className={cn("micro-label", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-white" : "text-brand-orange")}>
              {isBaja ? 'SURF CREWS' : isDiamond ? 'GLOSS SYNDICATES' : isHeat ? 'POOLSIDE GANGS' : 'OPERATIONAL UNITS'}
            </h3>
            {isCrewUnlocked ? (
              <div className="space-y-4">
                {crewRankings.map((crew, idx) => (
                  <div key={crew.id} className="flex items-center gap-6 group">
                    <span className={cn(
                      "font-display text-4xl transition-colors",
                      isBaja ? "text-baja-pink/20 group-hover:text-baja-aqua" : 
                      isDiamond ? "text-white/10 group-hover:text-white" :
                      isHeat ? "text-white/20 group-hover:text-heat-pink" :
                      "text-on-surface/10 group-hover:text-on-surface"
                    )}>0{idx + 1}</span>
                    <div className={cn(
                      "flex-grow border-b border-dashed pb-2 flex justify-between items-end transition-colors",
                      isBaja ? "border-baja-aqua/30" : 
                      isDiamond ? "border-white/10" :
                      isHeat ? "border-white/30" :
                      "border-on-surface/10 group-hover:border-on-surface"
                    )}>
                      <p className={cn(
                        "font-serif text-xl", 
                        isBaja ? "text-baja-pink" : 
                        isDiamond ? "text-white" :
                        isHeat ? "text-white" : 
                        "text-on-surface"
                      )}>{crew.name}</p>
                      <p className={cn(
                        "font-display text-xl", 
                        isBaja ? "text-baja-aqua" : 
                        isDiamond ? "text-white" :
                        isHeat ? "text-white" :
                        "text-on-surface"
                      )}>{crew.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className={cn(
                "h-full border-2 border-dashed flex flex-col items-center justify-center p-8 text-center space-y-6",
                isBaja ? "border-baja-pink/30 rounded-3xl overflow-hidden" : 
                isDiamond ? "bg-white/5 border-white/10 rounded-sm" :
                isHeat ? "bg-white/20 border-white rounded-[3rem]" :
                "bureau-panel border-dashed"
              )}>
                {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.2 : 0.3} />}
                {isBaja ? <Sun className="w-12 h-12 text-baja-coral opacity-40" /> : isDiamond ? <Sparkles className="w-12 h-12 text-white opacity-40" /> : isHeat ? <Waves className="w-12 h-12 text-white" /> : <ShieldAlert className="w-12 h-12 text-on-surface opacity-10" />}
                <p className={cn(
                  "font-serif italic text-xl leading-relaxed", 
                  isBaja ? "text-baja-pink/60" : 
                  isDiamond ? "text-white/40" :
                  isHeat ? "text-white font-display" :
                  "text-on-surface opacity-40"
                )}>
                  {isBaja ? 'Surf crews are VIP only. Complete solo missions to gain access.' : 
                   isDiamond ? 'Syndicate data is encrypted. Achieve optical sync to view.' :
                   isHeat ? 'GANGS ARE INVITE ONLY. MAKE THE CUT.' :
                   'Unit metrics are restricted. Achieve minimum validation threshold to authorize display.'}
                </p>
                <div className={cn(
                  "w-full h-2 rounded-none overflow-hidden", 
                  isBaja ? "bg-white" : 
                  isDiamond ? "bg-white/10" :
                  isHeat ? "bg-heat-yellow" :
                  "bg-paper-dark border border-on-surface/10"
                )}>
                  <div className={cn(
                    "h-full transition-all duration-1000", 
                    isBaja ? "bg-baja-aqua" : 
                    isDiamond ? "liquid-chrome" :
                    isHeat ? "bg-heat-pink" :
                    "bg-on-surface"
                  )} style={{ width: '66.6%' }} />
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Field Type Power Rankings */}
      <section className="space-y-12">
        <div className="flex items-center gap-6">
          <h2 className="font-display text-4xl italic uppercase tracking-tight text-on-surface font-bold">
            Field Power Balance
          </h2>
          <div className="h-2 flex-grow bg-on-surface/10 relative">
             <div className="absolute inset-0 bg-brand-lime opacity-20" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          {Object.entries(FIELD_TYPES).filter(([id]) => id !== 'unclassified').map(([id, type]) => {
            const usersOfType = fullBoard.filter(u => u.fieldType === id);
            const totalPoints = usersOfType.reduce((acc, u) => acc + u.points, 0);
            const avgPoints = usersOfType.length > 0 ? Math.round(totalPoints / usersOfType.length) : 0;
            
            return (
              <div key={id} className="p-6 border-4 border-on-surface bg-white shadow-[8px_8px_0px_black] text-center space-y-3 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-lime" />
                <p className="micro-label font-bold opacity-100 text-on-surface/60 group-hover:text-brand-orange transition-colors">{type.name}</p>
                <div className="relative">
                  <p className="font-display text-5xl text-on-surface font-bold italic">{avgPoints}</p>
                  <div className="absolute -bottom-1 left-0 w-full h-2 bg-brand-lime -z-10 group-hover:bg-brand-orange transition-colors" />
                </div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-widest opacity-50">AVG_POINTS</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity Feed */}
      <section className="space-y-12">
        <div className="flex items-center gap-6">
          <h3 className={cn(
            "font-display text-4xl italic uppercase tracking-tight font-bold",
            isBaja && "text-baja-pink font-display uppercase font-normal tracking-wide"
          )}>
            {isBaja ? 'Coastal Activity' : 'Field Dispatch Log'}
          </h3>
          <div className="h-2 flex-grow bg-on-surface/10" />
        </div>

        <div className="space-y-4 bg-white border-4 border-on-surface p-8 shadow-[12px_12px_0px_black] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-full bg-brand-lime opacity-5 -skew-x-12 translate-x-8" />
          
          {isQuiet ? (
             <div className="p-12 text-center space-y-6 relative z-10">
               <div className="w-20 h-20 bg-brand-orange border-4 border-on-surface flex items-center justify-center mx-auto shadow-[6px_6px_0px_black] rotate-3">
                 <MessageSquare className="w-10 h-10 text-white" />
               </div>
               <p className="font-display text-2xl italic opacity-100 text-on-surface">"The field is quiet. Real-time dispatches are hidden per your stealth protocol."</p>
               <button 
                onClick={async () => {
                  if(!user || !profile) return;
                  const { updateProfile } = await import('../services/userService');
                  await updateProfile(user.uid, { quietCrewMode: false });
                }}
                className="bureau-btn-sm"
               >
                 Authorize Social Uplink
               </button>
             </div>
          ) : visibleActivity.length === 0 ? (
            <p className="text-xl font-display italic opacity-40 text-center py-12 uppercase tracking-widest relative z-10">
              No recent field activity detected.
            </p>
          ) : (
            <div className="divide-y-4 divide-on-surface/5 relative z-10">
              {visibleActivity.map((event) => (
                <div key={event.id} className="flex gap-6 items-center py-6 group hover:bg-brand-lime/5 transition-all -mx-8 px-8">
                  <AvatarPreview avatar={(event as any).userAvatar || DEFAULT_AVATAR} size="xs" className="rounded-none border-2 border-on-surface shrink-0 shadow-[3px_3px_0px_var(--color-brand-lime)]" />
                  <div className="flex-grow space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <p className="font-display text-xl italic uppercase font-bold text-on-surface">
                          {event.userName}
                        </p>
                        <p className="text-[11px] font-mono font-bold uppercase text-on-surface/60 tracking-widest">{event.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className="font-display text-3xl italic font-bold text-brand-orange">+{event.points}</span>
                         <ContentMenu 
                           targetId={event.entryId || event.id} 
                           targetType={event.entryId ? 'entry' : 'user'} 
                           authorId={event.userId}
                           authorName={event.userName}
                         />
                      </div>
                    </div>
                    <p className="text-[10px] font-mono opacity-70 uppercase font-bold tracking-tight">
                      {formatSafeDate(event.createdAt, { dateStyle: 'short', timeStyle: 'short' }, 'Just now')} // {event.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Counter-Intelligence Section */}
      <section className="space-y-16">
        <div className="space-y-12">
          <div className="flex items-center gap-6">
            <h3 className={cn(
              "font-display text-4xl italic uppercase tracking-tight font-bold",
              isBaja && "text-baja-pink font-display uppercase font-normal tracking-wide"
            )}>
              {isBaja ? 'Petty Waves' : 'Field Audit'}
            </h3>
            {!isBaja && <div className={cn("h-4 flex-grow bg-brand-orange/20 relative overflow-hidden")} >
               <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>}
          </div>

          {!isFieldCheckUnlocked ? (
          <div className={cn(
            "p-16 border-8 border-dashed text-center space-y-8 bg-paper-dark/30 shadow-[inset_0_0_40px_rgba(0,0,0,0.05)]",
            isBaja ? "bg-white/40 border-baja-aqua/50 rounded-3xl overflow-hidden relative" : "relative"
          )}>
             {isBaja && <GlossOverlay opacity={0.1} />}
             <div className="w-24 h-24 bg-paper-dark border-4 border-on-surface flex items-center justify-center mx-auto shadow-[10px_10px_0px_black] opacity-20">
               {isBaja ? <Waves className="w-12 h-12 text-baja-aqua" /> : <ShieldAlert className="w-12 h-12 text-on-surface" />}
             </div>
             <div className="space-y-4">
               <h4 className={cn(
                 "font-display text-5xl italic uppercase tracking-tighter font-black",
                 isBaja ? "text-baja-pink font-display" : "text-on-surface opacity-20"
               )}>
                 {isBaja ? 'Waves Too Low' : 'Protocol Locked'}
               </h4>
               <p className={cn("font-display italic text-2xl max-w-md mx-auto opacity-40 leading-tight", isBaja ? "text-baja-pink/60" : "text-on-surface")}>
                 {isBaja 
                   ? "You need 250 points to start making waves. Chill for now, babe." 
                   : "Asset must reach 250 points to authorize violation reporting protocols."}
               </p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className={cn(
              "md:col-span-2 relative",
              isBaja ? "" : "notice-card"
            )}>
              {!isBaja && !isDiamond && !isHeat && <div className="file-tab">FIELD REPORT FORM // 22-A</div>}
              <div className={cn(
                "p-10 space-y-8 relative overflow-hidden font-display",
                isBaja ? "bg-white border-8 border-baja-pink rounded-[4rem] shadow-[20px_20px_0px_#40e0d0]" : 
                isDiamond ? "bg-white/5 border-2 border-white/20" :
                "bg-white"
              )}>
                {isBaja && <GlossOverlay opacity={0.1} />}
                <div className={cn(
                  "absolute top-8 right-8 animate-pulse",
                  isBaja ? "text-baja-aqua" : "text-brand-orange"
                )}>
                  {isBaja ? <Flame className="w-10 h-10" /> : <Timer className="w-10 h-10" />}
                </div>
                
                <div className="space-y-2">
                  <p className={cn("micro-label font-bold text-on-surface/60", isBaja ? "text-baja-aqua" : "")}>
                    {isBaja ? 'SURF RECLAMATION' : 'AUTHORIZED AUDIT'}
                  </p>
                  <h3 className={cn(
                    "font-display text-5xl uppercase leading-tight italic font-bold",
                    isBaja ? "text-baja-pink" : "text-on-surface"
                  )}>
                    {isBaja ? 'The Petty Slide' : 'Audit Request'}
                  </h3>
                </div>

                <p className={cn("font-display text-2xl italic leading-relaxed text-on-surface/90", isBaja && "text-baja-pink")}>
                  {isBaja 
                    ? "Spill some salt on a rival's post. Use the menu on any entry to initiate a check. 2 per week." 
                    : "File a formal grievance against a rival agent's evidence. Use the 'More' menu on any dispatch feed entry."}
                </p>

                {fieldCheckSent || !canFieldCheckNow ? (
                  <div className={cn(
                    "p-10 text-center border-4",
                    isBaja ? "bg-baja-aqua text-white rounded-full border-white shadow-[8px_8px_0px_var(--color-baja-pink)]" : 
                    "bg-on-surface text-brand-lime border-on-surface shadow-[12px_12px_0px_var(--color-brand-orange)]"
                  )}>
                    <p className="font-display text-4xl italic tracking-widest uppercase font-bold">
                      {!canFieldCheckNow ? "Quota Reached" : "Audit Filed"}
                    </p>
                    <p className={cn("micro-label mt-2 font-bold italic", isBaja ? "text-white/80" : "text-brand-lime opacity-60")}>
                      {lastFieldCheck ? `LATEST_STATUS: ${lastFieldCheck.status.toUpperCase()}` : "PROTOCOL RESET IN PROGRESS"}
                    </p>
                  </div>
                ) : (
                  <div className="p-8 bg-paper-dark border-4 border-dashed border-on-surface/20 rounded-none text-center">
                    <p className="font-display text-xl italic uppercase font-bold opacity-40">Ready for Intelligence Audit</p>
                    <p className="font-display italic text-lg opacity-60 mt-2">"Find an entry in the feed to report."</p>
                  </div>
                )}
              </div>
            </div>

            <div className={cn(
              "p-10 flex flex-col justify-between border-8 shadow-[16px_16px_0px_black] transition-transform hover:scale-[1.02]",
              isBaja ? "bg-baja-pink text-white border-baja-aqua rounded-[4rem]" : 
              "bg-brand-orange text-white border-on-surface rotate-2"
            )}>
              <div className="space-y-6">
                <div className="w-16 h-16 bg-white border-4 border-on-surface flex items-center justify-center shadow-[6px_6px_0px_black] -rotate-6">
                  {isBaja ? <Flame className="w-10 h-10 text-baja-pink" /> : <ShieldAlert className="w-10 h-10 text-brand-orange" />}
                </div>
                <h4 className="font-display text-5xl italic uppercase leading-tight tracking-tight font-bold">
                  {isBaja ? 'Petty Level' : 'Field Audit'}
                </h4>
                <p className={cn("font-display italic text-2xl leading-relaxed", isBaja ? "text-white/80" : "text-white")}>
                  {isBaja ? '"Making waves, keeping it salty."' : '"Audit modes enabled. Verify the field with prejudice."'}
                </p>
              </div>
              <div className={cn("pt-8 border-t-4", isBaja ? "border-white/30" : "border-white/40")}>
                <p className={cn("micro-label font-bold", isBaja ? "text-white/60" : "text-white/60")}>WEEKLY_REMAINING:</p>
                <p className="font-display text-7xl italic font-bold">
                  {canCallFieldCheck(currentWeekNumber) ? (2 - (profile?.fieldCheckHistory?.filter(d => {
                    const checkDate = safeToDate(d);
                    if (!checkDate) return false;
                    const weekStart = getServerDate();
                    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7)); // Simple week start
                    return checkDate > weekStart;
                  })?.length || 0)) : 0}/2
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
        
        <SabotageHub />
      </section>
    </>
    )}
  </div>
);
}
