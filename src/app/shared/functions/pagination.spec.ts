import {
  defaultPagination,
  PAGE_SIZE_OPTIONS,
  updatePagination,
  validPagination,
} from './pagination';

describe('shared pagination', () => {
  it('provides independent defaults and includes the default in size options', () => {
    const first = defaultPagination();
    expect(PAGE_SIZE_OPTIONS).toContain(first.pageSize);
    first.page = 3;
    expect(defaultPagination().page).toBe(1);
  });

  it('changes page without mutating state and resets to page one on size changes', () => {
    const current = { page: 3, pageSize: 20, search: 'old filter' };
    expect(updatePagination(current, { page: 2 })).toEqual({ page: 2, pageSize: 20 });
    expect(updatePagination(current, { pageSize: 50 })).toEqual({ page: 1, pageSize: 50 });
    expect(current).toEqual({ page: 3, pageSize: 20, search: 'old filter' });
  });

  it('rejects invalid values and respects endpoint and result limits', () => {
    for (const page of [0, -1, 1.5, NaN, Infinity, 1000001]) {
      expect(updatePagination(defaultPagination(), { page })).toBeNull();
    }
    for (const pageSize of [0, -1, 1.5, NaN, Infinity, 101]) {
      expect(validPagination({ page: 1, pageSize })).toBe(false);
    }
    expect(updatePagination(defaultPagination(), { page: 4 }, 3)).toBeNull();
    expect(updatePagination(defaultPagination(), { page: 1 }, 0)).not.toBeNull();
    expect(updatePagination(defaultPagination(), { pageSize: 20 }, 100, 10)).toBeNull();
    expect(updatePagination({ page: 3, pageSize: 5 }, { pageSize: 10 }, 100, 10)).toEqual({
      page: 1,
      pageSize: 10,
    });
  });
});
