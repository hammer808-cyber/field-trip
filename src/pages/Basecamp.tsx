import React from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  PlusCircle,
  Home,
  Layers, 
  Trophy, 
  Camera, 
  Users, 
  Settings, 
  Zap, 
  Compass, 
  Sparkles, 
  BookOpen, 
  Star, 
  TrendingUp, 
  Calendar, CheckCircle, ArrowRight, Award,
  Shield,
  ChevronRight,
  Info,
  Lock,
  Check,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Card, FieldBadge, FieldTape, FieldStamp, FieldCard, FieldCTA } from '../components/UI';
import { AvatarPreview } from '../components/AvatarPreview';
import { ActionButton, DisplayPanel } from '../components/UIUtilities';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { FIELD_TYPES, DEV_APP_CONFIG } from '../constants';
import { cn } from '../lib/utils';
import { StickerDecal } from '../components/StickerDecals';
import { getRewardsByType } from '../data/rewardRegistry';
import { getDeckPackById, getDefaultDeckPack } from '../data/deckPacks';
import { IOSHomeScreenPrompt } from '../components/profile/IOSHomeScreenPrompt';
import { getDisplayLabel } from '../utils/labelUtils';

import { getSummerCountdown } from '../utils/seasonCountdown';
import { FieldPageHero } from '../components/FieldPageHero';
import { getApprovedSubmissionsForUser } from '../services/submission-utils';
import { Entry } from '../types/game';

export default function Basecamp() {
  const { 
    fieldType, 
    xp,
    points, 
    soloTripsCount, 
    entries, 
    profile, 
    user,
    activeTrip,
    approvedCompletedChallengeIds,
    submittedPendingChallengeIds,
    needsMoreProofChallengeIds,
    currentDate,
    isOnboardingComplete,
    onboardingCompletedCount,
    isHeatwaveDeckUnlocked,
    isAdmin,
    retryMissionSubmission,
    starterState,
    showHelpToast
  } = useApp();
  
  const { skin: activeSkin } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [approvedSubmissions, setApprovedSubmissions] = React.useState<Entry[]>([]);
  const [loadingApproved, setLoadingApproved] = React.useState(false);

  React.useEffect(() => {
    const userId = profile?.id || user?.uid;
    if (userId) {
      setLoadingApproved(true);
      getApprovedSubmissionsForUser(userId)
        .then(subs => {
          setApprovedSubmissions(subs);
        })
        .catch(err => {
          console.error("[Basecamp] Error fetching approved submissions:", err);
        })
        .finally(() => {
          setLoadingApproved(false);
        });
    }
  }, [profile?.id, user?.uid]);

  // Development-only logs for verification in Basecamp
  React.useEffect(() => {
    if (import.meta.env.DEV && (profile?.id || user?.uid)) {
      const uId = profile?.id || user?.uid || "N/A";
      const approvedCount = approvedSubmissions.length;
      const pointsAwardedStatus = approvedSubmissions.map(e => ({
        id: e.id,
        status: e.status,
        pointsAwarded: e.pointsAwarded !== undefined ? e.pointsAwarded : (e as any).finalPointsAwarded
      }));

      console.log("[DEV_LOG] [Basecamp] Syncing Basecamp Canonical Data:", {
        sourceCollection: "entries (via transaction query)",
        userId: uId,
        activeFilters: { userId: uId, status: 'approved' },
        resultingApprovedCount: approvedCount,
        pointsAwardedMap: pointsAwardedStatus,
        timestamp: new Date().toISOString()
      });
    }
  }, [approvedSubmissions, profile?.id, user?.uid]);

  const thresholds = DEV_APP_CONFIG.levelThresholds;
  const currentLevelData = [...thresholds].reverse().find(t => points >= t.minXP) || thresholds[0];
  const nextLevelData = thresholds.find(t => t.level === currentLevelData.level + 1);
  const xpInLevel = nextLevelData ? (points - currentLevelData.minXP) : (points - currentLevelData.minXP);
  const nextLevelXP = nextLevelData ? (nextLevelData.minXP - currentLevelData.minXP) : 500;
  const xpProgress = nextLevelData ? (xpInLevel / nextLevelXP) * 100 : 100;
  const level = currentLevelData.level;

  const completedCount = approvedSubmissions.length > 0 ? approvedSubmissions.length : (approvedCompletedChallengeIds?.size || 0);
  const fieldTypeData = fieldType ? FIELD_TYPES[fieldType] : null;

  const getNextAction = () => {
    // Check if starter pack is actually done based on status set by calculateStarterState
    if (starterState?.status !== 'COMPLETE') {
      return {
        label: "Finish Starter Pack",
        sublabel: `${onboardingCompletedCount}/3 APPROVED`,
        path: "/deck?pack=starter-signals",
        color: "bg-brand-orange",
        variant: "primary" as const
      };
    }
    
    if (isHeatwaveDeckUnlocked) {
      return {
        label: "Enter Heatwave Receipts",
        sublabel: "Season Active",
        path: "/deck?pack=heatwave-receipts",
        color: "bg-brand-lime",
        variant: "primary" as const
      };
    }

    return {
      label: "Missions Deck",
      sublabel: "Draw new signals",
      path: "/deck",
      color: "bg-brand-orange",
      variant: "primary" as const
    };
  };

  const nextAction = getNextAction();

  // Leaderboard fetch
  const [leaderboard, setLeaderboard] = React.useState<any[]>([]);
  const [realUserRank, setRealUserRank] = React.useState<number | null>(null);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    const initLeaderboard = async () => {
      try {
        const { subscribeToTopStandings, getUserRank } = await import('../services/userService');
        unsub = subscribeToTopStandings((users) => setLeaderboard(users.slice(0, 5)), 10);
        if (user?.uid && points > 0) {
          const rank = await getUserRank(points);
          setRealUserRank(rank);
        }
      } catch (err) {
        console.warn("[Basecamp] initLeaderboard error:", err);
      }
    };
    initLeaderboard();
    return () => unsub?.();
  }, [user?.uid, points]);

  const nearbyScouts = React.useMemo(() => {
    if (leaderboard.length === 0) return [];
    const isMeInTop = leaderboard.some(u => u.id === user?.uid);
    let list = [...leaderboard].slice(0, 3);
    if (!isMeInTop && realUserRank) {
       list = [...leaderboard.slice(0, 2)];
       list.push({ id: user?.uid, name: profile?.name || 'YOU', points: points, isMe: true, rank: realUserRank });
    }
    return list.map((u, i) => ({
      name: u.id === user?.uid ? 'YOU' : (u.name?.split(' ')[0] || u.id?.substring(0, 5) || 'ANON'),
      rank: u.id === user?.uid ? (realUserRank || u.rank || i + 1) : (u.rank || i + 1),
      points: u.points,
      isMe: u.id === user?.uid,
      diffXP: u.points - points
    }));
  }, [leaderboard, realUserRank, user?.uid, points, profile?.name]);

  return (
    <div className="page-scroll ft-paper-texture pb-32 min-h-screen bg-paper-light">
      <FieldPageHero
        eyebrow="FIELD_START"
        title="BASECAMP"
        subtitle="Your Summer Photo Challenge Hub"
        backgroundIcon={<Compass className="w-64 h-64 opacity-[0.04]" />}
        infoCardLabel="TOTAL_XP"
        infoCardValue={xp}
        infoCardSubtext={`LEVEL ${level} // ${fieldTypeData?.name || 'Explorer'}`}
        infoCardAccent="lime"
      />

      <div className="max-w-xl mx-auto px-4 mt-8 space-y-6 relative">
        
        {/* 2. Main Priority CTA - Take photo mission */}
        <section className="space-y-4">
          <FieldCard id="starter-card" variant="paper" className="p-0 border-[4px] border-on-surface shadow-[10px_10px_0px_black] bg-white overflow-hidden group relative">
            {/* Aesthetic Paper Background Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-15 pointer-events-none" />
            
            {/* Vibrant Lime Header Strip */}
            <div className="h-10 bg-brand-lime border-b-[4px] border-on-surface flex items-center px-4 justify-between relative overflow-hidden">
              <span className="text-[9px] font-mono font-black text-on-surface uppercase tracking-[0.3em]">DAILY ACTIVE SIGNAL // LIVE</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-ping" />
                <div className="w-1.5 h-1.5 rounded-full bg-on-surface" />
              </div>
            </div>

            <div className="p-6 space-y-5 relative z-10">
              <div className="space-y-1">
                <h3 className="text-3xl sm:text-5xl font-display font-black uppercase italic tracking-tighter text-on-surface leading-none">
                  {isOnboardingComplete ? "SUMMER IS ACTIVE" : "STARTER STAGE"}
                </h3>
                <p className="text-[10px] font-mono font-black text-on-surface/40 uppercase tracking-widest">
                  {isOnboardingComplete ? "UNLOCKING EVERYDAY MEMORIES" : "GET CERTIFIED WITH YOUR FRIENDS"}
                </p>
              </div>

              <p className="text-sm sm:text-base font-serif italic text-on-surface/70 leading-relaxed">
                {isOnboardingComplete 
                  ? "Take a photo, capture a lazy summer moment, earn points, and make real memories with your crew."
                  : `Authorizing scouting access... Complete 3 starter photo missions to join the seasonal crew feed. (${onboardingCompletedCount}/3 completed)`}
              </p>

              <div className="pt-2">
                <FieldCTA 
                  onClick={() => navigate(nextAction.path)}
                  className="py-5 border-[3.5px] border-on-surface shadow-[0_8px_0px_black] active:shadow-none active:translate-y-1.5 bg-brand-orange text-white text-center hover:bg-brand-orange-dark transition-colors"
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl sm:text-2xl font-display font-black uppercase italic tracking-wider">
                      {isOnboardingComplete ? "TAKE TODAY'S PHOTO MISSION" : "START A MEMORY MISSION"}
                    </span>
                    <ArrowRight className="w-6 h-6 stroke-[3]" />
                  </div>
                </FieldCTA>
              </div>

              {/* Mini progress tracker block */}
              {!isOnboardingComplete && (
                <div className="p-3 bg-[#FFFDF5] border-2 border-on-surface/10 rounded-lg flex items-center justify-between font-mono text-[10px] uppercase">
                  <span>Starter Steps:</span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((num) => {
                      const isDone = onboardingCompletedCount >= num;
                      return (
                        <div 
                          key={num} 
                          className={`w-6 h-6 rounded border-2 border-on-surface flex items-center justify-center font-bold relative ${isDone ? 'bg-brand-lime' : 'bg-on-surface/5 text-on-surface/20'}`}
                        >
                          {isDone ? "✓" : num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </FieldCard>
        </section>

        {/* 3. Secondary Actions Grid */}
        <section className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {/* View Crew Memories */}
            <button 
              onClick={() => {
                const isLocked = !starterState?.starterComplete && !isAdmin;
                if (isLocked) {
                  showHelpToast("Finish your Starter Deck first! Clear 3 unique Starter Mission approvals.");
                } else {
                  navigate('/crew?tab=memories');
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3 text-center border-[3px] border-on-surface shadow-[5px_5px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rotate-[-1deg] min-h-[100px] relative",
                (!starterState?.starterComplete && !isAdmin)
                  ? "bg-gray-100 text-on-surface/40 hover:bg-gray-200 cursor-not-allowed"
                  : "bg-[#FFFCE6] text-on-surface hover:bg-brand-yellow/20"
              )}
            >
              {!starterState?.starterComplete && !isAdmin && (
                <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow">
                  <Lock className="w-3 h-3" />
                </div>
              )}
              <Users className={cn("w-6 h-6 mb-2", (!starterState?.starterComplete && !isAdmin) ? "text-on-surface/30" : "text-brand-orange")} />
              <span className="text-[10px] font-display font-black uppercase italic tracking-wide leading-none">Crew Memories</span>
            </button>

            {/* See My Points */}
            <button 
              onClick={() => navigate('/profile')}
              className="flex flex-col items-center justify-center p-3 text-center bg-[#F2FCFC] border-[3px] border-on-surface text-on-surface shadow-[5px_5px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-brand-cyan/20 transition-all rotate-[1.5deg] min-h-[100px]"
            >
              <Award className="w-6 h-6 text-brand-cyan mb-2" />
              <span className="text-[10px] font-display font-black uppercase italic tracking-wide leading-none">My XP ({xp})</span>
            </button>

            {/* View Summer Standings */}
            <button 
              onClick={() => {
                const isLocked = !starterState?.starterComplete && !isAdmin;
                if (isLocked) {
                  showHelpToast("Finish your Starter Deck first! Clear 3 unique Starter Mission approvals.");
                } else {
                  navigate('/big-board');
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3 text-center border-[3px] border-on-surface shadow-[5px_5px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rotate-[-0.5deg] min-h-[100px] relative",
                (!starterState?.starterComplete && !isAdmin)
                  ? "bg-gray-100 text-on-surface/40 hover:bg-gray-200 cursor-not-allowed"
                  : "bg-[#FDF5FF] text-on-surface hover:bg-brand-magenta/20"
              )}
            >
              {!starterState?.starterComplete && !isAdmin && (
                <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow">
                  <Lock className="w-3 h-3" />
                </div>
              )}
              <Trophy className={cn("w-6 h-6 mb-2", (!starterState?.starterComplete && !isAdmin) ? "text-on-surface/30" : "text-brand-magenta")} />
              <span className="text-[10px] font-display font-black uppercase italic tracking-wide leading-none font-black font-semibold">Standings</span>
            </button>
          </div>
        </section>

        {/* 4. End-of-Season Memory Reel Goal Banner */}
        <section className="pt-2">
          <div className="bg-[#FFFCEB] border-[3.5px] border-on-surface p-5 shadow-[6px_6px_0px_black] relative overflow-hidden rotate-[1deg] group">
            <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.03)_1.5px,transparent_1.5px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />
            <div className="flex gap-4 items-start relative z-10">
              <span className="text-3xl select-none group-hover:scale-110 duration-300 transition-transform">🎞️</span>
              <div className="space-y-1">
                <h4 className="font-display font-black text-[10px] uppercase tracking-wider text-brand-orange-dark">SUMMER MEMORY REEL</h4>
                <p className="font-serif italic font-bold text-xs text-on-surface leading-relaxed">
                  "Your crew is building the Summer Memory Reel. At the end of the season, the best memories help decide the winner."
                </p>
                <div className="pt-2">
                  <p className="font-mono text-[9px] font-black uppercase text-on-surface/40 tracking-wider">
                    Take photos. Earn points. Make the summer reel. Win the season.
                  </p>
                </div>
              </div>
            </div>
            {/* Visual Tape Deco */}
            <FieldTape className="absolute -top-3 -right-6 w-14 h-5 opacity-40" rotation={35} />
          </div>
        </section>

        {/* Quiet Small Settings Link Footer */}
        <div className="text-center pt-8 opacity-40 hover:opacity-100 transition-opacity">
          <button 
            onClick={() => navigate('/profile?tab=settings')}
            className="font-mono text-[10px] uppercase tracking-widest underline decoration-2 underline-offset-2 hover:text-brand-orange text-on-surface"
          >
            Open Settings & Log Out
          </button>
        </div>

      </div>
      <IOSHomeScreenPrompt />
    </div>
  );
}
