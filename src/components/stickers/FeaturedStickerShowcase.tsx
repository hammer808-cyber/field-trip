import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getStickerById, type StickerDefinition } from '../../data/stickers';
import {
  getFeaturedStickers,
  MAX_FEATURED_STICKERS
} from '../../services/stickerService';

interface FeaturedStickerShowcaseProps {
  userId: string | null | undefined;
  onManage: () => void;
}

export function FeaturedStickerShowcase({ userId, onManage }: FeaturedStickerShowcaseProps) {
  const [stickers, setStickers] = useState<StickerDefinition[]>([]);

  useEffect(() => {
    let isCurrent = true;
    if (!userId) {
      setStickers([]);
      return () => {
        isCurrent = false;
      };
    }

    void getFeaturedStickers(userId).then(records => {
      if (!isCurrent) return;
      setStickers(records
        .map(record => getStickerById(record.stickerId))
        .filter((sticker): sticker is StickerDefinition => Boolean(sticker)));
    });
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  return (
    <section className="space-y-3" aria-labelledby="featured-stickers-title">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-brand-orange" aria-hidden="true" />
          <h3 id="featured-stickers-title" className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface/40">
            Featured Stickers
          </h3>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="min-h-11 px-2 font-mono text-[9px] font-black uppercase text-brand-orange underline decoration-2 underline-offset-4"
        >
          Manage
        </button>
      </div>
      <div className="skin-card grid grid-cols-3 gap-3 border-2 p-4" style={{ borderColor: 'var(--skin-border)', background: 'var(--skin-surface)' }}>
        {Array.from({ length: MAX_FEATURED_STICKERS }).map((_, index) => {
          const sticker = stickers[index];
          return (
            <div
              key={sticker?.id ?? `empty-profile-sticker-${index}`}
              className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-[var(--skin-background)] p-2"
              style={{ borderColor: 'var(--skin-border)' }}
            >
              {sticker ? (
                <img src={sticker.imageUrl} alt={sticker.name} className="h-full w-full object-contain" />
              ) : (
                <Star className="h-5 w-5 opacity-15" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

