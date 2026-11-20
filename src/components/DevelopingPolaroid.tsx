import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FastForward, RefreshCw, Sticker, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  clampPolaroidPlacement,
  DEFAULT_POLAROID_STICKER_PLACEMENT,
  resolvePolaroidSticker,
  type PolaroidStickerPlacement,
} from '../logic/polaroidSticker';
import { cn } from '../lib/utils';
import {
  getPolaroidImageFilter,
  POLAROID_STAGE_TIMINGS,
  PolaroidDevelopmentStage,
} from '../logic/polaroidDevelopment';

interface DevelopingPolaroidProps {
  imageUrl: string;
  missionTitle: string;
  onAccept: () => void;
  onRetake: () => void;
  availableStickerIds?: string[];
  selectedStickerId?: string;
  onStickerSelect?: (stickerId: string | undefined) => void;
  stickerPlacement?: PolaroidStickerPlacement;
  onStickerPlacementChange?: (placement: PolaroidStickerPlacement) => void;
  onStageChange?: (stage: PolaroidDevelopmentStage) => void;
}

const STAGE_LABELS: Record<PolaroidDevelopmentStage, string> = {
  captured: 'Receipt captured',
  ejecting: 'Ejecting print',
  developing_early: 'Image forming',
  developing_mid: 'Color settling',
  developed: 'Receipt ready',
};

export function DevelopingPolaroid({
  imageUrl,
  missionTitle,
  onAccept,
  onRetake,
  availableStickerIds = [],
  selectedStickerId,
  onStickerSelect,
  stickerPlacement,
  onStickerPlacementChange,
  onStageChange,
}: DevelopingPolaroidProps) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<PolaroidDevelopmentStage>('captured');
  const [stickerTrayOpen, setStickerTrayOpen] = useState(false);
  const skippedRef = useRef(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const selectedSticker = selectedStickerId ? resolvePolaroidSticker(selectedStickerId) : undefined;
  // Where the sticker sits, as percentages of the displayed square. A fresh
  // pick starts top-right, where the old fixed sticker lived.
  const placement = stickerPlacement ?? DEFAULT_POLAROID_STICKER_PLACEMENT;

  useEffect(() => {
    skippedRef.current = false;
    setStage('captured');
    setStickerTrayOpen(false);
    const transition = (next: PolaroidDevelopmentStage) => {
      if (!skippedRef.current) setStage(next);
    };
    if (reduceMotion) {
      const timer = window.setTimeout(() => transition('developed'), 180);
      return () => window.clearTimeout(timer);
    }
    const timers = [
      window.setTimeout(() => transition('ejecting'), POLAROID_STAGE_TIMINGS.ejecting),
      window.setTimeout(() => transition('developing_early'), POLAROID_STAGE_TIMINGS.developing_early),
      window.setTimeout(() => transition('developing_mid'), POLAROID_STAGE_TIMINGS.developing_mid),
      window.setTimeout(() => transition('developed'), POLAROID_STAGE_TIMINGS.developed),
    ];
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [imageUrl, reduceMotion]);

  useEffect(() => {
    onStageChange?.(stage);
  }, [onStageChange, stage]);

  // The tray shows every awarded sticker, resolved through the canonical
  // 52-registry first so real art renders (the old legacy-only lookup showed
  // a generic star for every earned sticker). Ids with no art anywhere are
  // skipped. No cap: the tray scrolls.
  const stickerOptions = useMemo(() => {
    const seen = new Set<string>();
    return availableStickerIds.flatMap(id => {
      if (seen.has(id)) return [];
      seen.add(id);
      const resolved = resolvePolaroidSticker(id);
      return resolved ? [{ id, resolved }] : [];
    });
  }, [availableStickerIds]);

  const skip = () => {
    skippedRef.current = true;
    setStage('developed');
  };

  // Drag the placed sticker around the photo, measured against the image
  // container's own bounds (same pattern as StickerBook). Pointer capture
  // keeps the drag alive even if the finger drifts off the sticker.
  const handleStickerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onStickerPlacementChange || !imageContainerRef.current) return;
    event.stopPropagation();
    const bounds = imageContainerRef.current.getBoundingClientRect();
    dragRef.current = {
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

  const handleStickerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !onStickerPlacementChange) return;
    const deltaX = ((event.clientX - drag.startClientX) / Math.max(1, drag.width)) * 100;
    const deltaY = ((event.clientY - drag.startClientY) / Math.max(1, drag.height)) * 100;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 1) drag.moved = true;
    onStickerPlacementChange(clampPolaroidPlacement({
      x: drag.startX + deltaX,
      y: drag.startY + deltaY,
    }));
  };

  const handleStickerPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer already released; nothing to do.
    }
  };

  // Tap the photo to move the sticker there (the fallback for drag).
  const handlePhotoPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedStickerId || !onStickerPlacementChange || !imageContainerRef.current) return;
    if ((event.target as HTMLElement).tagName !== 'IMG') return;
    const bounds = imageContainerRef.current.getBoundingClientRect();
    onStickerPlacementChange(clampPolaroidPlacement({
      x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 100,
      y: ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 100,
    }));
  };

  const isDeveloped = stage === 'developed';
  const frameY = stage === 'captured' ? '65%' : '0%';
  const chemicalOpacity = stage === 'captured' || stage === 'ejecting'
    ? 0.9
    : stage === 'developing_early'
      ? 0.58
      : stage === 'developing_mid'
        ? 0.2
        : 0;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-[34rem] overflow-hidden bg-[#141615] border-4 border-on-surface rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center gap-4"
      aria-label="Develop captured receipt"
    >
      {!isDeveloped && (
        <button
          type="button"
          onClick={skip}
          className="absolute top-3 right-3 z-30 min-w-11 min-h-11 px-3 inline-flex items-center justify-center gap-2 bg-white text-on-surface border-2 border-on-surface shadow-[3px_3px_0px_var(--color-brand-orange)] font-mono text-xs font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan"
        >
          <FastForward className="w-4 h-4" /> Skip
        </button>
      )}

      <motion.div
        animate={{ y: frameY, rotate: isDeveloped ? -1 : 0, scale: isDeveloped ? 1 : 0.96 }}
        transition={reduceMotion ? { duration: 0.08 } : { type: 'spring', stiffness: 115, damping: 18 }}
        className="relative w-full max-w-[19rem] bg-[#FFFDF6] p-3 pb-16 border border-black/10 shadow-[0_22px_55px_rgba(0,0,0,0.55)]"
      >
        <div
          ref={imageContainerRef}
          onPointerDown={handlePhotoPointerDown}
          className="relative aspect-square overflow-hidden bg-black"
        >
          <img
            src={imageUrl}
            alt={`Captured proof for ${missionTitle}`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: getPolaroidImageFilter(stage),
              transition: reduceMotion ? 'opacity 80ms linear' : 'filter 700ms ease, opacity 300ms ease',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.95),transparent_33%),radial-gradient(circle_at_75%_68%,rgba(255,238,204,0.8),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.62),rgba(255,217,173,0.22))]"
            style={{ opacity: chemicalOpacity, transition: reduceMotion ? 'opacity 80ms linear' : 'opacity 700ms ease' }}
            aria-hidden="true"
          />
          {selectedSticker && isDeveloped && (
            <div
              className="absolute z-20 cursor-grab active:cursor-grabbing"
              style={{
                left: `${placement.x}%`,
                top: `${placement.y}%`,
                transform: 'translate(-50%, -50%) rotate(6deg)',
                touchAction: 'none',
              }}
              onPointerDown={handleStickerPointerDown}
              onPointerMove={handleStickerPointerMove}
              onPointerUp={handleStickerPointerUp}
              onPointerCancel={handleStickerPointerUp}
            >
              {selectedSticker.kind === 'image' ? (
                <img
                  src={selectedSticker.imageUrl}
                  alt={selectedSticker.name}
                  className="w-20 h-20 object-contain drop-shadow-[2px_2px_0px_rgba(0,0,0,0.55)]"
                  draggable={false}
                />
              ) : (
                <div className="bg-white border-2 border-on-surface shadow-[3px_3px_0px_black] p-2 max-w-24 text-center">
                  <span className="block text-2xl" aria-hidden="true">{selectedSticker.emoji}</span>
                  <span className="block font-mono text-xs font-black uppercase leading-none mt-1">{selectedSticker.name}</span>
                </div>
              )}
              <button
                type="button"
                aria-label={`Remove ${selectedSticker.name} sticker`}
                onPointerDown={event => event.stopPropagation()}
                onClick={event => {
                  event.stopPropagation();
                  onStickerSelect?.(undefined);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-on-surface text-white border border-white/40 flex items-center justify-center shadow-[2px_2px_0px_black] focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="absolute left-4 right-4 bottom-4 text-center">
          <p className="font-display text-lg font-black uppercase italic leading-none line-clamp-2">{missionTitle}</p>
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-on-surface/60 mt-2" aria-live="polite">{STAGE_LABELS[stage]}</p>
        </div>
      </motion.div>

      {isDeveloped && (
        <div className="w-full max-w-sm space-y-3">
          {stickerTrayOpen && stickerOptions.length > 0 && (
            <div className="grid grid-cols-4 gap-2 bg-white/10 border border-white/20 p-2 max-h-40 overflow-y-auto" aria-label="Choose a sticker">
              {stickerOptions.map(({ id, resolved }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onStickerSelect?.(selectedStickerId === id ? undefined : id)}
                  aria-pressed={selectedStickerId === id}
                  title={resolved.name}
                  className={cn(
                    'min-h-12 border-2 flex items-center justify-center focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan',
                    selectedStickerId === id ? 'bg-brand-lime border-white' : 'bg-white border-on-surface',
                  )}
                >
                  {resolved.kind === 'image' ? (
                    <img src={resolved.imageUrl} alt={resolved.name} className="w-9 h-9 object-contain" draggable={false} />
                  ) : (
                    <span aria-hidden="true" className="text-xl">{resolved.emoji}</span>
                  )}
                  <span className="sr-only">{resolved.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onRetake}
              className="min-h-12 bg-white text-on-surface border-2 border-on-surface shadow-[3px_3px_0px_black] inline-flex items-center justify-center gap-2 font-mono text-xs font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan"
            >
              <RefreshCw className="w-4 h-4" /> Retake
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="min-h-12 bg-brand-lime text-on-surface border-2 border-on-surface shadow-[3px_3px_0px_var(--color-brand-orange)] inline-flex items-center justify-center gap-2 font-mono text-xs font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan"
            >
              <Check className="w-4 h-4" /> Use This Receipt
            </button>
          </div>
          {stickerOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setStickerTrayOpen(open => !open)}
              className="min-h-11 w-full bg-transparent text-white border border-white/35 inline-flex items-center justify-center gap-2 font-mono text-xs font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan"
            >
              <Sticker className="w-4 h-4" /> {selectedStickerId ? 'Change sticker' : 'Add a sticker'}
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
}
