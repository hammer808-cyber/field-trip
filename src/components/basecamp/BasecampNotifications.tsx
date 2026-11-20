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
 * Notifications (Nov 17, 2026): the full notification list, newest-first,
 * no 5-item cap — the single home for every notification (decisions,
 * submissions, sticker awards, Power Hour); the Updates section was
 * removed Nov 18, 2026. Rows are tappable to their destination (Dex stickers
 * tab for sticker awards, the Logbook for decisions and submissions,
 * Missions for a live Power Hour). Unread rows carry a lime dot; there is
 * no mark-as-read write yet — the client rules are read-only for these
 * docs, so `read` stays server-set until a mark-as-read path is built.
 */
export function BasecampNotifications({ items, onOpen }: BasecampNotificationsProps) {
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
        <ol className="mt-5 divide-y-2 divide-[var(--skin-border-muted)] border-y-2 border-[var(--skin-border)]">
          {items.map(item => {
            const Icon = notificationIcons[item.kind];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-start gap-3 py-3 text-left transition-colors hover:bg-[var(--skin-surface-muted)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--skin-focus)]"
                  aria-label={`${item.title}: ${item.detail}`}
                >
                  <span className="relative flex h-9 w-9 items-center justify-center border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] text-[var(--skin-primary)]">
                    <Icon size={17} aria-hidden="true" />
                    {item.unread && (
                      <span
                        className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[var(--skin-surface)] bg-brand-lime"
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
      )}
    </section>
  );
}
