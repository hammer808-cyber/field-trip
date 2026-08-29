import { ArrowUpRight, BookOpen, Grid3X3, Layers3, Settings, Vote } from 'lucide-react';
import type { BasecampQuickLink } from '../../logic/basecampViewModel';

interface ExtraPlace {
  id: string;
  label: string;
  href: string;
  icon: 'loteria' | 'settings';
}

interface BasecampQuickLinksProps {
  links: readonly BasecampQuickLink[];
  onOpen: (href: string) => void;
  extraActions?: readonly ExtraPlace[];
}

const linkIcons = {
  missions: Layers3,
  logbook: BookOpen,
  loteria: Grid3X3,
  voting: Vote,
  settings: Settings,
};

export function BasecampQuickLinks({ links, onOpen, extraActions = [] }: BasecampQuickLinksProps) {
  return (
    <section aria-labelledby="basecamp-destinations-heading" className="basecamp-more-places">
      <div className="mb-3 flex items-end justify-between gap-4 border-b-2 border-[var(--skin-border)] pb-2">
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Optional</p>
          <h2 id="basecamp-destinations-heading" className="mt-1 font-display text-2xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">
            More places
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {links.map((link, index) => {
          const Icon = linkIcons[link.id];
          const accents = [
            'bg-[var(--skin-surface)] text-[var(--skin-text)]',
            'bg-[var(--skin-surface)] text-[var(--skin-text)]',
            'bg-[var(--skin-surface)] text-[var(--skin-text)]',
            'bg-[var(--skin-text)] text-[var(--skin-surface)]',
          ];
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onOpen(link.href)}
              className={`skin-card group relative min-h-[112px] overflow-hidden border-[var(--skin-border-width)] border-[var(--skin-border)] p-4 text-left shadow-[3px_3px_0_var(--skin-border)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)] ${accents[index % accents.length]}`}
            >
              <Icon className="absolute -bottom-3 -right-2 h-16 w-16 opacity-10" aria-hidden="true" />
              <div className="relative flex h-full min-h-[84px] flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center border-2 border-current bg-[var(--skin-surface)] text-[var(--skin-text)]">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <ArrowUpRight size={18} strokeWidth={3} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-black uppercase italic leading-none tracking-normal">{link.label}</h3>
                  <p className="mt-1 max-w-[30ch] text-[11px] font-bold leading-snug opacity-70">{link.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {extraActions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {extraActions.map((action) => {
            const Icon = linkIcons[action.icon];
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onOpen(action.href)}
                className="inline-flex min-h-10 items-center gap-2 border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--skin-text)] opacity-70 hover:opacity-100 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)]"
              >
                <Icon size={14} aria-hidden="true" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
