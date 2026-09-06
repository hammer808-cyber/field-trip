import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Archive, Camera, ClipboardList, Lock, MapPin, Shuffle, Stamp, Ticket } from 'lucide-react';
import { cn } from '../lib/utils';
import { fieldtripMotion } from '../lib/motionConfig';

export type FieldtripLoaderVariant =
  | 'general'
  | 'checkin'
  | 'community'
  | 'deck'
  | 'proof'
  | 'review'
  | 'voting'
  | 'memories';

interface FieldtripLoaderProps {
  variant?: FieldtripLoaderVariant;
  label?: string;
  subLabel?: string;
  compact?: boolean;
  fullScreen?: boolean;
  showProgress?: boolean;
  estimatedStep?: string;
  reducedMotionFallback?: string;
  className?: string;
}

const LOADING_COPY: Record<FieldtripLoaderVariant, string[]> = {
  general: [
    'Gathering receipts...',
    'Checking the field notes...',
    'Packing the evidence bag...',
    'One moment. The lore is loading.',
  ],
  checkin: [
    'Gathering your gear...',
    'Checking credentials...',
    "Opening today's dispatches...",
  ],
  community: [
    'Opening the field archive...',
    'Collecting community sightings...',
    'Dusting off the latest receipts...',
  ],
  deck: [
    'Shuffling the field deck...',
    'Finding your next questionable assignment...',
    'Pulling a card from the archives...',
  ],
  proof: [
    'Packing your receipt...',
    'Sending it to the archive...',
    'Making sure the receipt is readable...',
  ],
  review: [
    'Trevor is squinting at the evidence...',
    'Running the highly scientific vibe check...',
    'Administrative nonsense is underway...',
  ],
  voting: [
    "Opening this week's field awards...",
    'Sorting the glory...',
    'Gathering the nominees...',
  ],
  memories: [
    'Building your season archive...',
    'Collecting the parts that mattered...',
    'Making a zine out of all that chaos...',
  ],
};

const VARIANT_LABELS: Record<FieldtripLoaderVariant, string> = {
  general: 'Fieldtrip Loading',
  checkin: 'Fieldtrip Check-In',
  community: 'Field Archive',
  deck: 'Deck Shuffle',
  proof: 'Proof Upload',
  review: 'Under Review',
  voting: 'Ballot Box',
  memories: 'Memory Assembly',
};

function variantIcon(variant: FieldtripLoaderVariant) {
  if (variant === 'deck') return Shuffle;
  if (variant === 'proof') return Camera;
  if (variant === 'review') return ClipboardList;
  if (variant === 'voting') return Ticket;
  if (variant === 'memories') return Archive;
  if (variant === 'community') return MapPin;
  return Stamp;
}

export function useLoadingCopyRotator(variant: FieldtripLoaderVariant, override?: string) {
  const reduceMotion = useReducedMotion();
  const copy = LOADING_COPY[variant] || LOADING_COPY.general;
  const [index, setIndex] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEnabled(true), 1500);
    return () => window.clearTimeout(timer);
  }, [variant]);

  useEffect(() => {
    if (!enabled || reduceMotion || override) return;
    const interval = window.setInterval(() => {
      setIndex(prev => (prev + 1) % copy.length);
    }, 2400);
    return () => window.clearInterval(interval);
  }, [copy.length, enabled, override, reduceMotion]);

  return override || copy[index] || copy[0];
}

export function FieldtripLoader({
  variant = 'general',
  label,
  subLabel,
  compact = false,
  fullScreen = false,
  showProgress = false,
  estimatedStep,
  reducedMotionFallback,
  className,
}: FieldtripLoaderProps) {
  const reduceMotion = useReducedMotion();
  const Icon = useMemo(() => variantIcon(variant), [variant]);
  const loadingCopy = useLoadingCopyRotator(variant, subLabel);
  const title = label || VARIANT_LABELS[variant] || VARIANT_LABELS.general;

  const body = (
    <div
      className={cn(
        'skin-card skin-loading-state relative overflow-hidden border-4 border-on-surface bg-[#fff8e8] text-on-surface shadow-[8px_8px_0px_black]',
        compact ? 'p-4 rounded-2xl' : 'p-8 rounded-[2rem]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`${title}: ${loadingCopy}`}
    >
      <div className="absolute inset-0 opacity-45 bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        <div className="relative h-20 w-20">
          <motion.div
            animate={reduceMotion ? {} : { y: [0, -5, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: fieldtripMotion.easeOut }}
            className="absolute inset-2 flex items-center justify-center border-4 border-on-surface bg-brand-lime shadow-[5px_5px_0px_black] -rotate-3"
          >
            <Icon className="h-9 w-9" />
          </motion.div>
          <motion.div
            animate={reduceMotion ? {} : { x: [-14, 18, -14] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-0 left-3 h-3 w-14 bg-brand-orange border-2 border-on-surface"
          />
        </div>
        <div>
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-brand-orange">
            {estimatedStep || 'FIELD SYSTEM ACTIVE'}
          </p>
          <h2 className="mt-1 font-display text-3xl font-black italic uppercase leading-none">
            {title}
          </h2>
          <p className="mt-3 font-serif italic text-sm text-on-surface/65">
            {reduceMotion && reducedMotionFallback ? reducedMotionFallback : loadingCopy}
          </p>
        </div>
        {showProgress && (
          <div className="skin-progress h-3 w-full max-w-xs overflow-hidden border-2 border-on-surface bg-white shadow-[2px_2px_0px_black]">
            <motion.div
              className="h-full w-1/2 bg-brand-cyan"
              animate={reduceMotion ? {} : { x: ['-100%', '220%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (!fullScreen) return body;
  return (
    <div className="skin-page min-h-screen flex items-center justify-center bg-paper p-6 ft-paper-texture">
      {body}
    </div>
  );
}

export function EmptyStatePanel({
  title,
  body,
  hint,
  action,
  icon,
  className,
}: {
  title: string;
  body: string;
  hint?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('skin-card skin-state-panel skin-empty-state border-4 border-dashed border-on-surface/20 bg-white/80 p-8 text-center shadow-[6px_6px_0px_rgba(0,0,0,0.12)] rounded-[2rem]', className)}>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-on-surface bg-brand-yellow shadow-[4px_4px_0px_black]">
        {icon || <Archive className="h-8 w-8" />}
      </div>
      <h3 className="font-display text-3xl font-black italic uppercase leading-none">{title}</h3>
      <p className="mx-auto mt-3 max-w-md font-sans text-sm font-bold text-on-surface/80">{body}</p>
      {hint && <p className="mx-auto mt-2 max-w-md font-serif italic text-sm text-on-surface/55">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LockedStatePanel({
  title,
  body,
  hint,
  progressLabel,
  progressValue,
  action,
  icon,
  className,
}: {
  title: string;
  body: string;
  hint?: string;
  progressLabel?: string;
  progressValue?: number;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, progressValue ?? 0));
  return (
    <div className={cn('skin-card skin-state-panel skin-locked-state border-4 border-on-surface bg-white p-8 text-center shadow-[8px_8px_0px_black] rounded-[2rem]', className)}>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-on-surface bg-brand-magenta text-white shadow-[4px_4px_0px_black]">
        {icon || <Lock className="h-8 w-8" aria-hidden="true" />}
      </div>
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-on-surface/45">Locked</p>
      <h3 className="mt-2 font-display text-3xl font-black italic uppercase leading-none">{title}</h3>
      <p className="mx-auto mt-3 max-w-md font-sans text-sm font-bold text-on-surface/80">{body}</p>
      {hint && <p className="mx-auto mt-2 max-w-md font-serif italic text-sm text-on-surface/55">{hint}</p>}
      {progressLabel && (
        <div className="mx-auto mt-5 w-full max-w-xs space-y-2">
          <div className="h-5 overflow-hidden rounded-full border-2 border-on-surface bg-white shadow-[3px_3px_0px_black]">
            <div className="h-full bg-brand-lime" style={{ width: `${pct}%` }} />
          </div>
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/55">{progressLabel}</p>
        </div>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorStatePanel({
  title = 'Something went wrong',
  body = 'Fieldtrip hit a snag. Your progress is still here. Try again.',
  details,
  detailsId,
  onRetry,
  retryLabel = 'Try again',
  secondaryAction,
  className,
}: {
  title?: string;
  body?: string;
  details?: string;
  detailsId?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('skin-card skin-state-panel skin-error-state w-full max-w-xl border-4 border-on-surface bg-white p-6 shadow-[8px_8px_0px_black] sm:p-8', className)}>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-4 border-on-surface bg-brand-orange text-white shadow-[4px_4px_0px_black]">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-center font-display text-3xl font-black uppercase italic leading-none">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-center font-sans text-sm font-bold text-on-surface/80">{body}</p>
      {details && (
        <details className="mt-4 border-2 border-on-surface/10 bg-on-surface/5 p-3">
          <summary className="cursor-pointer font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/45">Technical details</summary>
          <pre id={detailsId} className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-on-surface/70">{details}</pre>
        </details>
      )}
      <div className={cn('mt-6 grid gap-3', secondaryAction ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="skin-button min-h-12 border-4 border-on-surface bg-brand-lime px-4 py-3 font-display text-lg font-black uppercase italic shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none"
          >
            {retryLabel}
          </button>
        )}
        {secondaryAction}
      </div>
    </div>
  );
}

export function SkeletonProofCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('skin-card skin-loading-state border-4 border-on-surface bg-white p-4 shadow-[6px_6px_0px_black]', compact && 'p-3')}>
      <div className="aspect-[4/3] bg-on-surface/10 border-2 border-on-surface/10 animate-pulse" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-1/2 bg-on-surface/10 animate-pulse" />
        <div className="h-3 w-4/5 bg-on-surface/10 animate-pulse" />
        <div className="flex gap-2 pt-2">
          <div className="h-7 w-16 bg-brand-lime/30 border border-on-surface/10 animate-pulse" />
          <div className="h-7 w-20 bg-brand-cyan/30 border border-on-surface/10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
