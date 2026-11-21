import { useState } from 'react';
import { FileCheck2, Send, Sparkles, Users, Zap } from 'lucide-react';
import type { BasecampNotificationItem, BasecampNotificationKind } from '../../logic/basecampViewModel';
import { cn } from '../../lib/utils';

interface BasecampNotificationsProps {
  items: readonly BasecampNotificationItem[];
  onOpen: (item: BasecampNotificationItem) => void;
}

const notificationIcons: Record<BasecampNotificationKind, typeof FileCheck2> = {
  decision: FileCheck2,
  sticker: Sparkles,
  submission: Send,
  power_hour: Zap,
  crew: Users,
};

/**
 * One color per kind (Nov 20, 2026, Zach's call — each notification type
 * should look different at a glance). Existing brand tokens, so the kind
 * reads the same in every skin; the font stays the same and color + icon
 * carry the difference.
 */
export const notificationTileColors: Record<BasecampNotificationKind, string> = {
  decision: 'bg-brand-cyan text-on-surface',
  sticker: 'bg-brand-lime text-on-surface',
  submission: 'bg-brand-orange text-on-surface',
  power_hour: 'bg-heat-yellow text-on-surface',
  crew: 'bg-brand-purple text-white',
};

/** How many rows show before the Show more button (Nov 20, 2026, Zach's
 * call: six or seven at a time). The subscription fetches up to 50. */
export const NOTIFICATIONS_VISIBLE_BATCH = 7;

/**
 * Notifications (Nov 17, 2026): the full notification list, newest-first,
 * no 5-item cap — the single home for every notification (decisions,
 * submissions, sticker awards, Power Hour); the Updates section was
 * removed Nov 18, 2026. Tapping a row opens the detail card (see
 * NotificationDetailModal) instead of navigating straight to the
 * destination — the card carries the "Take me there" button. Unread rows
 * carry a red dot (Nov 20, 2026, Zach's call: the app's error red);
 * opening the card marks the notification read via the server,
 * so the dot clears once the player has seen it.
 *
 * The list shows 7 rows at a time (Nov 20, 2026, Zach's call) with a
 * Show more button revealing the next 7, up to the 50 the subscription
 * fetches — the reveal is client-side, the subscription stays live.
 */
export function BasecampNotifications({ items, onOpen }: BasecampNotificationsProps) {
  const [visibleCount, setVisibleCount] = useState(NOTIFICATIONS_VISIBLE_BATCH);
  const visibleItems = items.slice(0, visibleCount);
  const remaining = items.length - visibleItems.length;

  return (
    <section
      aria-labelledby="basecamp-notifications-heading"
      className="skin-card border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] p-5 shadow-[var(--skin-card-shadow)] sm:p-6"
    >
      <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Field notices</p>
      <h2 id="basecamp-notifications-heading" className="mt-1 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">
        Notifications
      </h2>

      {items.length === 0 ? (
        <div className="mt-5 border-t-2 border-[var(--skin-border)] pt-4">
          <p className="text-sm font-bold text-[var(--skin-text)]">No notifications yet.</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--skin-text-muted)]">
            Proof submissions and decisions, sticker awards, and Power Hour notices will show up here — tap one to open it.
          </p>
        </div>
      ) : (
        <>
          <ol className="mt-5 divide-y-2 divide-[var(--skin-border-muted)] border-y-2 border-[var(--skin-border)]">
            {visibleItems.map(item => {
              const Icon = notificationIcons[item.kind];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-start gap-3 py-3 text-left transition-colors hover:bg-[var(--skin-surface-muted)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]"
                    aria-label={`${item.title}: ${item.detail}`}
                  >
                    <span className={cn(
                      'relative flex h-9 w-9 items-center justify-center border-2 border-[var(--skin-border)]',
                      notificationTileColors[item.kind],
                    )}>
                      <Icon size={17} aria-hidden="true" />
                      {item.unread && (
                        <span
                          className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[var(--skin-surface)] bg-error"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={cn(
                        'block text-xs uppercase leading-tight text-[var(--skin-text)]',
                        item.unread ? 'font-black' : 'font-bold',
                      )}>
                        {item.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-[var(--skin-text-muted)]">{item.detail}</span>
                    </span>
                    <time className="pt-1 font-mono text-xs font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
                      {item.timeLabel}
                    </time>
                  </button>
                </li>
              );
            })}
          </ol>
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount(count => count + NOTIFICATIONS_VISIBLE_BATCH)}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-[3px] border-on-surface bg-white font-display text-xs font-black uppercase italic tracking-normal text-on-surface shadow-[4px_4px_0px_black] transition-all hover:shadow-[6px_6px_0px_black] active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
            >
              Show more ({remaining} remaining)
            </button>
          )}
        </>
      )}
    </section>
  );
}
