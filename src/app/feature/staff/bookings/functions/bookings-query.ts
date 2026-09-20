import { ParamMap } from '@angular/router';
import { dateRange } from '../../shared/functions/report-filters';
import { BookingsQuery } from '../models/bookings';

export const defaultBookingsQuery = (): BookingsQuery => ({
  ...dateRange('month'),
  branchPublicId: '',
  sportPublicId: '',
  courtPublicId: '',
  status: '',
  bookingType: '',
  search: '',
  page: 1,
  pageSize: 20,
});

export function queryFromParams(params: ParamMap): BookingsQuery {
  const query = defaultBookingsQuery();
  for (const key of [
    'from',
    'to',
    'branchPublicId',
    'sportPublicId',
    'courtPublicId',
    'status',
    'bookingType',
    'search',
  ] as const) {
    query[key] = params.get(key) ?? query[key];
  }
  const page = params.get('page');
  const size = params.get('pageSize');
  query.page = page === null ? 1 : /^\d+$/.test(page) ? Number(page) : NaN;
  query.pageSize = size === null ? 20 : /^\d+$/.test(size) ? Number(size) : NaN;
  return query;
}
