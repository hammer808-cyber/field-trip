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
import { Card, FieldBadge } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { getDeckPackById, getDefaultDeckPack, getActiveDeckPacks } from '../data/deckPacks';
import { FieldPageHero } from '../components/FieldPageHero';
import { MissionCard } from '../components/ChallengeCard';
import { CrewMemoriesFeed } from '../components/CrewMemoriesFeed';
import { markEarnedStickersSeen } from '../services/stickerService';
import { canAccessFeature, getDeckProgress, getStarterProgress } from '../services/canonicalProgress';

type CollectionTab = 'stickers' | 'badges' | 'skins' | 'decks' | 'missions' | 'crew_memories';

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
  const { skin: currentSkin, allSkins, setSkin } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as CollectionTab) || 'stickers';
  const [activeTab, setActiveTab] = useState<CollectionTab>(initialTab);

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
    const tab = searchParams.get('tab') as CollectionTab | null;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

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
          { id: 'missions', label: 'Mission Cards' },
          { id: 'crew_memories', label: 'Crew Memories' },
          { id: 'stickers', label: 'Sticker Deck' },
          { id: 'badges', label: 'Medals' },
          { id: 'skins', label: 'Personas' },
          { id: 'decks', label: 'Catalog' }
        ]}
        activeTab={activeTab}
        onTabChange={(id) => handleTabChange(id as CollectionTab)}
      />

      <main className="px-4 sm:px-10 py-10 max-w-6xl mx-auto min-h-[45vh] bg-white border-x-4 border-b-4 border-on-surface shadow-[10px_10px_0px_black] relative rounded-b-[2.5rem] z-10 -mt-1">
         <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.015)_1.5px,transparent_0)] bg-[size:16px_16px] pointer-events-none rounded-b-[2.5rem]" />
        <AnimatePresence mode="wait">
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

          {activeTab === 'skins' && (
            <motion.div 
              key="skins-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {allSkins.map(item => {
                const isUnlocked = unlockedSkins.has(item.id) || item.isDefault;
                const isCurrent = currentSkin.id === item.id;
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "group p-6 rounded-[2.5rem] border-3 transition-all relative overflow-hidden flex flex-col gap-5",
                      isUnlocked 
                        ? (isCurrent ? "bg-white border-on-surface shadow-[8px_8px_0px_black] scale-[1.01]" : "bg-white border-on-surface/10 hover:border-on-surface/40 hover:shadow-md")
                        : "bg-[#F5F2EC] border-on-surface/5 grayscale opacity-45 border-dashed"
                    )}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                       <div 
                         className="w-16 h-16 border-2 border-on-surface/15 rounded-[1.5rem] flex items-center justify-center shrink-0 group-hover:rotate-2 transition-transform relative overflow-hidden shadow-inner"
                         style={{ backgroundColor: item.themeTokens.backgroundColor }}
                       >
                          {item.assets.backgroundTexture && (
                            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: item.assets.backgroundTexture }} />
                          )}
                          <div 
                            className="w-10 h-10 rounded-full border-2 border-white/50 shadow-md" 
                            style={{ backgroundColor: item.themeTokens.primaryColor }}
                          />
                       </div>
                       <div className="min-w-0 text-left">
                          <h4 className="text-xl sm:text-2xl font-display font-black uppercase italic tracking-tight truncate leading-none text-on-surface">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                             <span className="text-[9px] font-mono font-black uppercase text-on-surface/40">
                                {item.rarity} Look
                             </span>
                          </div>
                       </div>
                    </div>

                    <p className="text-xs sm:text-sm font-serif italic text-on-surface/60 line-clamp-3 leading-relaxed text-left">
                      "{item.description}"
                    </p>

                    <div className="mt-auto pt-4 border-t border-on-surface/5 flex items-center justify-between">
                       {isUnlocked && !isCurrent ? (
                         <button
                           onClick={() => setSkin(item.id)}
                           className="text-[10px] font-black uppercase tracking-widest bg-on-surface text-white px-5 py-2.5 rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                         >
                           Equip Theme
                         </button>
                       ) : isCurrent ? (
                         <FieldBadge variant="sticker" color="lime" rotation={0} size="sm" className="px-3 py-1 shadow-none leading-none">ACTIVE_THEME</FieldBadge>
                       ) : (
                         <div className="text-[9px] font-mono font-black uppercase tracking-wider text-on-surface/30 flex items-center gap-1.5 italic">
                           <Lock className="w-3.5 h-3.5 opacity-55" />
                           Unavailable
                         </div>
                       )}
                       
                       <div className="flex gap-1">
                          {item.previewColors?.slice(0, 3).map((color, i) => (
                            <div key={i} className="w-3.5 h-3.5 rounded-full border border-on-surface/10 shadow-xs" style={{ backgroundColor: color }} />
                          ))}
                       </div>
                    </div>
                  </div>
                );
              })}
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
