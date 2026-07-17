import { ArrowUpRight, BookOpen, Grid3X3, Layers3, Vote } from 'lucide-react';
import type { BasecampQuickLink } from '../../logic/basecampViewModel';

interface BasecampQuickLinksProps {
  links: readonly BasecampQuickLink[];
  onOpen: (href: string) => void;
}

const linkIcons = {
  missions: Layers3,
  logbook: BookOpen,
  loteria: Grid3X3,
  voting: Vote,
};

export function BasecampQuickLinks({ links, onOpen }: BasecampQuickLinksProps) {
  return (
    <section aria-labelledby="basecamp-destinations-heading">
      <div className="mb-4 flex items-end justify-between gap-4 border-b-[3px] border-[var(--skin-border)] pb-3">
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-[var(--skin-text-muted)]">Field destinations</p>
          <h2 id="basecamp-destinations-heading" className="mt-1 font-display text-3xl font-black uppercase italic tracking-normal text-[var(--skin-text)]">
            Go Somewhere
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {links.map((link, index) => {
          const Icon = linkIcons[link.id];
          const accents = [
            'bg-[var(--skin-secondary)] text-[var(--skin-on-secondary)]',
            'bg-[var(--skin-surface)] text-[var(--skin-text)]',
            'bg-[var(--skin-accent)] text-[var(--skin-on-accent)]',
            'bg-[var(--skin-text)] text-[var(--skin-surface)]',
          ];
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onOpen(link.href)}
              className={`skin-card group relative min-h-[164px] overflow-hidden border-[var(--skin-border-width)] border-[var(--skin-border)] p-5 text-left shadow-[var(--skin-card-shadow)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--skin-focus)] ${accents[index % accents.length]}`}
            >
              <Icon className="absolute -bottom-4 -right-2 h-28 w-28 opacity-10 transition-transform group-hover:scale-105 motion-reduce:transition-none" aria-hidden="true" />
              <div className="relative flex h-full min-h-[122px] flex-col justify-between gap-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center border-2 border-current bg-[var(--skin-surface)] text-[var(--skin-text)] shadow-[3px_3px_0_var(--skin-border)]">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <ArrowUpRight size={22} strokeWidth={3} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-3xl font-black uppercase italic leading-none tracking-normal">{link.label}</h3>
                  <p className="mt-2 max-w-[30ch] text-xs font-bold leading-relaxed opacity-75">{link.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
