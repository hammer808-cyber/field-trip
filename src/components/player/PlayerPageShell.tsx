import React from 'react';
import { cn } from '../../lib/utils';

export type PlayerDepartment =
  | 'basecamp'
  | 'missions'
  | 'dex'
  | 'profile'
  | 'logbook'
  | 'crew'
  | 'board'
  | 'voting'
  | 'loteria'
  | 'settings'
  | 'identity'
  | 'frontlines'
  | 'onboarding'
  | 'utility';

export function PlayerPageShell({
  department,
  children,
  className,
}: {
  department: PlayerDepartment;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'skin-page page-scroll min-h-screen text-[var(--skin-text)]',
        `ft-dept ft-dept-${department}`,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PlayerPageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('ft-dept-body', className)}>
      {children}
    </div>
  );
}
