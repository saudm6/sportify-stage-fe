import { validFilters, validId } from '../../shared/utils/report-filters';
import { BookingsFilters } from '../models/bookings';

export function validBookingsFilters(filters: BookingsFilters): boolean {
  return (
    validFilters(filters) &&
    validId(filters.courtPublicId) &&
    (!filters.bookingType ||
      filters.bookingType === 'INTERNAL' ||
      filters.bookingType === 'EXTERNAL') &&
    ['', 'PENDING', 'CONFIRMED', 'CANCELLED'].includes(filters.status.trim()) &&
    filters.search.trim().length <= 200
  );
}
