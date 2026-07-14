export type ProfileTab = 'overview' | 'vault' | 'history' | 'settings';

export function applyProfileTabToSearchParams(
  current: URLSearchParams,
  tab: ProfileTab,
): URLSearchParams {
  const next = new URLSearchParams(current);
  next.set('tab', tab === 'history' ? 'logbook' : tab);
  return next;
}
