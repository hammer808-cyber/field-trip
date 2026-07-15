import type { StickerArchetype, StickerDefinition } from '../../data/stickers';
import type { UserUnlockedSticker } from '../../services/stickerService';
import type { StickerFilter } from './StickerFilterTabs';
import { StickerCard } from './StickerCard';

export function filterStickersByArchetype(
  stickers: readonly StickerDefinition[],
  filter: StickerFilter
): StickerDefinition[] {
  if (filter === 'all') return [...stickers];
  return stickers.filter(sticker => sticker.archetype === (filter as StickerArchetype));
}

interface StickerGridProps {
  stickers: readonly StickerDefinition[];
  unlocksById: ReadonlyMap<string, UserUnlockedSticker>;
  onOpenSticker: (sticker: StickerDefinition) => void;
}

export function StickerGrid({ stickers, unlocksById, onOpenSticker }: StickerGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {stickers.map(sticker => (
        <StickerCard
          key={sticker.id}
          sticker={sticker}
          unlock={unlocksById.get(sticker.id)}
          onOpen={onOpenSticker}
        />
      ))}
    </div>
  );
}

