import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import type { FieldPageHeroTab } from './FieldPageHero';

interface FieldHeroTabsProps {
  tabs: FieldPageHeroTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  /** 'editorial' = the slim file-folder strip; 'card' = the big
   *  rounded-top tabs on the card hero. */
  variant?: 'editorial' | 'card';
  /** Dark chrome hero (tone="chrome"): tabs sit on a dark header. */
  chrome?: boolean;
  title?: string;
}

/**
 * Folder-tab strip — Field Manual chrome kit (Nov 21, 2026). One shared
 * tablist for FieldPageHero's two hero variants; the two render blocks
 * used to be copy-pasted. Behaviour is preserved exactly:
 * role=tablist/tab, aria-selected, locked tabs disabled with a lock icon.
 *
 * Nov 21, 2026: the card variant's inactive tabs were a hard-coded
 * hex colour; they now use var(--skin-surface-muted) so no hex moves
 * into a new file (P2-1), and the lock emoji is the Lock icon in both
 * variants.
 */
export function FieldHeroTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'editorial',
  chrome = false,
  title,
}: FieldHeroTabsProps) {
  if (tabs.length === 0) return null;

  if (variant === 'card') {
    return (
      <div
        className="relative z-20 mx-auto flex max-w-6xl translate-y-2 gap-1 overflow-x-auto pt-px no-scrollbar scroll-smooth"
        role="tablist"
        aria-label={title ? `${title} sections` : 'Sections'}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-disabled={tab.locked || undefined}
            onClick={() => !tab.locked && onTabChange?.(tab.id)}
            disabled={tab.locked}
            className={cn(
              'relative flex shrink-0 cursor-pointer select-none items-center gap-2 rounded-t-3xl border-x-[4px] border-t-[4px] border-[var(--skin-border)] px-5 py-4 font-display text-xl font-black uppercase italic leading-none tracking-tight transition-all sm:px-10 sm:py-6 sm:text-3xl',
              activeTab === tab.id
                ? 'z-30 bg-[var(--skin-surface)] text-[var(--skin-text)] shadow-[0_-8px_0px_var(--skin-surface),6px_0px_0px_var(--skin-border)]'
                : 'bg-[var(--skin-surface-muted)] text-[var(--skin-text-muted)] hover:bg-[var(--skin-surface)] hover:text-[var(--skin-text)]',
              tab.locked && 'cursor-not-allowed opacity-45',
            )}
          >
            {tab.label}
            {tab.locked && <Lock className="h-4 w-4" aria-hidden="true" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex gap-1 overflow-x-auto no-scrollbar"
      role="tablist"
      aria-label={title ? `${title} sections` : 'Sections'}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-disabled={tab.locked || undefined}
          onClick={() => !tab.locked && onTabChange?.(tab.id)}
          disabled={tab.locked}
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-1.5 border-2 border-b-0 px-4 py-2 font-display text-sm font-black uppercase italic tracking-normal',
            chrome ? 'border-white/30' : 'border-[var(--skin-border)]',
            tab.locked && 'cursor-not-allowed opacity-45',
            activeTab === tab.id
              ? chrome
                ? 'bg-brand-lime text-on-surface'
                : 'bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)]'
              : chrome
                ? 'bg-white/10 text-white/70'
                : 'bg-[var(--skin-surface-muted)] text-[var(--skin-text-muted)]',
          )}
        >
          {tab.label}
          {tab.locked && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
