import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BringToFront, Move, RefreshCw, RotateCcw, Sparkles, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { getRewardMetadata, getRewardsByType } from '../data/rewardRegistry';
import { getStickerById } from '../data/stickerRegistry';
import {
  autoArrangeStickerSheet,
  mergeStickerPlacements,
  moveStickerToFront,
  resetStickerSheet,
  STICKER_SHEETS,
  updateStickerPlacement,
} from '../logic/stickerBook';
import { cn } from '../lib/utils';
import { getCurrentZines } from '../services/zineService';
import type { StickerPlacement, StickerSheetId } from '../types/stickers';

interface DragState {
  stickerId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  moved: boolean;
}

export function StickerBook() {
  const { profile, user, updateProfile, entries } = useApp();
  const [activeSheet, setActiveSheet] = useState<StickerSheetId>('recent_finds');
  const [placements, setPlacements] = useState<StickerPlacement[]>([]);
  const [usedInZineIds, setUsedInZineIds] = useState<string[]>([]);
  const [zinesLoaded, setZinesLoaded] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const placementsRef = useRef<StickerPlacement[]>([]);

  const stickerIds = useMemo(() => Array.from(new Set<string>([
    ...(profile?.unlockedRewards?.stickers || []),
    ...((profile?.earnedStickers || []).map(record => record.id)),
  ])), [profile?.earnedStickers, profile?.unlockedRewards?.stickers]);

  const recentStickerIds = useMemo(() => [...(profile?.earnedStickers || [])]
    .sort((a, b) => new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime())
    .slice(0, 6)
    .map(record => record.id), [profile?.earnedStickers]);

  useEffect(() => {
    let active = true;
    getCurrentZines()
      .then(workspace => {
        if (!active) return;
        const ids = [workspace.personal, workspace.crew]
          .filter(Boolean)
          .flatMap(zine => zine?.pages || [])
          .flatMap(page => page.stickerIds || []);
        setUsedInZineIds(Array.from(new Set(ids)));
      })
      .catch(() => setUsedInZineIds([]))
      .finally(() => active && setZinesLoaded(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!zinesLoaded) return;
    const merged = mergeStickerPlacements({
      stickerIds,
      existingPlacements: profile?.stickerPlacements || [],
      recentStickerIds,
      usedInZineIds,
    });
    setPlacements(merged);
    placementsRef.current = merged;
  }, [profile?.stickerPlacements, recentStickerIds, stickerIds, usedInZineIds, zinesLoaded]);

  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  const sheet = STICKER_SHEETS.find(candidate => candidate.id === activeSheet) || STICKER_SHEETS[0];
  const sheetPlacements = placements
    .filter(placement => placement.sheetId === activeSheet)
    .sort((a, b) => a.zIndex - b.zIndex);
  const selectedPlacement = placements.find(placement => placement.stickerId === selectedStickerId) || null;

  const persistPlacements = async (next: StickerPlacement[]) => {
    if (!user?.uid) return;
    setSaveState('saving');
    try {
      await updateProfile(user.uid, { stickerPlacements: next });
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1200);
    } catch (error) {
      setSaveState('idle');
      toast.error('Sticker sheet did not save');
    }
  };

  const commit = (next: StickerPlacement[]) => {
    setPlacements(next);
    placementsRef.current = next;
    void persistPlacements(next);
  };

  const handlePointerDown = (event: React.PointerEvent, placement: StickerPlacement) => {
    if (!sheetRef.current) return;
    const bounds = sheetRef.current.getBoundingClientRect();
    dragRef.current = {
      stickerId: placement.stickerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: placement.x,
      startY: placement.y,
      width: bounds.width,
      height: bounds.height,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaX = ((event.clientX - drag.startClientX) / Math.max(1, drag.width)) * 100;
    const deltaY = ((event.clientY - drag.startClientY) / Math.max(1, drag.height)) * 100;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 1) drag.moved = true;
    setPlacements(current => {
      const next = updateStickerPlacement(current, drag.stickerId, {
        x: drag.startX + deltaX,
        y: drag.startY + deltaY,
      });
      placementsRef.current = next;
      return next;
    });
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) void persistPlacements(placementsRef.current);
    else setSelectedStickerId(drag.stickerId);
  };

  const updateSelected = (update: Partial<Pick<StickerPlacement, 'sheetId' | 'x' | 'y' | 'rotation' | 'scale'>>) => {
    if (!selectedStickerId) return;
    commit(updateStickerPlacement(placements, selectedStickerId, update));
  };

  const handleStickerKeyDown = (event: React.KeyboardEvent, placement: StickerPlacement) => {
    const delta = event.shiftKey ? 5 : 2;
    let update: Partial<StickerPlacement> | null = null;
    if (event.key === 'ArrowLeft') update = { x: placement.x - delta };
    if (event.key === 'ArrowRight') update = { x: placement.x + delta };
    if (event.key === 'ArrowUp') update = { y: placement.y - delta };
    if (event.key === 'ArrowDown') update = { y: placement.y + delta };
    if (!update) return;
    event.preventDefault();
    commit(updateStickerPlacement(placements, placement.stickerId, update));
  };

  const attachToProof = async (entryId: string) => {
    if (!user?.uid || !selectedStickerId || !entryId) return;
    const current = profile?.proofStickerAssignments || {};
    const next = {
      ...current,
      [entryId]: Array.from(new Set([...(current[entryId] || []), selectedStickerId])),
    };
    await updateProfile(user.uid, { proofStickerAssignments: next });
    toast.success('Sticker added to your Logbook receipt');
  };

  const lockedDiscoverable = getRewardsByType('sticker').filter(reward =>
    !stickerIds.includes(reward.id) && reward.rarity !== 'legendary',
  );

  return (
    <section className="space-y-5" aria-label="Sticker book">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] font-black uppercase tracking-widest text-brand-orange">Persistent field binder</p>
          <h2 className="font-display text-3xl sm:text-4xl font-black uppercase italic leading-none">Sticker Book</h2>
        </div>
        <span className="font-mono text-[9px] font-black uppercase text-on-surface/45" aria-live="polite">
          {saveState === 'saving' ? 'Saving placement...' : saveState === 'saved' ? 'Sheet saved' : `${stickerIds.length} earned`}
        </span>
      </div>

      <div className="flex overflow-x-auto border-y-2 border-on-surface bg-[#EDE6D5]" role="tablist" aria-label="Sticker sheets">
        {STICKER_SHEETS.map(option => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={activeSheet === option.id}
            onClick={() => setActiveSheet(option.id)}
            className={cn(
              'min-h-11 shrink-0 px-4 border-r-2 border-on-surface font-mono text-[9px] font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan',
              activeSheet === option.id ? 'bg-brand-lime text-on-surface' : 'bg-white text-on-surface/55',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-black uppercase italic">{sheet.label}</h3>
          <p className="text-xs text-on-surface/55">{sheet.description}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => commit(resetStickerSheet(placements, activeSheet))} className="min-h-11 px-3 border-2 border-on-surface bg-white inline-flex items-center gap-2 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0px_black]">
            <RefreshCw className="w-3.5 h-3.5" /> Reset Sheet
          </button>
          <button type="button" onClick={() => commit(autoArrangeStickerSheet(placements, activeSheet))} className="min-h-11 px-3 border-2 border-on-surface bg-on-surface text-white inline-flex items-center gap-2 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0px_var(--color-brand-orange)]">
            <Sparkles className="w-3.5 h-3.5" /> Auto Arrange
          </button>
        </div>
      </div>

      <div
        ref={sheetRef}
        role="tabpanel"
        className="relative h-[34rem] sm:h-[32rem] overflow-hidden border-4 border-on-surface bg-[#F5E9C9] shadow-[10px_10px_0px_black] touch-pan-y"
      >
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-[linear-gradient(rgba(62,109,157,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(62,109,157,0.18)_1px,transparent_1px)] bg-[size:22px_22px]" />
        <div className="absolute top-0 bottom-0 left-8 border-l-2 border-red-300/50 pointer-events-none" />
        {sheetPlacements.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-on-surface/40">
            <Move className="w-8 h-8 mb-3" />
            <p className="font-display text-xl font-black uppercase italic">Nothing stuck here yet</p>
            <p className="text-xs max-w-xs mt-2">Earn or move a sticker into this sheet. Secret finds stay invisible until unlocked.</p>
          </div>
        )}
        {sheetPlacements.map(placement => (
          <button
            key={placement.stickerId}
            type="button"
            aria-label={`${getRewardMetadata(placement.stickerId).label}. Drag to move or press Enter for details.`}
            onPointerDown={event => handlePointerDown(event, placement)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => { dragRef.current = null; }}
            onKeyDown={event => handleStickerKeyDown(event, placement)}
            className="absolute w-[5.5rem] h-[5.5rem] sm:w-[6.5rem] sm:h-[6.5rem] select-none touch-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan"
            style={{
              left: `${placement.x}%`,
              top: `${placement.y}%`,
              zIndex: placement.zIndex,
              transform: `rotate(${placement.rotation}deg) scale(${placement.scale})`,
              transformOrigin: 'center',
            }}
          >
            <StickerBookVisual stickerId={placement.stickerId} />
          </button>
        ))}
      </div>

      {lockedDiscoverable.length > 0 && (
        <details className="border-2 border-on-surface/20 bg-white p-4">
          <summary className="cursor-pointer font-mono text-[9px] font-black uppercase">Discovery index: {lockedDiscoverable.length} silhouettes</summary>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 pt-4">
            {lockedDiscoverable.map(reward => (
              <div key={reward.id} className="aspect-square border border-dashed border-on-surface/20 bg-on-surface/5 rounded-full flex items-center justify-center" title="Undiscovered sticker">
                <span className="text-2xl grayscale opacity-15" aria-hidden="true">{reward.fallbackEmoji || '★'}</span>
                <span className="sr-only">Undiscovered sticker</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {selectedPlacement && (
        <StickerDetail
          placement={selectedPlacement}
          entries={entries}
          onClose={() => setSelectedStickerId(null)}
          onUpdate={updateSelected}
          onMoveFront={() => commit(moveStickerToFront(placements, selectedPlacement.stickerId))}
          onAttach={attachToProof}
        />
      )}
    </section>
  );
}

function StickerBookVisual({ stickerId }: { stickerId: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const meta = getStickerById(stickerId);
  const reward = getRewardMetadata(stickerId);
  if (meta?.src && !imageFailed) {
    return <img src={meta.src} alt={reward.label} loading="lazy" draggable={false} onError={() => setImageFailed(true)} className="w-full h-full object-contain drop-shadow-[3px_4px_2px_rgba(0,0,0,0.3)]" />;
  }
  return (
    <span className="w-full h-full flex flex-col items-center justify-center bg-[#FFFDF6] border-[3px] border-on-surface rounded-2xl shadow-[4px_4px_0px_black] p-2">
      <span className="text-3xl" aria-hidden="true">{meta?.emoji || reward.fallbackEmoji || '★'}</span>
      <span className="font-mono text-[6px] sm:text-[7px] font-black uppercase leading-none mt-1 line-clamp-2">{reward.label}</span>
    </span>
  );
}

function StickerDetail({ placement, entries, onClose, onUpdate, onMoveFront, onAttach }: any) {
  const reward = getRewardMetadata(placement.stickerId);
  const nudge = (x: number, y: number) => onUpdate({ x: placement.x + x, y: placement.y + y });
  return (
    <div className="fixed inset-0 z-[140] bg-black/70 p-4 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#FFFDF6] border-4 border-on-surface shadow-[10px_10px_0px_var(--color-brand-orange)] p-5 space-y-5" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${reward.label} sticker details`}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="font-mono text-[8px] font-black uppercase text-brand-orange">Sticker detail</p><h3 className="font-display text-3xl font-black uppercase italic">{reward.label}</h3></div>
          <button type="button" onClick={onClose} className="min-w-11 min-h-11 border-2 border-on-surface bg-white flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <p className="font-serif italic text-on-surface/70">{reward.description}</p>

        <label className="block space-y-1 font-mono text-[9px] font-black uppercase">
          Move to sheet
          <select value={placement.sheetId} onChange={event => onUpdate({ sheetId: event.target.value as StickerSheetId })} className="min-h-11 w-full border-2 border-on-surface bg-white px-3">
            {STICKER_SHEETS.map(sheet => <option key={sheet.id} value={sheet.id}>{sheet.label}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-3 gap-2 max-w-48 mx-auto" aria-label="Nudge sticker position">
          <span />
          <ControlButton label="Move up" onClick={() => nudge(0, -3)}><ArrowUp /></ControlButton>
          <span />
          <ControlButton label="Move left" onClick={() => nudge(-3, 0)}><ArrowLeft /></ControlButton>
          <ControlButton label="Move down" onClick={() => nudge(0, 3)}><ArrowDown /></ControlButton>
          <ControlButton label="Move right" onClick={() => nudge(3, 0)}><ArrowRight /></ControlButton>
        </div>

        <label className="block font-mono text-[9px] font-black uppercase">
          Sticker size
          <input type="range" min="0.7" max="1.4" step="0.05" value={placement.scale} onChange={event => onUpdate({ scale: Number(event.target.value) })} className="w-full min-h-11" />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onUpdate({ rotation: placement.rotation - 5 })} className="min-h-11 border-2 border-on-surface bg-white font-mono text-[8px] font-black uppercase inline-flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Left</button>
          <button type="button" onClick={onMoveFront} className="min-h-11 border-2 border-on-surface bg-brand-lime font-mono text-[8px] font-black uppercase inline-flex items-center justify-center gap-1"><BringToFront className="w-3.5 h-3.5" /> Front</button>
          <button type="button" onClick={() => onUpdate({ rotation: placement.rotation + 5 })} className="min-h-11 border-2 border-on-surface bg-white font-mono text-[8px] font-black uppercase inline-flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" /> Right</button>
        </div>

        <label className="block space-y-1 font-mono text-[9px] font-black uppercase">
          Add to an owned proof
          <select defaultValue="" onChange={event => { if (event.target.value) void onAttach(event.target.value); event.target.value = ''; }} className="min-h-11 w-full border-2 border-on-surface bg-white px-3">
            <option value="">Choose a Logbook receipt</option>
            {entries.map((entry: any) => <option key={entry.id} value={entry.id}>{entry.tripTitle || entry.challengeTitle || entry.id}</option>)}
          </select>
        </label>
        <p className="font-mono text-[8px] uppercase text-on-surface/45">Earned stickers are eligible for zine pages. Adding one here customizes your private Logbook receipt.</p>
      </div>
    </div>
  );
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="min-w-11 min-h-11 border-2 border-on-surface bg-white flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4">{children}</button>;
}
