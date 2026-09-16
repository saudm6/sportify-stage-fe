import { FormControl, FormGroup } from '@angular/forms';
import { BookingReportEntry, BookingType } from '../../shared/models/booking-report';
import { ReportFilters, validFilters, validId } from '../../shared/models/report-filters';

export interface BookingsFilters extends ReportFilters {
  courtPublicId: string;
  status: string;
  bookingType: string;
  search: string;
}
export interface BookingsQuery extends BookingsFilters {
  page: number;
  pageSize: number;
}
export type BookingsForm = FormGroup<{ [K in keyof BookingsFilters]: FormControl<string> }>;
export interface BookingIdentity {
  bookingType: BookingType;
  bookingPublicId: string;
}
export interface BookingDetails extends BookingReportEntry {
  bookingEnd: string;
  durationMinutes: number;
  customerContact: string | null;
  externalNotes: string | null;
  cancelledAt: string | null;
  cancelledByName: string | null;
}
export function validBookingsFilters(filters: BookingsFilters): boolean {
  return (
    validFilters(filters) &&
    validId(filters.courtPublicId) &&
    (!filters.bookingType ||
      filters.bookingType === 'CUSTOMER' ||
      filters.bookingType === 'EXTERNAL') &&
    filters.status.trim().length <= 20 &&
    filters.search.trim().length <= 200
  );
}
