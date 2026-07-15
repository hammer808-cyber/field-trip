import { Move, RotateCw, Trash2 } from 'lucide-react';
import type { StickerDefinition } from '../../data/stickers';
import {
  addZineStickerPlacement,
  MAX_ZINE_PAGE_STICKERS,
  moveZineStickerPlacement,
  removeZineStickerPlacement,
  rotateZineStickerPlacement
} from '../../logic/zineStickerPlacements';
import type { ZineStickerPlacement } from '../../types/zine';
import { cn } from '../../lib/utils';

interface ZineStickerPickerProps {
  unlockedStickers: readonly StickerDefinition[];
  placements: readonly ZineStickerPlacement[];
  disabled?: boolean;
  onChange: (placements: ZineStickerPlacement[]) => void;
}

export function ZineStickerPicker({
  unlockedStickers,
  placements,
  disabled = false,
  onChange
}: ZineStickerPickerProps) {
  const placedIds = new Set(placements.map(placement => placement.stickerId));
  const atLimit = placements.length >= MAX_ZINE_PAGE_STICKERS;

  if (unlockedStickers.length === 0) {
    return (
      <div className="border-2 border-dashed border-on-surface/25 p-4 font-mono text-[9px] font-black uppercase text-on-surface/45">
        No unlocked stickers are available yet.
      </div>
    );
  }

  return (
    <section className="sm:col-span-2 space-y-3" aria-label="Zine sticker picker">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[8px] font-black uppercase">Stickers</span>
        <span className="font-mono text-[8px] font-black uppercase opacity-45">
          {placements.length} / {MAX_ZINE_PAGE_STICKERS} placed
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar" role="list" aria-label="Unlocked stickers">
        {unlockedStickers.map(sticker => {
          const isPlaced = placedIds.has(sticker.id);
          return (
            <button
              key={sticker.id}
              type="button"
              role="listitem"
              disabled={disabled || isPlaced || atLimit}
              onClick={() => onChange(addZineStickerPlacement(placements, sticker.id))}
              className={cn(
                'skin-button relative flex min-h-[92px] w-[82px] shrink-0 flex-col items-center justify-between gap-1 border-2 border-on-surface bg-white p-2 text-center disabled:cursor-not-allowed',
                isPlaced ? 'opacity-45' : 'hover:-translate-y-0.5'
              )}
              aria-label={`${isPlaced ? 'Placed' : 'Add'} ${sticker.name}`}
              title={isPlaced ? `${sticker.name} is already on this page` : `Add ${sticker.name}`}
            >
              <img src={sticker.imageUrl} alt="" className="h-12 w-12 object-contain" />
              <span className="line-clamp-2 font-mono text-[7px] font-black uppercase leading-tight">
                {isPlaced ? 'Placed' : sticker.name}
              </span>
            </button>
          );
        })}
      </div>

      {placements.length > 0 && (
        <div className="space-y-2" aria-label="Placed stickers">
          {placements.map(placement => {
            const sticker = unlockedStickers.find(item => item.id === placement.stickerId);
            if (!sticker) return null;
            return (
              <div key={placement.stickerId} className="flex min-h-12 items-center gap-2 border border-on-surface/20 bg-white p-2">
                <img src={sticker.imageUrl} alt="" className="h-9 w-9 shrink-0 object-contain" />
                <span className="min-w-0 flex-1 truncate font-mono text-[8px] font-black uppercase">{sticker.name}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(moveZineStickerPlacement(placements, sticker.id))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-on-surface bg-white disabled:opacity-40"
                  aria-label={`Move ${sticker.name}`}
                  title="Move sticker"
                >
                  <Move className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(rotateZineStickerPlacement(placements, sticker.id))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-on-surface bg-white disabled:opacity-40"
                  aria-label={`Rotate ${sticker.name}`}
                  title="Rotate sticker"
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(removeZineStickerPlacement(placements, sticker.id))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-red-700 bg-white text-red-700 disabled:opacity-40"
                  aria-label={`Remove ${sticker.name}`}
                  title="Remove sticker"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

