import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileCheck2, Send, Sparkles, Users, Vote, X, Zap } from 'lucide-react';
import type { BasecampNotificationItem, BasecampNotificationKind } from '../../logic/basecampViewModel';
import { cn } from '../../lib/utils';
import { notificationTileColors } from './BasecampNotifications';

interface NotificationDetailModalProps {
  item: BasecampNotificationItem | null;
  onClose: () => void;
  onTakeMeThere: (item: BasecampNotificationItem) => void;
}

const notificationIcons: Record<BasecampNotificationKind, typeof FileCheck2> = {
  decision: FileCheck2,
  sticker: Sparkles,
  submission: Send,
  power_hour: Zap,
  crew: Users,
  voting: Vote,
};

const notificationKindLabels: Record<BasecampNotificationKind, string> = {
  decision: 'Proof decision',
  sticker: 'Sticker unlocked',
  submission: 'Proof submitted',
  power_hour: 'Power Hour',
  crew: 'Crew',
  voting: 'Weekly voting',
};

/**
 * Notification detail card (Nov 20, 2026, Zach's call): tapping a
 * notification opens it big instead of jumping straight to the
 * destination — the row only shows two clamped lines, so some
 * notifications never really showed anything. The card shows the full
 * detail, the sticker art for awards, and a "Take me there" button that
 * goes where the notification points. Follows the StickerDetailModal
 * pattern (portal, Escape + backdrop to close, body scroll lock).
 */
export function NotificationDetailModal({ item, onClose, onTakeMeThere }: NotificationDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, item]);

  if (!item) return null;

  const Icon = notificationIcons[item.kind];

  const dialog = (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={event => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-detail-title"
        className="skin-modal relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-2 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-lg sm:p-6"
        style={{
          background: 'var(--skin-surface)',
          borderColor: 'var(--skin-border)',
          color: 'var(--skin-text)',
          boxShadow: 'var(--skin-modal-shadow, 8px 8px 0 var(--skin-border))'
        }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] text-[var(--skin-text)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]"
        >
          <X size={17} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <span className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--skin-border)]',
            notificationTileColors[item.kind],
          )}>
            <Icon size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-xs font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">
              {notificationKindLabels[item.kind]}
            </span>
            <time className="mt-0.5 block font-mono text-xs font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
              {item.timeLabel}
            </time>
          </span>
          {item.unread && (
            <span className="ml-auto shrink-0 rounded-full bg-error px-2 py-0.5 font-mono text-xs font-black uppercase tracking-widest text-white">
              New
            </span>
          )}
        </div>

        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="mx-auto mt-5 max-h-56 w-auto object-contain"
          />
        ) : null}

        <h2 id="notification-detail-title" className="mt-4 font-display text-2xl font-black uppercase italic leading-tight tracking-normal text-[var(--skin-text)]">
          {item.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--skin-text)]">
          {item.detail}
        </p>

        <button
          type="button"
          onClick={() => onTakeMeThere(item)}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-[3px] border-on-surface bg-brand-lime font-display text-sm font-black uppercase italic tracking-normal text-on-surface shadow-[4px_4px_0px_black] transition-all hover:shadow-[6px_6px_0px_black] active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
        >
          Take me there
        </button>
      </section>
    </div>
  );

  // Static render (tests): no document, no portal — return the dialog.
  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}
