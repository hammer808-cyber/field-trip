import { getStickerById } from '../../data/stickers';
import { getZinePageStickerPlacements } from '../../logic/zineStickerPlacements';
import type { ZinePage } from '../../types/zine';

interface ZineStickerLayerProps {
  page: Pick<ZinePage, 'stickers' | 'stickerIds'>;
}

export function ZineStickerLayer({ page }: ZineStickerLayerProps) {
  const placements = getZinePageStickerPlacements(page);

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" aria-hidden="true">
      {placements.map(placement => {
        const sticker = getStickerById(placement.stickerId);
        if (!sticker) return null;
        return (
          <img
            key={placement.stickerId}
            src={sticker.imageUrl}
            alt=""
            className="absolute h-auto max-w-none object-contain drop-shadow-[2px_3px_0_rgba(0,0,0,0.35)]"
            style={{
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              width: `${Math.round(68 * placement.scale)}px`,
              transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`
            }}
          />
        );
      })}
    </div>
  );
}

