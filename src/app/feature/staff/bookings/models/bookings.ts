import { FormControl, FormGroup } from '@angular/forms';
import { BookingReportEntry, BookingType } from '../../shared/models/booking-report';
import { ReportFilters } from '../../shared/models/report-filters';

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
