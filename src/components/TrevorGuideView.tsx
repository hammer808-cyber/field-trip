import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronDown, ChevronUp, EyeOff } from 'lucide-react';
import type { ResolvedTrevorAction } from '../config/trevorActions';
import { cn } from '../lib/utils';
import type { ResolvedTrevorRecommendation } from '../services/trevorRecommendationEngine';

export interface TrevorPanelState {
  isExpanded: boolean;
  isSuppressed: boolean;
}

export type TrevorPanelEvent = 'open' | 'collapse' | 'suppress';

export function reduceTrevorPanelState(
  state: TrevorPanelState,
  event: TrevorPanelEvent,
): TrevorPanelState {
  if (event === 'open') return state.isSuppressed ? state : { ...state, isExpanded: true };
  if (event === 'collapse') return { ...state, isExpanded: false };
  return { isExpanded: false, isSuppressed: true };
}

interface TrevorGuideViewProps {
  recommendation: ResolvedTrevorRecommendation;
  message: string;
  isExpanded: boolean;
  hasNewState: boolean;
  onOpen: () => void;
  onCollapse: () => void;
  onAction: (action: ResolvedTrevorAction) => void;
  onSuppress: () => void;
}

export function TrevorGuideView({
  recommendation,
  message,
  isExpanded,
  hasNewState,
  onOpen,
  onCollapse,
  onAction,
  onSuppress,
}: TrevorGuideViewProps) {
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const isWarning = recommendation.tone === 'warning';

  useEffect(() => {
    if (isExpanded) primaryActionRef.current?.focus();
  }, [isExpanded]);

  return (
    <div
      data-testid="trevor-guide-root"
      className="pointer-events-none fixed bottom-[calc(100px+env(safe-area-inset-bottom,0px))] left-1/2 z-[105] w-full max-w-sm -translate-x-1/2 px-4"
    >
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.section
            key="trevor-panel"
            id="trevor-guide-panel"
            role="dialog"
            aria-label="Trevor field guide"
            aria-live="polite"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'skin-card pointer-events-auto relative overflow-hidden rounded-[2rem] border-4 border-on-surface bg-white p-5 shadow-[8px_8px_0px_black] motion-reduce:transition-none',
              isWarning && 'border-brand-orange shadow-[8px_8px_0px_var(--color-brand-orange)]',
            )}
          >
            <div className="mb-4 flex items-center gap-3">
              <TrevorAvatar size="large" />
              <div className="min-w-0">
                <p className="font-display text-[10px] font-black uppercase leading-none tracking-normal text-on-surface/45">
                  Field Guide Assist
                </p>
                <p className={cn(
                  'font-display text-sm font-black uppercase italic leading-none tracking-normal',
                  isWarning ? 'text-brand-orange' : 'text-brand-cyan',
                )}>
                  Trevor // Counselor
                </p>
              </div>
              <button
                type="button"
                onClick={onCollapse}
                aria-label="Collapse Trevor guide"
                className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-full text-on-surface/45 hover:bg-on-surface/5 hover:text-on-surface focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
              >
                <ChevronDown aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="mb-5 rounded-2xl border-2 border-dashed border-on-surface/15 bg-neutral-50 p-4">
              <p className="font-serif text-sm italic leading-relaxed text-on-surface">“{message}”</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                ref={primaryActionRef}
                type="button"
                onClick={() => onAction(recommendation.primaryAction)}
                className={cn(
                  'skin-button flex min-h-12 w-full items-center justify-center gap-2 border-2 border-on-surface bg-brand-lime px-4 py-3 font-display text-xs font-black uppercase italic tracking-normal text-on-surface shadow-[4px_4px_0px_black] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan',
                  isWarning && 'bg-brand-orange text-white',
                )}
              >
                {recommendation.primaryAction.label}
                <ArrowRight aria-hidden="true" size={14} className="stroke-[3]" />
              </button>

              {recommendation.secondaryAction && (
                <button
                  type="button"
                  onClick={() => {
                    if (recommendation.secondaryAction) onAction(recommendation.secondaryAction);
                  }}
                  className="min-h-11 w-full border-2 border-transparent px-4 py-2.5 font-mono text-[9px] font-black uppercase tracking-widest text-on-surface/65 transition-colors hover:border-on-surface/15 hover:text-on-surface focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                >
                  {recommendation.secondaryAction.label}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onSuppress}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 font-mono text-[9px] font-bold uppercase tracking-widest text-on-surface/40 hover:text-on-surface focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
            >
              <EyeOff aria-hidden="true" size={14} />
              Hide for this session
            </button>
          </motion.section>
        ) : (
          <motion.div
            key="trevor-launcher"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="flex justify-center motion-reduce:transition-none"
          >
            <button
              type="button"
              onClick={onOpen}
              aria-label="Open Trevor guide"
              aria-expanded="false"
              aria-controls="trevor-guide-panel"
              className={cn(
                'skin-button pointer-events-auto group relative flex min-h-12 items-center gap-3 rounded-full border-[3px] border-on-surface bg-white py-1.5 pl-2 pr-4 shadow-[4px_4px_0px_black] transition-all hover:shadow-[6px_6px_0px_black] active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan',
                isWarning && 'border-brand-orange shadow-[4px_4px_0px_var(--color-brand-orange)]',
              )}
            >
              {hasNewState && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-on-surface bg-brand-cyan motion-safe:animate-ping"
                />
              )}
              <TrevorAvatar size="small" />
              <span className="max-w-[190px] truncate font-display text-[10px] font-black uppercase italic leading-none tracking-normal text-on-surface">
                {recommendation.primaryAction.label}
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-on-surface/5">
                <ChevronUp aria-hidden="true" size={14} className="text-on-surface/45 group-hover:text-on-surface" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrevorAvatar({ size }: { size: 'small' | 'large' }) {
  return (
    <span className={cn(
      'shrink-0 overflow-hidden rounded-full border-2 border-on-surface bg-brand-cyan',
      size === 'large' ? 'h-10 w-10' : 'h-8 w-8',
    )}>
      <img
        referrerPolicy="no-referrer"
        src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Trevor&backgroundColor=b6e3f4"
        alt=""
        className="h-full w-full object-cover"
      />
    </span>
  );
}
