import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { getRewardsByType, getRewardMetadata, RewardMetadata } from '../data/rewardRegistry';
import { 
  ShieldCheck, 
  Lock, 
  ChevronLeft, 
  Sparkles, 
  Zap, 
  Book, 
  Users, 
  Star, 
  ArrowRight, 
  LayoutGrid, 
  Box,
  Heart
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { StickerDecal } from '../components/StickerDecals';
import { FieldBadge } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { getDeckPackById, getDefaultDeckPack, getActiveDeckPacks } from '../data/deckPacks';
import { FieldPageHero } from '../components/FieldPageHero';
import { MissionCard } from '../components/ChallengeCard';
import { CrewMemoriesFeed } from '../components/CrewMemoriesFeed';
import { markEarnedStickersSeen } from '../services/stickerService';
import { canAccessFeature, getDeckProgress, getStarterProgress } from '../services/canonicalProgress';
import { getCurrentCrewMembership } from '../services/crewService';
import type { CrewMembershipState } from '../types/crew';

type CollectionTab = 'crew_home' | 'stickers' | 'badges' | 'decks' | 'missions' | 'crew_memories';

export default function CollectionPage() {
  const { 
    profile, 
    user,
    trips,
    unlockDiscoverySticker,
    isHeatwaveDeckUnlocked,
    isSocalSummerUnlocked,
    isAdmin,
    currentDate,
    drawnMissionCards,
    canonicalProgress
  } = useApp();
  const { allSkins } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const initialTab = (initialTabParam === 'skins' ? 'crew_home' : (initialTabParam as CollectionTab)) || 'crew_home';
  const [activeTab, setActiveTab] = useState<CollectionTab>(initialTab);
  const [crewMembership, setCrewMembership] = useState<CrewMembershipState | null>(null);

  const activePacks = getActiveDeckPacks();
  const starterProgress = getStarterProgress(canonicalProgress);
  const isStarterComplete = starterProgress.starterComplete;

  const getPackLockState = (packId: string) => {
    const pack = activePacks.find(p => p.packId === packId);
    
    if (pack?.isFutureDrop) {
      return {
        locked: !isAdmin,
        reason: "Locked for a future drop"
      };
    }

    if (packId === 'starter-signals') return { locked: false, reason: "" };

    if (packId !== 'starter-signals' && packId !== 'heatwave-receipts' && !canAccessFeature(canonicalProgress, 'socal-summer', { isAdmin, socalUnlocked: isSocalSummerUnlocked })) {
      return { 
        locked: true, 
        reason: "Complete Starter Pack (3/3 missions) to unlock" 
      };
    }

    if (packId === 'heatwave-receipts') {
      const activeByDate = new Date(currentDate) >= new Date('2026-06-06T00:00:00Z');
      
      if (!isHeatwaveDeckUnlocked && !isAdmin) {
        if (!isStarterComplete) return { locked: true, reason: "Complete Starter Pack (3/3 missions) to unlock" };
        if (!activeByDate) return { locked: true, reason: "Opens Saturday, June 6th" };
        return { locked: true, reason: "Complete Starter Pack (3/3 missions) to unlock" };
      }
      return { locked: false, reason: "" };
    }

    return { locked: !isAdmin, reason: "Locked for a future drop" };
  };

  useEffect(() => {
    unlockDiscoverySticker('dex_open', 'dex');
    unlockDiscoverySticker('dex_discovered', 'dex');
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const tab = tabParam as CollectionTab | null;
    if (tabParam === 'skins') setActiveTab('crew_home');
    else if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (!user?.uid) return;
    getCurrentCrewMembership()
      .then(setCrewMembership)
      .catch(err => console.warn('[Collection] crew membership lookup failed:', err));
  }, [user?.uid]);

  const handleTabChange = (id: CollectionTab) => {
    setActiveTab(id);
    if (id === 'stickers') {
      unlockDiscoverySticker('sticker_collection_view', 'dex');
      if (user?.uid) {
        markEarnedStickersSeen(user.uid, profile).catch(err => console.warn('[Collection] mark stickers seen failed:', err));
      }
    }
  };

  const stickers = getRewardsByType('sticker');
  const badges = getRewardsByType('badge');

  const unlockedStickers = new Set(profile?.unlockedRewards?.stickers || []);
  const earnedStickerRecords = ((profile as any)?.earnedStickers || []) as Array<{ id: string; seen?: boolean }>;
  const unseenStickerIds = new Set(earnedStickerRecords.filter(record => record.seen === false).map(record => record.id));
  const unlockedBadges = new Set(profile?.unlockedRewards?.badges || []);
  const unlockedSkinsList = profile?.unlockedRewards?.skins || ['classic'];
  const unlockedSkins = new Set(unlockedSkinsList);
  const totalRewards = stickers.length + badges.length + allSkins.length;
  const totalUnlocked = unlockedStickers.size + unlockedBadges.size + unlockedSkins.size;

  const currentPackId = typeof window !== 'undefined' ? localStorage.getItem('active_deck_pack_id') || getDefaultDeckPack().packId : getDefaultDeckPack().packId;
  const currentPack = getDeckPackById(currentPackId);

  const currentPackProgress = currentPack ? getDeckProgress(canonicalProgress, currentPack.packId) : null;
  const packMissionsCount = currentPackProgress?.totalCards || currentPack?.missionIds?.length || 10;
  const completedPackCount = currentPackProgress?.approvedCount || 0;

  const RewardItem = ({ reward, isUnlocked }: { reward: RewardMetadata; isUnlocked: boolean }) => (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isUnlocked ? { scale: 1.02, rotate: 1 } : {}}
      onClick={() => !isUnlocked && unlockDiscoverySticker('locked_sticker_tap', 'dex')}
      className={cn(
        "relative p-4 flex flex-col items-center justify-between gap-3 aspect-[4/5] rounded-[2rem] border-[3px] transition-all cursor-pointer",
        isUnlocked 
          ? "bg-white border-on-surface shadow-[6px_6px_0px_black] hover:shadow-[10px_10px_0px_black]" 
          : "bg-on-surface/[0.02] border-on-surface/10 opacity-40 border-dashed"
      )}
    >
      <div className="flex-1 flex items-center justify-center w-full relative">
        {isUnlocked && (
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
        )}
        {reward.type === 'sticker' ? (
          <div className="w-16 h-16 sm:w-20 sm:h-20 relative">
            <StickerDecal 
              id={reward.id} 
              scale={1.2} 
              animate={isUnlocked} 
              className={cn("w-full h-full drop-shadow-[4px_4px_0px_rgba(0,0,0,0.1)]", !isUnlocked && "opacity-20 grayscale")}
            />
          </div>
        ) : (
          <div className={cn(
            "w-12 h-12 rounded-2xl border-[2.5px] flex items-center justify-center shadow-[4px_4px_0px_black]",
            isUnlocked ? "bg-brand-lime/15 border-on-surface text-on-surface" : "bg-on-surface/5 border-on-surface/10"
          )}>
             <ShieldCheck className={cn("w-6 h-6", isUnlocked ? "text-on-surface" : "text-on-surface/25")} />
          </div>
        )}
      </div>
      
      <div className="text-center w-full space-y-1">
        <p className={cn(
          "text-[10px] font-black uppercase tracking-tight truncate px-1",
          isUnlocked ? "text-on-surface" : "text-on-surface/40"
        )}>
          {reward.label}
        </p>
        <div className={cn(
          "text-[8px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full w-fit mx-auto border-[1.5px]",
          reward.rarity === 'legendary' ? 'bg-brand-orange text-white border-on-surface' : 'bg-on-surface/5 text-on-surface/45 border-on-surface/10'
        )}>
          {reward.rarity || 'common'}
        </div>
      </div>

      {!isUnlocked && <Lock className="absolute top-4 right-4 w-3.5 h-3.5 text-on-surface/20" />}
      {isUnlocked && <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-brand-cyan/40" />}
      {isUnlocked && unseenStickerIds.has(reward.id) && (
        <div className="absolute top-2 right-2 bg-brand-orange text-white border border-on-surface px-1.5 py-0.5 text-[7px] font-black uppercase">
          New
        </div>
      )}
    </motion.div>
  );

  const LockedStarterPanel = ({ label = 'this' }: { label?: string }) => (
    <div className="py-14 px-4 text-center space-y-5 max-w-xl mx-auto">
      <div className="w-16 h-16 bg-brand-magenta text-white border-4 border-on-surface shadow-[6px_6px_0px_black] rounded-2xl flex items-center justify-center mx-auto">
        <Lock className="w-8 h-8" />
      </div>
      <h2 className="font-display text-3xl font-black uppercase italic tracking-tight text-on-surface">Access Restricted</h2>
      <p className="font-serif italic text-on-surface/70">Complete all 3 Starter Signals to unlock {label}.</p>
      <button onClick={() => navigate('/deck')} className="bureau-btn bg-brand-lime text-on-surface text-xs">Go to Starter Signals</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-56 ft-paper-texture">
      <div className="w-full flex justify-center py-1 opacity-55 z-20 relative select-none pointer-events-none mb-3 pt-3">
        <div className="h-4 w-60 border-y-2 border-on-surface bg-[#EAE5D8] flex justify-between px-4 rounded-full shadow-[inset_0_2px_4.5px_rgba(0,0,0,0.15)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-2.5 h-6 bg-slate-400 border-2 border-on-surface rounded-full -mt-1 shadow" />
          ))}
        </div>
      </div>

      <FieldPageHero
        eyebrow="FIELD_ARCHIVE"
        title="DEX"
        subtitle="Sector 7-B // Field Headquarters"
        backTo="/profile"
        backgroundIcon={<Book className="w-64 h-64" />}
        infoCardLabel="DISCOVERIES"
        infoCardValue={totalUnlocked.toString()}
        infoCardSubtext="Collected field artifacts"
        infoCardAccent="orange"
        infoCardVariant="sticker"
        tabs={[
          { id: 'crew_home', label: 'Crew Home' },
          { id: 'missions', label: 'Mission Cards' },
          { id: 'crew_memories', label: 'Crew Memories' },
          { id: 'stickers', label: 'Sticker Deck' },
          { id: 'badges', label: 'Medals' },
          { id: 'decks', label: 'Catalog' }
        ]}
        activeTab={activeTab}
        onTabChange={(id) => handleTabChange(id as CollectionTab)}
      />

      <main className="px-4 sm:px-10 py-10 max-w-6xl mx-auto min-h-[45vh] bg-white border-x-4 border-b-4 border-on-surface shadow-[10px_10px_0px_black] relative rounded-b-[2.5rem] z-10 -mt-1">
         <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.015)_1.5px,transparent_0)] bg-[size:16px_16px] pointer-events-none rounded-b-[2.5rem]" />
        <AnimatePresence mode="wait">
          {activeTab === 'crew_home' && (
            <motion.div
              key="crew-home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
                <section className="bg-[#FFFCEB] border-4 border-on-surface shadow-[8px_8px_0px_black] rounded-[2rem] p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-brand-lime border-4 border-on-surface shadow-[5px_5px_0px_black] rounded-2xl flex items-center justify-center">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Crew Home</p>
                      <h2 className="font-display text-4xl font-black uppercase italic tracking-tight leading-none">
                        {crewMembership?.crew?.name || 'No Crew Assigned'}
                      </h2>
                    </div>
                  </div>

                  {crewMembership?.crew ? (
                    <div className="space-y-5">
                      <p className="font-serif italic text-on-surface/70">
                        "{crewMembership.crew.motto || 'Your field team, seasonal receipts, and zine trail live here.'}"
                      </p>
                      <div className="grid grid-cols-2 gap-3 font-mono text-[10px] uppercase">
                        <div className="border-2 border-on-surface/20 bg-white p-3">
                          <span className="opacity-50">Members</span><br />
                          <b>{crewMembership.crew.memberCount || crewMembership.crew.members?.length || 0} / {crewMembership.crew.memberLimit || 8}</b>
                        </div>
                        <div className="border-2 border-on-surface/20 bg-white p-3">
                          <span className="opacity-50">Role</span><br />
                          <b>{crewMembership.membership?.role || 'member'}</b>
                        </div>
                        <div className="border-2 border-on-surface/20 bg-white p-3">
                          <span className="opacity-50">Mode</span><br />
                          <b>{crewMembership.crew.mode || 'friendly'}</b>
                        </div>
                        <div className="border-2 border-on-surface/20 bg-white p-3">
                          <span className="opacity-50">Privacy</span><br />
                          <b>{crewMembership.crew.privacy || 'invite_only'}</b>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => navigate('/crew')} className="bureau-btn bg-brand-lime text-on-surface text-xs">Open Crew HQ</button>
                        <button onClick={() => setActiveTab('crew_memories')} className="bureau-btn bg-white text-on-surface text-xs">View Crew Memories</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <p className="font-serif italic text-on-surface/70">
                        "Start or join a Crew to collect shared field memories and build a seasonal zine."
                      </p>
                      <button onClick={() => navigate('/crew')} className="bureau-btn bg-brand-lime text-on-surface text-xs">Create or Join Crew</button>
                    </div>
                  )}
                </section>

                <section className="bg-white border-4 border-on-surface shadow-[8px_8px_0px_var(--color-brand-cyan)] rounded-[2rem] p-8 space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Quick Dex Links</p>
                  <button onClick={() => setActiveTab('missions')} className="w-full bureau-btn bg-white text-on-surface text-xs justify-center">Mission Cards</button>
                  <button onClick={() => setActiveTab('stickers')} className="w-full bureau-btn bg-white text-on-surface text-xs justify-center">Sticker Deck</button>
                  <button onClick={() => navigate('/big-board?tab=proofs')} className="w-full bureau-btn bg-brand-orange text-white text-xs justify-center">Community Feed</button>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'missions' && (
            <motion.div 
              key="missions-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12"
            >
              {drawnMissionCards.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-on-surface/5 border-2 border-dashed border-on-surface/20 rounded-full flex items-center justify-center mx-auto">
                    <Box className="w-6 h-6 text-on-surface/20" />
                  </div>
                  <p className="font-serif italic text-on-surface/40">"No field dossiers have been synchronized to this unit."</p>
                  <button onClick={() => navigate('/deck')} className="bureau-btn text-xs">Access Deck</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {drawnMissionCards.map(card => {
                    const mission = trips.find(t => t.id === card.missionId);
                    if (!mission) return null;
                    
                      return (
                        <div key={card.id} className="space-y-4 group">
                          <MissionCard 
                            challenge={mission} 
                            className="shadow-[10px_10px_0px_black] rounded-[2rem] border-[4px] border-on-surface group-hover:-translate-y-1 group-hover:rotate-1 transition-all"
                          />
                          <div className="flex flex-wrap gap-2 px-2">
                             <div className={cn(
                               "px-3 py-1.5 rounded-xl border-[2.5px] text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                               card.status === 'active' ? "bg-brand-orange text-white border-on-surface shadow-[4px_4px_0px_black]" :
                               card.status === 'approved' ? "bg-brand-lime text-on-surface border-on-surface shadow-[4px_4px_0px_black]" :
                               card.status === 'pending_review' ? "bg-yellow-400 text-on-surface border-on-surface shadow-[4px_4px_0px_black]" :
                               "bg-white text-on-surface/40 border-on-surface/10"
                             )}>
                               {card.status === 'active' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                               {card.status.replace('_', ' ')}
                             </div>
                             
                             {/* CTAs */}
                             {card.status === 'drawn' || card.status === 'saved_for_later' ? (
                               <button 
                                 onClick={() => navigate(`/mission-briefing?id=${mission.id}`)}
                                 className="px-4 py-1.5 bg-on-surface text-brand-lime border-[2.5px] border-on-surface text-[9px] font-black uppercase tracking-widest shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all flex items-center gap-1.5"
                               >
                                 Start Mission <ArrowRight className="w-3.5 h-3.5" />
                               </button>
                             ) : card.status === 'active' ? (
                               <button 
                                 onClick={() => navigate(`/capture?id=${mission.id}`)}
                                 className="px-4 py-1.5 bg-brand-orange text-white border-[2.5px] border-on-surface text-[9px] font-black uppercase tracking-widest shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all flex items-center gap-1.5"
                               >
                                 Resume Mission <ArrowRight className="w-3.5 h-3.5" />
                               </button>
                             ) : card.status === 'approved' ? (
                               <button 
                                 onClick={() => navigate('/profile?tab=logbook')}
                                 className="px-4 py-1.5 bg-white text-on-surface border-[2.5px] border-on-surface text-[9px] font-black uppercase tracking-widest shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all flex items-center gap-1.5"
                               >
                                 View Logbook <ArrowRight className="w-3.5 h-3.5" />
                               </button>
                             ) : null}
                          </div>
                        </div>
                      );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'crew_memories' && (
            <motion.div 
              key="crew-memories-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              {isStarterComplete || isAdmin ? <CrewMemoriesFeed /> : <LockedStarterPanel label="Crew Memories" />}
            </motion.div>
          )}

          {activeTab === 'stickers' && (
            <motion.div 
              key="stickers-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-black uppercase italic tracking-tight text-on-surface">Earned Stickers</h2>
                  <span className="font-mono text-[10px] font-black uppercase text-on-surface/40">{stickers.filter(r => unlockedStickers.has(r.id)).length} earned</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {stickers.filter(r => unlockedStickers.has(r.id)).map(r => (
                    <RewardItem key={r.id} reward={r} isUnlocked />
                  ))}
                  {stickers.filter(r => unlockedStickers.has(r.id)).length === 0 && (
                    <div className="col-span-full py-12 text-center text-on-surface/40 font-serif italic">"No stickers earned yet."</div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="font-display text-2xl font-black uppercase italic tracking-tight text-on-surface/45">Locked Stickers</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {stickers.filter(r => !unlockedStickers.has(r.id)).map(r => (
                    <RewardItem key={r.id} reward={r} isUnlocked={false} />
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'badges' && (
            <motion.div 
              key="badges-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4"
            >
              {badges.map(r => (
                <RewardItem key={r.id} reward={r} isUnlocked={unlockedBadges.has(r.id)} />
              ))}
            </motion.div>
          )}

          {activeTab === 'decks' && (
            <motion.div 
              key="decks-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {activePacks.map(pack => {
                const { locked, reason } = getPackLockState(pack.packId);
                const deckProgress = getDeckProgress(canonicalProgress, pack.packId);
                const missionsInPack = pack.missionIds;
                const completedCount = deckProgress.approvedCount;
                const progress = deckProgress.percent;
                const isCurrent = pack.packId === currentPackId;

                return (
                  <div 
                    key={pack.packId}
                    className={cn(
                      "p-6 rounded-[2.5rem] border-3 border-on-surface bg-white shadow-[4px_4px_0px_black] transition-all flex flex-col gap-6 group text-left relative overflow-hidden",
                      locked ? "opacity-55 grayscale border-dashed border-on-surface/20 shadow-none bg-[#FAFAF8]" : "hover:shadow-[8px_8px_0px_black] hover:-translate-y-0.5"
                    )}
                  >
                    {!locked && isCurrent && (
                       <div className="absolute top-0 right-0 p-2">
                          <FieldBadge variant="sticker" color="orange" size="xs" className="py-0.5 px-2">CURRENT</FieldBadge>
                       </div>
                    )}

                    <div className="flex justify-between items-center w-full">
                       <div className="bg-on-surface text-white px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest rounded-lg">
                          {pack.shortName || 'DOSSIER'}
                       </div>
                       {!locked && completedCount === missionsInPack.length && missionsInPack.length > 0 && (
                         <div className="w-8 h-8 bg-brand-lime rounded-full flex items-center justify-center border-2 border-on-surface shadow-[2px_2px_0px_black] rotate-6 shrink-0">
                            <Star className="w-4 h-4 text-on-surface fill-on-surface" />
                         </div>
                       )}
                       {locked && <Lock className="w-4 h-4 text-on-surface/20" />}
                    </div>

                    <div className="space-y-1.5 text-left">
                       <h4 className="font-display text-2xl sm:text-3.5xl font-black uppercase italic tracking-tighter text-on-surface leading-none">
                         {pack.packName}
                       </h4>
                       <p className="text-xs sm:text-sm font-serif italic text-on-surface/50">
                         {locked ? reason : pack.description}
                       </p>
                    </div>

                    <div className="mt-auto space-y-3 pt-2">
                       <div className="flex justify-between items-center text-[9px] font-mono font-black uppercase tracking-wider text-on-surface/40">
                          <span>SYNC PROGRESS</span>
                          <span className={progress === 100 ? "text-brand-lime font-black" : ""}>{completedCount}/{missionsInPack.length}</span>
                       </div>
                       <div className="w-full bg-on-surface/5 h-2.5 rounded-full overflow-hidden border border-on-surface/5">
                          <div 
                            className={cn("h-full transition-all duration-1000", progress === 100 ? "bg-brand-lime" : "bg-brand-orange")} 
                            style={{ width: `${progress}%` }}
                          />
                       </div>
                    </div>

                    {!locked && (
                      <button 
                        onClick={() => {
                          localStorage.setItem('active_deck_pack_id', pack.packId);
                          navigate('/deck');
                        }}
                        className="w-full py-2 bg-on-surface/5 hover:bg-on-surface/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                      >
                        Select Deck
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-28 px-4 text-center pb-12">
         <div className="max-w-md mx-auto space-y-6">
            <div className="flex justify-center gap-1.5">
               {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-on-surface/15" />)}
            </div>
            <div className="space-y-1">
               <p className="font-display text-3xl font-black uppercase italic tracking-wide text-on-surface/5 select-none">Fieldtrip Archive</p>
               <p className="font-mono text-[9px] font-black text-on-surface/25 uppercase tracking-[0.4em] leading-none">Registry // v.4.0.2</p>
            </div>
            <div className="flex justify-center gap-5 text-on-surface/15 pt-2">
               <Zap className="w-4 h-4" />
               <Heart className="w-4 h-4" />
               <LayoutGrid className="w-4 h-4" />
            </div>
         </div>
      </footer>
    </div>
  );
}
