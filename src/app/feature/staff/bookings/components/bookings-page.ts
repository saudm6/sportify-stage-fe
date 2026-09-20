import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  BookingFilterOptions,
  BookingList,
  BookingReportEntry,
} from '../../shared/models/booking-report';
import { BookingDetailFocus } from '../accessibility/booking-detail-focus';
import { BookingDetails, BookingIdentity, BookingsForm, BookingsQuery } from '../models/bookings';
import { BookingDatePipe } from '../formatters/booking-date';
import { RecordedValuePipe, ReferenceNamePipe } from '../formatters/booking-display';

@Component({
  selector: 'app-bookings-page',
  imports: [
    DecimalPipe,
    TitleCasePipe,
    BookingDatePipe,
    RecordedValuePipe,
    ReferenceNamePipe,
    BookingDetailFocus,
    ReactiveFormsModule,
  ],
  templateUrl: './bookings-page.html',
  styleUrl: './bookings-page.css',
})
export class BookingsPage {
  readonly form = input.required<BookingsForm>();
  readonly applied = input.required<BookingsQuery>();
  readonly report = input<BookingList | null>(null);
  readonly options = input.required<BookingFilterOptions>();
  readonly courts = input.required<BookingFilterOptions['courts']>();
  readonly optionsLoading = input(false);
  readonly optionsError = input('');
  readonly retryOptions = output();
  readonly loading = input(false);
  readonly error = input('');
  readonly validation = input('');
  readonly selected = input<BookingIdentity | null>(null);
  readonly detail = input<BookingDetails | null>(null);
  readonly detailLoading = input(false);
  readonly detailError = input('');
  readonly applyFilters = output();
  readonly resetFilters = output();
  readonly retry = output();
  readonly closeDetails = output();
  readonly retryDetails = output();
  readonly changePage = output<number>();
  readonly changePageSize = output<number>();
  readonly viewDetails = output<BookingReportEntry>();
}
