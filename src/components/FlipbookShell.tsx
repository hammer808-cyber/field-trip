import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Grid3X3, List } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  clampFlipbookPage,
  FlipbookLayout,
  FlipbookViewMode,
  getFlipbookVisibleIndexes,
  getNextFlipbookPage,
  getPreviousFlipbookPage,
  parseFlipbookPage,
  serializeFlipbookPage,
  shouldRequestNextFlipbookBatch,
} from '../logic/flipbook';

interface FlipbookShellProps {
  ariaLabel: string;
  pages: React.ReactNode[];
  fallbackItems?: React.ReactNode[];
  pageParam?: string;
  storageKey: string;
  className?: string;
  pageClassName?: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  onRequestMore?: () => void;
  defaultView?: FlipbookViewMode;
}

const VIEW_OPTIONS: Array<{ id: FlipbookViewMode; label: string; icon: typeof BookOpen }> = [
  { id: 'flipbook', label: 'Flipbook view', icon: BookOpen },
  { id: 'grid', label: 'Grid view', icon: Grid3X3 },
  { id: 'list', label: 'List view', icon: List },
];

function readStoredView(storageKey: string, fallback: FlipbookViewMode): FlipbookViewMode {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(storageKey);
  return value === 'flipbook' || value === 'grid' || value === 'list' ? value : fallback;
}

export function FlipbookShell({
  ariaLabel,
  pages,
  fallbackItems = pages,
  pageParam = 'page',
  storageKey,
  className,
  pageClassName,
  hasMore = false,
  loadingMore = false,
  onRequestMore,
  defaultView = 'flipbook',
}: FlipbookShellProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [layout, setLayout] = useState<FlipbookLayout>('mobile');
  const [viewMode, setViewMode] = useState<FlipbookViewMode>(() => readStoredView(storageKey, defaultView));
  const [page, setPage] = useState(() => parseFlipbookPage(searchParams.get(pageParam)));
  const touchStartX = useRef<number | null>(null);
  const requestInFlight = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setLayout(media.matches ? 'desktop' : 'mobile');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setPage(current => clampFlipbookPage(current, pages.length));
  }, [pages.length]);

  useEffect(() => {
    const requestedPage = parseFlipbookPage(searchParams.get(pageParam));
    setPage(current => current === requestedPage ? current : clampFlipbookPage(requestedPage, pages.length));
  }, [pageParam, pages.length, searchParams]);

  useEffect(() => {
    if (!loadingMore) requestInFlight.current = false;
  }, [loadingMore, pages.length]);

  const updatePage = useCallback((nextPage: number) => {
    const clamped = clampFlipbookPage(nextPage, pages.length);
    setPage(clamped);
    const nextParams = new URLSearchParams(searchParams);
    if (clamped === 0) nextParams.delete(pageParam);
    else nextParams.set(pageParam, serializeFlipbookPage(clamped));
    setSearchParams(nextParams, { replace: true });
  }, [pageParam, pages.length, searchParams, setSearchParams]);

  const previous = useCallback(() => {
    updatePage(getPreviousFlipbookPage(page, pages.length, layout));
  }, [layout, page, pages.length, updatePage]);

  const next = useCallback(() => {
    const nextPage = getNextFlipbookPage(page, pages.length, layout);
    if (nextPage !== page) updatePage(nextPage);
    else if (hasMore && onRequestMore && !requestInFlight.current) {
      requestInFlight.current = true;
      onRequestMore();
    }
  }, [hasMore, layout, onRequestMore, page, pages.length, updatePage]);

  useEffect(() => {
    if (!onRequestMore || requestInFlight.current || loadingMore) return;
    if (shouldRequestNextFlipbookBatch({ page, loadedPageCount: pages.length, layout, hasMore })) {
      requestInFlight.current = true;
      onRequestMore();
    }
  }, [hasMore, layout, loadingMore, onRequestMore, page, pages.length]);

  const visibleIndexes = useMemo(
    () => getFlipbookVisibleIndexes(page, pages.length, layout),
    [layout, page, pages.length],
  );
  const canGoBack = page > 0;
  const canGoForward = page < pages.length - 1 || hasMore;

  const changeView = (nextView: FlipbookViewMode) => {
    setViewMode(nextView);
    window.localStorage.setItem(storageKey, nextView);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (viewMode !== 'flipbook') return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    }
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) previous();
    else next();
  };

  return (
    <section className={cn('space-y-4', className)} aria-label={ariaLabel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex min-h-11 border-2 border-on-surface bg-white shadow-[3px_3px_0px_black]" role="group" aria-label="Choose journal view">
          {VIEW_OPTIONS.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                aria-label={option.label}
                aria-pressed={viewMode === option.id}
                title={option.label}
                onClick={() => changeView(option.id)}
                className={cn(
                  'w-11 h-11 inline-flex items-center justify-center border-r-2 last:border-r-0 border-on-surface focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan',
                  viewMode === option.id ? 'bg-brand-lime text-on-surface' : 'bg-white text-on-surface/55 hover:text-on-surface',
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        {viewMode === 'flipbook' && pages.length > 0 && (
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/55" aria-live="polite">
            Page {page + 1}{layout === 'desktop' && visibleIndexes.length > 1 ? `-${visibleIndexes[visibleIndexes.length - 1] + 1}` : ''} of {pages.length}
          </p>
        )}
      </div>

      {viewMode === 'flipbook' ? (
        <div
          className="relative outline-none focus-visible:ring-4 focus-visible:ring-brand-cyan"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-roledescription="flipbook"
        >
          <div className="absolute left-1/2 top-3 bottom-3 w-px bg-on-surface/15 z-20 hidden md:block pointer-events-none" aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${layout}-${page}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18 }}
              transition={{ duration: reduceMotion ? 0.08 : 0.22 }}
              className={cn('grid grid-cols-1 md:grid-cols-2 bg-[#E8E1D2] border-4 border-on-surface shadow-[10px_10px_0px_black] overflow-hidden', pageClassName)}
            >
              {visibleIndexes.map(index => (
                <article
                  key={index}
                  className="relative min-h-[34rem] md:min-h-[38rem] bg-[#FFFDF6] p-4 sm:p-6 overflow-hidden border-b-2 last:border-b-0 md:border-b-0 md:border-r-2 md:last:border-r-0 border-on-surface/15"
                  aria-label={`Page ${index + 1}`}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(rgba(0,0,0,0.08)_0.7px,transparent_0.7px)] bg-[size:8px_8px]" />
                  <div className="relative z-10 h-full">{pages[index]}</div>
                  <span className="absolute bottom-2 right-3 font-mono text-[8px] font-black text-on-surface/30">{index + 1}</span>
                </article>
              ))}
              {layout === 'desktop' && visibleIndexes.length === 1 && (
                <div className="hidden md:block min-h-[38rem] bg-[#F2EDDF]" aria-hidden="true" />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-4 pt-5">
            <button
              type="button"
              onClick={previous}
              disabled={!canGoBack}
              className="min-w-11 min-h-11 px-4 inline-flex items-center justify-center gap-2 bg-white border-2 border-on-surface shadow-[3px_3px_0px_black] disabled:opacity-30 disabled:shadow-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only font-mono text-[9px] font-black uppercase">Previous</span>
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canGoForward || loadingMore}
              className="min-w-11 min-h-11 px-4 inline-flex items-center justify-center gap-2 bg-on-surface text-white border-2 border-on-surface shadow-[3px_3px_0px_var(--color-brand-orange)] disabled:opacity-30 disabled:shadow-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand-cyan"
            >
              <span className="sr-only sm:not-sr-only font-mono text-[9px] font-black uppercase">{loadingMore ? 'Loading' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5' : 'flex flex-col gap-4',
        )}>
          {fallbackItems}
          {hasMore && onRequestMore && (
            <button
              type="button"
              onClick={onRequestMore}
              disabled={loadingMore}
              className="min-h-11 px-5 bg-white border-2 border-on-surface shadow-[3px_3px_0px_black] font-mono text-[10px] font-black uppercase disabled:opacity-40 sm:col-span-2 xl:col-span-3"
            >
              {loadingMore ? 'Loading more receipts' : 'Load more receipts'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
