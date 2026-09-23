import { ParamMap } from '@angular/router';
import { dateRange } from '../../shared/functions/dates';
import { BookingsQuery } from '../models/bookings';
import { defaultPagination } from '../../../../shared/functions/pagination';

export const defaultBookingsQuery = (): BookingsQuery => ({
  ...dateRange('month'),
  branchPublicId: '',
  sportPublicId: '',
  courtPublicId: '',
  status: '',
  bookingType: '',
  search: '',
  ...defaultPagination(),
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
  if (page !== null) {
    query.page = /^\d+$/.test(page) ? Number(page) : NaN;
  }
  if (size !== null) {
    query.pageSize = /^\d+$/.test(size) ? Number(size) : NaN;
  }
  return query;
}
