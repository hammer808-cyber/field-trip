import { BadgeCheck, Binoculars, FileCheck2, Vote } from 'lucide-react';
import type { BasecampActivityItem, BasecampActivityKind } from '../../logic/basecampViewModel';

interface BasecampRecentActivityProps {
  items: readonly BasecampActivityItem[];
}

const activityIcons: Record<BasecampActivityKind, typeof FileCheck2> = {
  proof: FileCheck2,
  badge: BadgeCheck,
  observation: Binoculars,
  vote: Vote,
};

export function BasecampRecentActivity({ items }: BasecampRecentActivityProps) {
  return (
    <section
      aria-labelledby="basecamp-activity-heading"
      className="skin-card border-[var(--skin-border-width)] border-[var(--skin-border)] bg-[var(--skin-surface)] p-5 shadow-[var(--skin-card-shadow)] sm:p-6"
    >
      <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Personal field record</p>
      <h2 id="basecamp-activity-heading" className="mt-1 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">
        Recent Activity
      </h2>

      {items.length === 0 ? (
        <div className="mt-5 border-t-2 border-[var(--skin-border)] pt-4">
          <p className="text-sm font-bold text-[var(--skin-text)]">No recent personal activity yet.</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--skin-text-muted)]">
            Submissions, approvals, badges, private observations, and your votes will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-5 divide-y-2 divide-[var(--skin-border-muted)] border-y-2 border-[var(--skin-border)]">
          {items.map(item => {
            const Icon = activityIcons[item.kind];
            return (
              <li key={item.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-start gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-[var(--skin-border)] bg-[var(--skin-surface-muted)] text-[var(--skin-primary)]">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase leading-tight text-[var(--skin-text)]">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--skin-text-muted)]">{item.detail}</p>
                </div>
                <time className="pt-1 font-mono text-[7px] font-bold uppercase tracking-wider text-[var(--skin-text-muted)]">
                  {item.timeLabel}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
