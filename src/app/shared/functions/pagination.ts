// The users API caps page size at 10; keep the app default within that limit.
export const DEFAULT_PAGE_SIZE = 5;
export const PAGE_SIZE_OPTIONS = [...new Set([DEFAULT_PAGE_SIZE, 10, 20, 50, 100])].sort(
  (a, b) => a - b,
);

export interface PaginationState {
  page: number;
  pageSize: number;
}

export const defaultPagination = (): PaginationState => ({ page: 1, pageSize: DEFAULT_PAGE_SIZE });

export function validPagination(
  { page, pageSize }: PaginationState,
  maxPage = 1000000,
  maxPageSize = 100,
): boolean {
  return (
    Number.isInteger(page) &&
    page >= 1 &&
    page <= Math.max(1, maxPage) &&
    Number.isInteger(pageSize) &&
    pageSize >= 1 &&
    pageSize <= maxPageSize &&
    PAGE_SIZE_OPTIONS.includes(pageSize)
  );
}

/** Page changes preserve size; size changes restart at page one. Invalid events return null. */
export function updatePagination(
  current: PaginationState,
  change: Partial<PaginationState>,
  maxPage = 1000000,
  maxPageSize = 100,
): PaginationState | null {
  const next = { page: current.page, pageSize: current.pageSize, ...change };
  if (change.pageSize !== undefined) next.page = 1;
  return validPagination(next, maxPage, maxPageSize) ? next : null;
}
