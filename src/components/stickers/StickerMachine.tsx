import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, RefreshCw, Sparkles, Star } from 'lucide-react';
import { getAllStickers, type StickerDefinition } from '../../data/stickers';
import { useApp } from '../../context/AppContext';
import {
  getUserUnlockedStickers,
  markStickerSeen,
  MAX_FEATURED_STICKERS,
  setFeaturedSticker,
  type UserUnlockedSticker
} from '../../services/stickerService';
import { StickerDetailModal } from './StickerDetailModal';
import { StickerFilterTabs, type StickerFilter } from './StickerFilterTabs';
import { filterStickersByArchetype, StickerGrid } from './StickerGrid';

const ALL_STICKERS = getAllStickers();

export function StickerMachine() {
  const { user } = useApp();
  const [activeFilter, setActiveFilter] = useState<StickerFilter>('all');
  const [unlocks, setUnlocks] = useState<UserUnlockedSticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<StickerDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingFeatured, setIsUpdatingFeatured] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  const loadUnlocks = useCallback(async () => {
    if (!user?.uid) {
      setUnlocks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const nextUnlocks = await getUserUnlockedStickers(user.uid);
    setUnlocks(nextUnlocks);
    setIsLoading(false);
  }, [user?.uid]);

  useEffect(() => {
    void loadUnlocks();
  }, [loadUnlocks]);

  const unlocksById = useMemo(
    () => new Map(unlocks.map(unlock => [unlock.stickerId, unlock])),
    [unlocks]
  );
  const visibleStickers = useMemo(
    () => filterStickersByArchetype(ALL_STICKERS, activeFilter),
    [activeFilter]
  );
  const featuredUnlocks = unlocks.filter(unlock => unlock.equipped);
  const selectedUnlock = selectedSticker ? unlocksById.get(selectedSticker.id) : undefined;
  const unseenCount = unlocks.filter(unlock => !unlock.seen).length;

  const openSticker = useCallback((sticker: StickerDefinition) => {
    setSelectedSticker(sticker);
    setFeaturedError(null);
    const unlock = unlocksById.get(sticker.id);
    if (!user?.uid || !unlock || unlock.seen) return;

    setUnlocks(current => current.map(record => (
      record.stickerId === sticker.id ? { ...record, seen: true } : record
    )));
    void markStickerSeen(user.uid, sticker.id).then(success => {
      if (!success) {
        console.warn('[StickerMachine] Could not persist viewed sticker state', {
          userId: user.uid,
          stickerId: sticker.id
        });
      }
    });
  }, [unlocksById, user?.uid]);

  const updateFeatured = useCallback(async (featured: boolean) => {
    if (!user?.uid || !selectedSticker || !selectedUnlock) return;
    setIsUpdatingFeatured(true);
    setFeaturedError(null);
    const success = await setFeaturedSticker(user.uid, selectedSticker.id, featured);
    if (success) {
      setUnlocks(current => current.map(record => (
        record.stickerId === selectedSticker.id ? { ...record, equipped: featured } : record
      )));
    } else {
      setFeaturedError('Could not update profile stickers. Try again.');
      console.warn('[StickerMachine] Featured sticker update was rejected', {
        userId: user.uid,
        stickerId: selectedSticker.id,
        requestedFeaturedState: featured
      });
    }
    setIsUpdatingFeatured(false);
  }, [selectedSticker, selectedUnlock, user?.uid]);

  if (isLoading) {
    return (
      <section aria-label="Loading Sticker Machine" className="space-y-5">
        <div className="h-28 animate-pulse rounded-lg bg-[var(--skin-surface-muted,rgba(0,0,0,0.08))] motion-reduce:animate-none" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-lg bg-[var(--skin-surface-muted,rgba(0,0,0,0.08))] motion-reduce:animate-none" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="sticker-machine-title">
      <header
        className="skin-card relative overflow-hidden border-2 p-5 sm:p-6"
        style={{
          borderColor: 'var(--skin-border)',
          borderRadius: 'var(--skin-card-radius, 8px)',
          background: 'var(--skin-surface)',
          color: 'var(--skin-text)',
          boxShadow: 'var(--skin-card-shadow, 5px 5px 0 var(--skin-border))'
        }}
      >
        <div className="absolute right-3 top-3 opacity-10" aria-hidden="true">
          <Gift className="h-24 w-24" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Prize counter // Collection 01</p>
            <h2 id="sticker-machine-title" className="mt-2 font-display text-2xl font-black uppercase leading-none sm:text-3xl">
              Sticker Machine
            </h2>
            <p className="mt-2 max-w-md font-serif text-sm font-semibold opacity-65">
              Earn them in the field. Pick up to three for your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadUnlocks()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-[var(--skin-surface)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--skin-border)', outlineColor: 'var(--skin-focus,var(--skin-primary))' }}
            aria-label="Refresh sticker collection"
            title="Refresh stickers"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2 sm:max-w-sm">
          {Array.from({ length: MAX_FEATURED_STICKERS }).map((_, index) => {
            const featured = featuredUnlocks[index];
            const definition = featured ? ALL_STICKERS.find(sticker => sticker.id === featured.stickerId) : undefined;
            return (
              <div
                key={featured?.stickerId ?? `empty-feature-${index}`}
                className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-[var(--skin-background)] p-2"
                style={{ borderColor: 'var(--skin-border)' }}
              >
                {definition ? (
                  <img src={definition.imageUrl} alt={definition.name} className="h-full w-full object-contain" />
                ) : (
                  <Star className="h-5 w-5 opacity-20" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] font-black uppercase">
          <span>{unlocks.length} / {ALL_STICKERS.length} unlocked</span>
          <span>{featuredUnlocks.length} / {MAX_FEATURED_STICKERS} featured</span>
          {unseenCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-[var(--skin-primary)] px-2 py-1">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> {unseenCount} new
            </span>
          )}
        </div>
      </header>

      <StickerFilterTabs activeFilter={activeFilter} onChange={setActiveFilter} />

      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[9px] font-black uppercase opacity-55">
          Showing {visibleStickers.length} stickers
        </p>
        <p className="font-mono text-[9px] font-black uppercase opacity-55">
          Tap one for details
        </p>
      </div>

      <StickerGrid
        stickers={visibleStickers}
        unlocksById={unlocksById}
        onOpenSticker={openSticker}
      />

      <StickerDetailModal
        sticker={selectedSticker}
        unlock={selectedUnlock}
        featuredCount={featuredUnlocks.length}
        maxFeatured={MAX_FEATURED_STICKERS}
        isUpdatingFeatured={isUpdatingFeatured}
        featuredError={featuredError}
        onClose={() => {
          setSelectedSticker(null);
          setFeaturedError(null);
        }}
        onSetFeatured={featured => void updateFeatured(featured)}
      />
    </section>
  );
}
