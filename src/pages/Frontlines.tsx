import { useApp } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { Card, Sticker } from '../components/UI';
import { ShieldAlert, Timer, Trophy, Send, Sparkles, Waves, Sun, Flame, MoreHorizontal, Shield, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
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
    canFieldCheckNow, fieldCheckEvents, standings, soloCount, 
    fieldType, user, profile, currentWeekNumber, canCallFieldCheck,
    activeSeason
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
    soloCount,
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
  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

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
    <div className="pb-40 px-6 pt-12 space-y-16 max-w-4xl mx-auto overflow-hidden relative">
      {!visible ? (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-8 bg-paper min-h-[60vh] border-2 border-dashed border-on-surface/10 rounded-3xl">
           <ShieldAlert className="w-16 h-16 opacity-10" />
           <div className="space-y-2">
             <h2 className="font-display text-4xl uppercase tracking-tighter">SCOREBOARD_LOCKED</h2>
             <p className="font-serif italic opacity-60">"The Bureau only declassifies high-standing agents. Reach 50 points to access the Scoreboard."</p>
           </div>
           <div className="w-full max-w-xs h-2 bg-on-surface/5 rounded-full overflow-hidden">
             <div className="h-full bg-brand-orange transition-all duration-1000" style={{ width: `${(points / 50) * 100}%` }} />
           </div>
           <p className="micro-label opacity-40">{points} / 50 STANDING_POINTS</p>
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

      <header className="flex items-end justify-between relative">
        <div className="space-y-4">
          <p className="micro-label">
            {isBaja ? 'Coastal Heat List' : 
             isDiamond ? 'Elite Shine Index' :
             isHeat ? 'The Hot List' : 
             'BUREAU RECORD // SEC_STANDINGS'}
          </p>
          <h1 className={cn(
            "text-huge leading-none",
            isBaja ? "text-baja-pink drop-shadow-[4px_4px_0px_#40e0d0]" : 
            isDiamond ? "liquid-chrome bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" :
            isHeat ? "text-white drop-shadow-[0_4px_#ff007f] font-display" :
            "text-on-surface"
          )}>
            {isBaja ? 'High Tide' : isDiamond ? 'Diamond Rank' : isHeat ? 'Heat Rank' : 'Scoreboard'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="micro-label opacity-40 uppercase tracking-widest">WEEK {currentWeekNumber} // ACTIVE_SIGNAL</span>
          </div>
          {!isBaja && !isDiamond && !isHeat && <p className="bureau-subhead">Certified rankings for field personnel.</p>}
          {isQuiet && (
            <div className="flex items-center gap-2 text-brand-orange animate-pulse">
               <Shield className="w-4 h-4" />
               <span className="font-mono text-[10px] uppercase font-bold">Quiet Mode Active // Visuals Filtered</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="micro-label opacity-40">
            {isBaja ? 'YOUR GLOW' : isDiamond ? 'GLARE DEPTH' : isHeat ? 'VIBE LEVEL' : 'CURRENT_STANDING'}
          </p>
          <p className={cn(
            "text-huge text-[3rem] leading-none",
            isBaja ? "text-baja-aqua" : 
            isDiamond ? "text-white" :
            isHeat ? "text-heat-mango" :
            "text-brand-orange"
          )}>
            {points} <span className="text-xs font-mono tracking-normal opacity-60">STD</span>
          </p>
        </div>
      </header>

      {/* Season Rankings */}
      <section className="space-y-8">
        <div className={cn(
          "flex justify-between items-end border-b-2 pb-4",
          isBaja ? "border-baja-pink" : 
          isDiamond ? "border-white/20" :
          isHeat ? "border-white" :
          "border-on-surface"
        )}>
          <h2 className={cn(
            "font-serif text-3xl italic",
            isBaja ? "text-baja-pink font-display uppercase font-normal tracking-wide" :
            isDiamond ? "text-white font-mono uppercase tracking-[0.5em] font-light" :
            isHeat ? "text-white font-display uppercase tracking-tighter" : 
            "font-display uppercase text-on-surface tracking-tighter"
          )}>
            {isBaja ? 'The Heat List' : isDiamond ? 'The Shine Board' : isHeat ? 'Splash Rankings' : 'Live Audit'}
          </h2>
          <Sticker color="black" className="micro-label">
            {isBaja ? 'SUNKISSED' : isDiamond ? 'POLISHED' : isHeat ? 'WET' : 'LIVE_FEED'}
          </Sticker>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Individual Rankings */}
          <div className="space-y-6">
            <h3 className={cn("micro-label", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-white" : "text-brand-orange")}>
              {isBaja ? 'BEACH BABES' : isDiamond ? 'MIRROR ENTITIES' : isHeat ? 'POOLSIDE SQUAD' : 'INDIVIDUAL AGENTS'}
            </h3>
            <div className="space-y-4">
              {playerRankings.map((user: any, idx) => (
                <div key={user.id} className="flex items-center gap-6 group">
                  <span className={cn(
                    "font-display text-4xl Transition-colors w-8",
                    isBaja ? "text-baja-pink/20 group-hover:text-baja-aqua" : 
                    isDiamond ? "text-white/10 group-hover:text-white" :
                    isHeat ? "text-white/20 group-hover:text-heat-pink" :
                    "text-on-surface/10 group-hover:text-on-surface"
                  )}>{(idx + 1).toString().padStart(2, '0')}</span>
                  
                  <div className="shrink-0">
                    <AvatarPreview avatar={user.avatar || DEFAULT_AVATAR} size="sm" className="rounded-full shadow-sm" />
                  </div>

                  <div className={cn(
                    "flex-grow border-b border-dashed pb-2 flex justify-between items-end transition-colors",
                    isBaja ? "border-baja-aqua/30" : 
                    isDiamond ? "border-white/10" :
                    isHeat ? "border-white/30" :
                    "border-on-surface/10 group-hover:border-on-surface"
                  )}>
                    <div>
                      <p className={cn(
                        "font-serif text-xl transition-all", 
                        isBaja ? "text-baja-pink" : 
                        isDiamond ? "text-white group-hover:text-diamond-blue" :
                        isHeat ? "text-white group-hover:translate-x-2" : 
                        "text-on-surface"
                      )}>{user.name}</p>
                      <p className={cn(
                        "micro-label text-[8px]", 
                        isBaja ? "text-baja-coral" : 
                        isDiamond ? "text-white/30" :
                        isHeat ? "text-white font-display" : 
                        "text-on-surface opacity-40"
                      )}>{user.fieldTypeName || user.fieldType?.replace('-', ' ')}</p>
                    </div>
                    <p className={cn(
                      "font-display text-xl", 
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
                  "font-serif italic text-lg leading-relaxed", 
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

      {/* Field Type Power Rankings (Mahsa Persona: Fairness/Recognition) */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-2xl uppercase tracking-tighter text-on-surface">
            Field Type Power Balance
          </h2>
          <div className="h-px flex-grow bg-on-surface/10" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(FIELD_TYPES).filter(([id]) => id !== 'unclassified').map(([id, type]) => {
            const usersOfType = fullBoard.filter(u => u.fieldType === id);
            const totalPoints = usersOfType.reduce((acc, u) => acc + u.points, 0);
            const avgPoints = usersOfType.length > 0 ? Math.round(totalPoints / usersOfType.length) : 0;
            
            return (
              <div key={id} className="p-4 border-2 border-on-surface/5 bg-on-surface/5 text-center space-y-1">
                <p className="micro-label opacity-40">{type.name}</p>
                <p className="font-display text-2xl text-brand-orange">{avgPoints}</p>
                <p className="text-[8px] font-mono opacity-60">AVG_POINTS</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity Feed */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className={cn(
            "font-display text-2xl uppercase tracking-tighter",
            isBaja && "text-baja-pink font-display uppercase font-normal tracking-wide"
          )}>
            {isBaja ? 'Coastal Activity' : 'Bureau Dispatch Log'}
          </h3>
          <div className="h-px flex-grow bg-on-surface/10" />
        </div>

        <div className="space-y-4">
          {isQuiet ? (
             <div className="bg-on-surface/5 p-12 text-center rounded-3xl border-2 border-dashed border-on-surface/10 space-y-4">
               <MessageSquare className="w-12 h-12 mx-auto opacity-10" />
               <p className="font-serif italic opacity-40">"The field is quiet. Real-time dispatches are hidden per your stealth protocol."</p>
               <button 
                onClick={async () => {
                  if(!user || !profile) return;
                  const { updateProfile } = await import('../services/userService');
                  await updateProfile(user.uid, { quietCrewMode: false });
                }}
                className="micro-label text-brand-orange hover:underline"
               >
                 Authorize Social Uplink
               </button>
             </div>
          ) : visibleActivity.length === 0 ? (
            <p className="text-[10px] uppercase font-mono opacity-40 text-center py-8 italic border-2 border-dashed border-on-surface/5">
              No recent field activity detected.
            </p>
          ) : (
            visibleActivity.map((event) => (
              <div key={event.id} className="flex gap-4 items-center pb-4 border-b border-on-surface/5 last:border-0 group">
                <AvatarPreview avatar={(event as any).userAvatar || DEFAULT_AVATAR} size="xs" className="rounded-full shrink-0 border border-white/5" />
                <div className="flex-grow space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-mono">
                      <span className="font-bold text-on-surface">{event.userName}</span>
                      <span className="opacity-40 ml-2 uppercase">{event.description}</span>
                    </p>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-display text-brand-orange">+{event.points}</span>
                       <ContentMenu 
                         targetId={event.entryId || event.id} 
                         targetType={event.entryId ? 'entry' : 'user'} 
                         authorId={event.userId}
                         authorName={event.userName}
                       />
                    </div>
                  </div>
                  <p className="text-[8px] font-mono opacity-30 uppercase">
                    {event.createdAt?.toDate ? event.createdAt.toDate().toLocaleString() : 'Just now'} // {event.type}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Counter-Intelligence Section */}
      <section className="space-y-16">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <h3 className={cn(
              "font-display text-2xl uppercase tracking-tighter",
              isBaja && "text-baja-pink font-display uppercase font-normal tracking-wide"
            )}>
              {isBaja ? 'Petty Waves' : 'Counter-Intelligence'}
            </h3>
            {!isBaja && <div className={cn("h-px flex-grow bg-on-surface/10")} />}
          </div>

          {!isFieldCheckUnlocked ? (
          <div className={cn(
            "p-12 border-4 border-dashed text-center space-y-4",
            isBaja ? "bg-white/40 border-baja-aqua/50 rounded-3xl" : "bureau-panel border-dashed opacity-40"
          )}>
             {isBaja ? <Waves className="w-16 h-16 mx-auto text-baja-aqua" /> : <ShieldAlert className="w-16 h-16 mx-auto text-on-surface opacity-20" />}
             <h4 className={cn(
               "font-display text-4xl uppercase tracking-tighter",
               isBaja ? "text-baja-pink font-display uppercase font-normal" : "text-on-surface"
             )}>
               {isBaja ? 'Waves Too Low' : 'Field Check Protocol Locked'}
             </h4>
             <p className={cn("font-serif italic max-w-sm mx-auto", isBaja ? "text-baja-pink/60" : "text-on-surface")}>
               {isBaja 
                 ? "You need 250 points to start making waves. Chill for now, babe." 
                 : "Asset must reach 250 points to authorize violation reporting protocols."}
             </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={cn(
              "md:col-span-2 relative",
              isBaja ? "" : "notice-card"
            )}>
              {!isBaja && !isDiamond && !isHeat && <div className="file-tab">FIELD CITATION FORM // 22-A</div>}
              <div className={cn(
                "p-8 space-y-6 relative overflow-hidden",
                isBaja ? "bg-white border-4 border-baja-pink rounded-[3rem] shadow-[12px_12px_0px_#40e0d0]" : 
                isDiamond ? "bg-white/5 border border-white/20" :
                "p-0"
              )}>
                {isBaja && <GlossOverlay />}
                <div className={cn(
                  "absolute top-4 right-4 animate-pulse",
                  isBaja ? "text-baja-aqua" : "text-brand-orange"
                )}>
                  {isBaja ? <Flame className="w-6 h-6" /> : <Timer className="w-6 h-6" />}
                </div>
                
                <div className="space-y-2">
                  <p className={cn("micro-label", isBaja ? "text-baja-aqua" : "text-on-surface opacity-40")}>
                    {isBaja ? 'SURF RECLAMATION' : 'AUTHORIZED AUDIT'}
                  </p>
                  <h3 className={cn(
                    "font-display text-4xl uppercase leading-none",
                    isBaja ? "text-baja-pink" : "text-on-surface"
                  )}>
                    {isBaja ? 'The Petty Slide' : 'Submit Audit Request'}
                  </h3>
                </div>

                <p className={cn("font-serif text-lg leading-relaxed", isBaja && "text-baja-pink")}>
                  {isBaja 
                    ? "Spill some salt on a rival's post. Use the menu on any entry to initiate a check. 2 per week." 
                    : "File a formal grievance against a rival agent's evidence. Use the 'More' menu on any dispatch feed entry."}
                </p>

                {fieldCheckSent || !canFieldCheckNow ? (
                  <div className={cn(
                    "p-8 text-center",
                    isBaja ? "bg-baja-aqua text-white rounded-full" : 
                    "bg-on-surface text-paper border-2 border-brand-orange"
                  )}>
                    <p className="font-display text-2xl tracking-widest uppercase">
                      {!canFieldCheckNow ? "WEEKLY_QUOTA_REACHED" : "AUDIT_FILED"}
                    </p>
                    <p className={cn("micro-label mt-1", isBaja ? "text-white/80" : "text-paper opacity-60")}>
                      {lastFieldCheck ? `LATEST_STATUS: ${lastFieldCheck.status.toUpperCase()}` : "PROTOCOL RESET IN PROGRESS"}
                    </p>
                  </div>
                ) : (
                  <div className="p-6 bg-on-surface/5 border-2 border-dashed border-on-surface/10 rounded-xl text-center">
                    <p className="font-mono text-[10px] uppercase opacity-60">Ready for Intelligence Audit</p>
                    <p className="font-serif italic text-sm mt-2">"Find an entry in the feed to report."</p>
                  </div>
                )}
              </div>
            </div>

            <div className={cn(
              "p-8 flex flex-col justify-between border-4",
              isBaja ? "bg-baja-pink text-white border-baja-aqua rounded-[3rem]" : 
              "bg-on-surface text-paper border-black rotate-1"
            )}>
              <div className="space-y-4">
                {isBaja ? <Flame className="w-10 h-10 text-white" /> : <ShieldAlert className="w-10 h-10 text-brand-orange" />}
                <h4 className="font-display text-4xl uppercase leading-none tracking-tighter">
                  {isBaja ? 'Petty Level' : 'BUREAU AUDIT STATUS'}
                </h4>
                <p className={cn("font-serif italic text-lg leading-snug", isBaja ? "text-white/80" : "opacity-80")}>
                  {isBaja ? '"Making waves, keeping it salty."' : '"Auditor protocols enabled. Verify the field with prejudice."'}
                </p>
              </div>
              <div className={cn("pt-6 border-t", isBaja ? "border-white/30" : "border-paper/20")}>
                <p className={cn("micro-label", isBaja ? "text-white/60" : "opacity-50")}>WEEKLY_REMAINING:</p>
                <p className="font-mono text-3xl">
                  {canCallFieldCheck(currentWeekNumber) ? (2 - (profile?.fieldCheckHistory?.filter(d => {
                    const checkDate = new Date(d);
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
