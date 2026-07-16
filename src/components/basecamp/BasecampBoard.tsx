import type { ReactNode } from 'react';

interface BasecampBoardProps {
  main: ReactNode;
  sidebar: ReactNode;
  quickLinks: ReactNode;
}

export function BasecampBoard({ main, sidebar, quickLinks }: BasecampBoardProps) {
  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-12 lg:gap-7 lg:px-8 lg:py-10">
      <div className="space-y-5 lg:col-span-7">{main}</div>
      <aside className="space-y-5 lg:col-span-5" aria-label="Basecamp status">
        {sidebar}
      </aside>
      <div className="lg:col-span-12">{quickLinks}</div>
    </main>
  );
}
