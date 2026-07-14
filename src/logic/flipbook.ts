export type FlipbookLayout = 'mobile' | 'desktop';
export type FlipbookViewMode = 'flipbook' | 'grid' | 'list';

export const DEFAULT_FLIPBOOK_BATCH_SIZE = 8;

export function clampFlipbookPage(page: number, pageCount: number): number {
  if (pageCount <= 0) return 0;
  if (!Number.isFinite(page)) return 0;
  return Math.min(Math.max(Math.floor(page), 0), pageCount - 1);
}

export function getFlipbookStep(layout: FlipbookLayout): number {
  return layout === 'desktop' ? 2 : 1;
}

export function getFlipbookVisibleIndexes(
  page: number,
  pageCount: number,
  layout: FlipbookLayout,
): number[] {
  if (pageCount <= 0) return [];
  const current = clampFlipbookPage(page, pageCount);
  if (layout === 'mobile') return [current];
  return [current, current + 1].filter(index => index < pageCount);
}

export function getNextFlipbookPage(
  page: number,
  pageCount: number,
  layout: FlipbookLayout,
): number {
  return clampFlipbookPage(page + getFlipbookStep(layout), pageCount);
}

export function getPreviousFlipbookPage(
  page: number,
  pageCount: number,
  layout: FlipbookLayout,
): number {
  return clampFlipbookPage(page - getFlipbookStep(layout), pageCount);
}

export function getFlipbookBatchLimit(
  page: number,
  layout: FlipbookLayout,
  batchSize = DEFAULT_FLIPBOOK_BATCH_SIZE,
): number {
  const visibleEnd = page + getFlipbookStep(layout);
  return Math.max(batchSize, Math.ceil(visibleEnd / batchSize) * batchSize);
}

export function shouldRequestNextFlipbookBatch(params: {
  page: number;
  loadedPageCount: number;
  layout: FlipbookLayout;
  hasMore: boolean;
}): boolean {
  const { page, loadedPageCount, layout, hasMore } = params;
  if (!hasMore || loadedPageCount <= 0) return false;
  return page + getFlipbookStep(layout) >= loadedPageCount - getFlipbookStep(layout);
}

export function parseFlipbookPage(value: string | null): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed - 1) : 0;
}

export function serializeFlipbookPage(page: number): string {
  return String(Math.max(0, Math.floor(page)) + 1);
}
