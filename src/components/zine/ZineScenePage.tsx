import { getSceneSlotFill, getZineSceneStyle } from '../../logic/zineScenes';
import { resolveMissionById } from '../../logic/missionResolver';
import { getDeckPackById } from '../../data/deckPacks';
import { ProofImage } from '../ProofImage';
import { ZineStickerLayer } from './ZineStickerLayer';
import { cn } from '../../lib/utils';
import type { ZinePage, ZineProofSnapshot, ZineSceneItem } from '../../types/zine';

function proofImageEntry(snapshot?: ZineProofSnapshot | null) {
  if (!snapshot) return null;
  return snapshot.mediaRef.startsWith('http') || snapshot.mediaRef.startsWith('data:')
    ? { id: snapshot.entryId, imageUrl: snapshot.mediaRef, photoUrl: snapshot.mediaRef }
    : { id: snapshot.entryId, storagePath: snapshot.mediaRef };
}

function SlotItem({ item, candidates }: { item: ZineSceneItem; candidates: ZineProofSnapshot[] }) {
  if (item.kind === 'proof') {
    const snapshot = candidates.find(candidate => candidate.entryId === item.proofEntryId);
    const entry = proofImageEntry(snapshot);
    if (!entry) return <div className="w-full h-full grid place-items-center p-2 text-center font-mono text-xs uppercase opacity-60">Receipt no longer available</div>;
    return (
      <div className="relative w-full h-full overflow-hidden">
        <ProofImage entry={entry} className="absolute inset-0 w-full h-full" alt={snapshot?.missionTitle || 'Scene receipt'} />
        <span className="absolute inset-x-0 bottom-0 bg-black/80 text-white px-2 py-1 font-mono text-xs font-black uppercase truncate">
          {snapshot?.missionTitle || 'Receipt'}
        </span>
      </div>
    );
  }
  if (item.kind === 'mission') {
    const mission = resolveMissionById(item.missionId);
    const deck = getDeckPackById(item.deckId || '');
    if (!mission) {
      return (
        <div className="w-full h-full grid place-items-center p-2 text-center">
          <p className="font-mono text-xs uppercase opacity-60">Mission no longer in the deck — saved copy only</p>
        </div>
      );
    }
    return (
      <div className="w-full h-full p-2 sm:p-3 flex flex-col gap-1 overflow-hidden">
        <span className="font-mono text-xs font-black uppercase opacity-60">{deck?.packName || item.deckId} / {mission.baseXP} XP</span>
        <p className="font-display font-black uppercase italic leading-none text-base sm:text-lg">{mission.title}</p>
        <p className="font-serif italic text-xs sm:text-sm leading-snug line-clamp-4">{mission.description}</p>
      </div>
    );
  }
  return (
    <div className="w-full h-full p-2 sm:p-3 overflow-hidden">
      <p className="font-serif italic text-sm sm:text-base leading-snug line-clamp-6">“{item.noteText}”</p>
    </div>
  );
}

interface ZineScenePageProps {
  page: ZinePage;
  candidates: ZineProofSnapshot[];
  /** Edit mode: slots become tap targets. */
  onSlotClick?: (slotId: string) => void;
  activeSlotId?: string | null;
}

/**
 * Renders a scene page: the style background, fixed slots with their
 * pasted items, the sticker-zone guide, and the sticker layer.
 * Style colours come from the --scene-* vars in index.css only.
 */
export function ZineScenePage({ page, candidates, onSlotClick, activeSlotId }: ZineScenePageProps) {
  const style = getZineSceneStyle(page.sceneStyleId);
  if (!style) return null;
  const items = page.sceneItems || [];
  return (
    <div
      className="relative w-full aspect-[3/4] overflow-hidden border-4 border-on-surface"
      style={{ background: style.palette.bg, color: style.palette.ink }}
      aria-label={`${style.name} scene page`}
    >
      <span className="absolute top-2 left-2 z-10 px-2 py-1 font-mono text-xs font-black uppercase" style={{ background: style.palette.paper, color: style.palette.ink }}>
        {style.name}
      </span>
      {style.slots.map(slot => {
        const fill = getSceneSlotFill(items, slot.id);
        const slotStyle = {
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          width: `${slot.w}%`,
          height: `${slot.h}%`,
          transform: `rotate(${slot.rotation}deg)`,
          background: style.palette.paper,
          borderColor: style.palette.accent,
          outline: activeSlotId === slot.id ? `4px solid ${style.palette.accent}` : undefined,
        } as const;
        if (onSlotClick) {
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSlotClick(slot.id)}
              className={cn(
                'absolute overflow-hidden border-2 text-left',
                fill ? 'shadow-[4px_4px_0px_rgba(0,0,0,0.35)]' : 'border-dashed grid place-items-center'
              )}
              style={slotStyle}
              aria-label={fill ? `Change ${slot.kind} in slot ${slot.id}` : `Add ${slot.kind} to slot ${slot.id}`}
            >
              {fill ? (
                <SlotItem item={fill} candidates={candidates} />
              ) : (
                <span className="font-mono text-xs font-black uppercase opacity-60">+ Add {slot.kind === 'proof' ? 'photo' : slot.kind}</span>
              )}
            </button>
          );
        }
        return (
          <div key={slot.id} className="absolute overflow-hidden border-2 shadow-[4px_4px_0px_rgba(0,0,0,0.35)]" style={slotStyle}>
            {fill ? (
              <SlotItem item={fill} candidates={candidates} />
            ) : (
              <div className="w-full h-full grid place-items-center p-2 text-center font-mono text-xs uppercase opacity-40">Empty {slot.kind} slot</div>
            )}
          </div>
        );
      })}
      <div
        className="absolute border-2 border-dashed grid place-items-center"
        style={{
          left: `${style.stickerZone.x}%`,
          top: `${style.stickerZone.y}%`,
          width: `${style.stickerZone.w}%`,
          height: `${style.stickerZone.h}%`,
          borderColor: style.palette.accent2,
        }}
        aria-hidden="true"
      >
        <span className="font-mono text-xs font-black uppercase opacity-50">Sticker zone</span>
      </div>
      <ZineStickerLayer page={page} />
    </div>
  );
}
