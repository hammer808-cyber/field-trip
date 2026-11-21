import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { getRewardsByType } from '../data/rewardRegistry';
import { 
  Lock, 
  ChevronLeft, 
  Sparkles, 
  Zap, 
  Book, 
  Star, 
  ArrowRight, 
  LayoutGrid, 
  Box,
  Heart
} from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { FieldBadge } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import { getDeckCatalogSections, getDeckPackById, getDefaultDeckPack, getActiveDeckPacks, normalizeDeckPackId } from '../data/deckPacks';
import { useNearbyDeckPackIds } from '../hooks/useNearbyDeckPackIds';
import { FieldPageHero } from '../components/FieldPageHero';
import { MissionCard } from '../components/ChallengeCard';
import { CrewMemoriesFeed } from '../components/CrewMemoriesFeed';
import { CommunityProofsFeed } from '../components/CommunityProofsFeed';
import { getDeckProgress, getStarterProgress } from '../services/canonicalProgress';
import { DECK_PACK_SORTS, isDeckPackSort, sortDeckPacks } from '../logic/deckSort';
import type { DeckPackSort } from '../logic/deckSort';
import { ZineWorkspace } from '../components/ZineWorkspace';
import { GatedFeaturePanel } from '../components/GatedFeaturePanel';
import { StickerMachine } from '../components/stickers/StickerMachine';
import { EmptyStatePanel } from '../components/FieldtripLoader';
import { FieldButton, FieldStatusChip, PlayerPageBody, PlayerPageShell } from '../components/player';

type CollectionTab = 'zines' | 'memories' | 'stickers' | 'decks' | 'missions' | 'crew_memories';

// Tabs that still exist on the DEX page. 'collection' and its 'badges'
// twin were removed Nov 17, 2026 — the medals cabinet went with them,
// and old links/params fall back to 'decks' instead of a blank page.
const DEX_TABS: CollectionTab[] = ['decks', 'stickers', 'zines', 'memories', 'missions', 'crew_memories'];
type MemoriesView = 'mine' | 'community';

export default function CollectionPage() {
  const { 
    profile, 
    trips,
    unlockDiscoverySticker,
    isHeatwaveDeckUnlocked,
    isAdmin,
    currentDate,
    drawnMissionCards,
    canonicalProgress,
    getDeckAccessForPack
  } = useApp();
  const { allSkins } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  // P1-8 (Nov 20, 2026): DEX opens on the sticker collection, not the
  // deck shelf. An explicit tab (?tab=, /dex/<tab>) or a legacy alias
  // still wins over this default.
  const rawInitialTab = (
    initialTabParam === 'skins' ||
    initialTabParam === 'badges' ||
    initialTabParam === 'crew_home'
      ? 'decks'
      : initialTabParam === 'crew_memories'
        ? 'memories'
        : initialTabParam === 'stickers'
          ? 'stickers'
          : (initialTabParam as CollectionTab)
  ) || 'stickers';
  const initialTab: CollectionTab = DEX_TABS.includes(rawInitialTab as CollectionTab) ? (rawInitialTab as CollectionTab) : 'decks';
  const [activeTab, setActiveTab] = useState<CollectionTab>(initialTab);
  const [memoriesView, setMemoriesView] = useState<MemoriesView>(
    typeof window !== 'undefined' && window.location.pathname.includes('/community') ? 'community' : 'mine'
  );

  const activePacks = getActiveDeckPacks();
  // Near You (option A, Nov 20, 2026): one-shot location read; boosted
  // decks float to the top of their section with a badge. Null until the
  // read resolves — the list renders in normal order meanwhile.
  const nearbyPackIds = useNearbyDeckPackIds();
  const starterProgress = getStarterProgress(canonicalProgress);
  const isStarterComplete = starterProgress.starterComplete;
  // Nov 20, 2026: Dex Decks-tab sort. The choice persists per device so
  // the catalog stays in the order the player picked.
  const [deckSort, setDeckSort] = useState<DeckPackSort>(() => {
    if (typeof window === 'undefined') return 'catalog';
    const saved = window.localStorage.getItem('dex-deck-sort');
    return isDeckPackSort(saved) ? saved : 'catalog';
  });
  const handleDeckSortChange = (value: string) => {
    if (!isDeckPackSort(value)) return;
    setDeckSort(value);
    try { window.localStorage.setItem('dex-deck-sort', value); } catch { /* private mode: the sort still works for this visit */ }
  };
  // Progress per pack, so the Most/Least complete sorts have something to
  // sort by. Sections keep their fixed order; packs reorder within them.
  const deckProgressById: Record<string, number> = {};
  for (const pack of activePacks) {
    deckProgressById[pack.packId] = getDeckProgress(canonicalProgress, pack.packId).percent;
  }
  const deckSections = getDeckCatalogSections(activePacks, nearbyPackIds).map(section => ({
    ...section,
    packs: sortDeckPacks(section.packs, deckSort, deckProgressById),
  }));

  const getPackLockState = (packId: string) => {
    const pack = activePacks.find(p => p.packId === packId);

    const access = getDeckAccessForPack(pack);
    if (!access.playable) {
      return {
        locked: true,
        reason: access.reason || "Complete prerequisite deck"
      };
    }
    
    if (pack?.isFutureDrop) {
      return {
        locked: !isAdmin,
        reason: "Locked for a future drop"
      };
    }

    if (packId === 'starter-signals') return { locked: false, reason: "" };

    if (packId === 'heatwave-receipts') {
      const activeByDate = new Date(currentDate) >= new Date('2026-06-06T00:00:00Z');
      
      if (!isHeatwaveDeckUnlocked && !isAdmin) {
        if (!isStarterComplete) return { locked: true, reason: "Complete Starter Pack (3/3 missions) to unlock" };
        if (!activeByDate) return { locked: true, reason: "Opens Saturday, June 6th" };
        return { locked: true, reason: "Complete Starter Pack (3/3 missions) to unlock" };
      }
      return { locked: false, reason: "" };
    }

    return { locked: false, reason: "" };
  };

  useEffect(() => {
    unlockDiscoverySticker('dex_open', 'dex');
    unlockDiscoverySticker('dex_discovered', 'dex');
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const tab = tabParam as CollectionTab | null;
    if (tabParam === 'skins' || tabParam === 'badges' || tabParam === 'crew_home') {
      setActiveTab('decks');
    } else if (tabParam === 'crew_memories') {
      setActiveTab('memories');
      setMemoriesView('mine');
    } else if (tabParam === 'stickers') {
      setActiveTab('stickers');
    } else if (tab) {
      setActiveTab(DEX_TABS.includes(tab) ? tab : 'decks');
    }
  }, [searchParams]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/dex/memories/community')) {
      setActiveTab('memories');
      setMemoriesView('community');
    } else if (path.includes('/dex/memories')) {
      setActiveTab('memories');
      setMemoriesView('mine');
    } else if (path.includes('/dex/decks')) {
      setActiveTab('decks');
    } else if (path.includes('/dex/zines')) {
      setActiveTab('zines');
    } else if (path.includes('/dex/stickers')) {
      setActiveTab('stickers');
    }
  }, [location.pathname]);

  const handleTabChange = (id: CollectionTab) => {
    setActiveTab(id);
    if (id === 'stickers') {
      unlockDiscoverySticker('sticker_collection_view', 'dex');
    }

    const tabPath: Partial<Record<CollectionTab, string>> = {
      decks: '/dex/decks',
      stickers: '/dex/stickers',
      zines: '/dex/zines',
      memories: '/dex/memories'
    };
    const nextPath = tabPath[id];
    if (nextPath && location.pathname !== nextPath) {
      navigate(nextPath);
    }
  };

  const stickers = getRewardsByType('sticker');
  const badges = getRewardsByType('badge');

  const unlockedStickers = new Set(profile?.unlockedRewards?.stickers || []);
  const unlockedBadges = new Set(profile?.unlockedRewards?.badges || []);
  const unlockedSkinsList = profile?.unlockedRewards?.skins || ['classic'];
  const unlockedSkins = new Set(unlockedSkinsList);
  const totalRewards = stickers.length + badges.length + allSkins.length;
  const totalUnlocked = unlockedStickers.size + unlockedBadges.size + unlockedSkins.size;

  const currentPackId = normalizeDeckPackId(
    typeof window !== 'undefined' ? localStorage.getItem('active_deck_pack_id') || getDefaultDeckPack().packId : getDefaultDeckPack().packId
  );
  const currentPack = getDeckPackById(currentPackId);

  const currentPackProgress = currentPack ? getDeckProgress(canonicalProgress, currentPack.packId) : null;
  const packMissionsCount = currentPackProgress?.totalCards || currentPack?.missionIds?.length || 10;
  const completedPackCount = currentPackProgress?.approvedCount || 0;

  const LockedStarterPanel = (_props?: { label?: string }) => (
    <GatedFeaturePanel featureName="Dex" />
  );

  return (
    <PlayerPageShell department="dex" className="skin-memories">
      <FieldPageHero
        variant="editorial"
        department="dex"
        eyebrow="Collector cabinet"
        title="DEX"
        subtitle="This is where the stuff you've earned and collected lives."
        backgroundIcon={<Book className="w-64 h-64" />}
        infoCardLabel="Collected"
        infoCardValue={totalUnlocked.toString()}
        infoCardSubtext={`${totalUnlocked} of ${totalRewards} unlocked`}
        infoCardAccent="purple"
        tabs={[
          { id: 'decks', label: 'Decks' },
          { id: 'stickers', label: 'Stickers' },
          { id: 'zines', label: 'Zines' },
          { id: 'memories', label: 'Memories' }
        ]}
        activeTab={activeTab}
        onTabChange={(id) => handleTabChange(id as CollectionTab)}
      />

      <PlayerPageBody>
        <main className="relative min-h-[45vh] border-4 border-[var(--skin-border)] bg-[var(--skin-surface)] p-4 shadow-[8px_8px_0_var(--skin-border)] sm:p-8">
         <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.015)_1.5px,transparent_0)] bg-[size:16px_16px] pointer-events-none" />
         <div className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'stickers' && (
            <motion.div
              key="stickers-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              <StickerMachine />
            </motion.div>
          )}

          {activeTab === 'zines' && (
            <motion.div
              key="zines-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-5"
            >
              <ZineWorkspace />
            </motion.div>
          )}

          {activeTab === 'memories' && (
            <motion.div
              key="memories-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="flex justify-center">
                <div className="inline-flex border-4 border-on-surface shadow-[5px_5px_0px_black] bg-white p-1">
                  {[
                    ['mine', 'My Memories'],
                    ['community', 'Community Proofs']
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMemoriesView(id as MemoriesView)}
                      className={cn(
                        "px-4 py-2 font-mono text-xs font-black uppercase tracking-widest",
                        memoriesView === id ? "bg-brand-lime text-on-surface" : "text-on-surface/60 hover:text-on-surface"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {memoriesView === 'community'
                ? <CommunityProofsFeed />
                : (isStarterComplete || isAdmin ? <CrewMemoriesFeed /> : <LockedStarterPanel label="Memories" />)}
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
                <EmptyStatePanel
                  title="No saved missions"
                  body="Saved missions will show up here."
                  hint="Draw a card on Missions, then tap Save for later."
                  icon={<Box className="h-8 w-8" />}
                  action={<FieldButton onClick={() => navigate('/missions')}>Draw a mission</FieldButton>}
                />
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
                               "px-3 py-1.5 rounded-xl border-[2.5px] text-xs font-black uppercase tracking-widest flex items-center gap-2",
                               card.status === 'active' ? "bg-brand-orange text-white border-on-surface shadow-[4px_4px_0px_black]" :
                               card.status === 'approved' ? "bg-brand-lime text-on-surface border-on-surface shadow-[4px_4px_0px_black]" :
                               card.status === 'pending_review' ? "bg-yellow-400 text-on-surface border-on-surface shadow-[4px_4px_0px_black]" :
                               "bg-white text-on-surface/60 border-on-surface/10"
                             )}>
                               {card.status === 'active' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                               {card.status === 'active' ? 'In progress' : card.status === 'pending_review' ? 'Pending' : card.status === 'approved' ? 'Approved' : card.status.replace('_', ' ')}
                             </div>
                             
                             {/* CTAs */}
                             {card.status === 'drawn' || card.status === 'saved_for_later' ? (
                               <button 
                                 onClick={() => navigate(`/mission-briefing?id=${mission.id}`)}
                                 className="px-4 py-1.5 bg-on-surface text-brand-lime border-[2.5px] border-on-surface text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all flex items-center gap-1.5"
                               >
                                 Do This Mission <ArrowRight className="w-3.5 h-3.5" />
                               </button>
                             ) : card.status === 'active' ? (
                               <button 
                                 onClick={() => navigate(`/capture?id=${mission.id}`)}
                                 className="px-4 py-1.5 bg-brand-orange text-white border-[2.5px] border-on-surface text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all flex items-center gap-1.5"
                               >
                                 Resume Mission <ArrowRight className="w-3.5 h-3.5" />
                               </button>
                             ) : card.status === 'approved' ? (
                               <button 
                                 onClick={() => navigate('/profile?tab=logbook')}
                                 className="px-4 py-1.5 bg-white text-on-surface border-[2.5px] border-on-surface text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all flex items-center gap-1.5"
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

          {activeTab === 'decks' && (
            <motion.div 
              key="decks-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-end gap-2">
                <label htmlFor="dex-deck-sort" className="font-mono text-xs font-black uppercase tracking-widest text-on-surface/60">Sort</label>
                <select
                  id="dex-deck-sort"
                  value={deckSort}
                  onChange={(event) => handleDeckSortChange(event.target.value)}
                  className="border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-3 py-2 font-mono text-xs font-black uppercase tracking-widest text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]"
                >
                  {DECK_PACK_SORTS.map(option => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
              {deckSections.map(section => (
                <section key={section.id} className="space-y-4">
                  <h2 className="font-display text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-on-surface">
                    {section.label}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.packs.map(pack => {
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
                    {((!locked && isCurrent) || nearbyPackIds?.has(pack.packId)) && (
                       <div className="absolute top-0 right-0 p-2 flex gap-1.5">
                          {nearbyPackIds?.has(pack.packId) && (
                            <FieldBadge variant="sticker" color="lime" size="xs" className="py-0.5 px-2">Near you</FieldBadge>
                          )}
                          {!locked && isCurrent && (
                            <FieldBadge variant="sticker" color="orange" size="xs" className="py-0.5 px-2">CURRENT</FieldBadge>
                          )}
                       </div>
                    )}

                    {pack.coverImage && (
                      <div className="-mx-6 -mt-6 aspect-[4/3] overflow-hidden border-b-[3px] border-on-surface">
                        <img
                          src={pack.coverImage}
                          alt={`${pack.packName} cover art`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex justify-between items-center w-full">
                       <div className="bg-on-surface text-white px-3 py-1 font-mono text-xs font-black uppercase tracking-widest rounded-lg">
                          {pack.shortName || 'DOSSIER'}
                       </div>
                       {!locked && completedCount === missionsInPack.length && missionsInPack.length > 0 && (
                         <div className="w-8 h-8 bg-brand-lime rounded-full flex items-center justify-center border-2 border-on-surface shadow-[2px_2px_0px_black] rotate-6 shrink-0">
                            <Star className="w-4 h-4 text-on-surface fill-on-surface" />
                         </div>
                       )}
                       {locked && <Lock className="w-4 h-4 text-on-surface/60" />}
                    </div>

                    <div className="space-y-1.5 text-left">
                       <h4 className="font-display text-2xl sm:text-3.5xl font-black uppercase italic tracking-tighter text-on-surface leading-none">
                         {pack.packName}
                       </h4>
                       <p className="text-xs sm:text-sm font-serif italic text-on-surface/60">
                         {locked ? reason : (pack.deckSubtitle || pack.description)}
                       </p>
                    </div>

                    <div className="mt-auto space-y-3 pt-2">
                       <div className="flex justify-between items-center text-xs font-mono font-black uppercase tracking-wider text-on-surface/60">
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
                          navigate(`/missions?pack=${pack.packId}`);
                        }}
                        className="w-full py-2 bg-on-surface/5 hover:bg-on-surface/10 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                      >
                        Select Deck
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
                    })}
                  </div>
                </section>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
         </div>
      </main>
      </PlayerPageBody>
    </PlayerPageShell>
  );
}
