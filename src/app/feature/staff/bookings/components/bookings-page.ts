import { DecimalPipe, TitleCasePipe } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  BookingFilterOptions,
  BookingList,
  BookingReportEntry,
  NamedReference,
} from '../../shared/models/booking-report';
import { BookingDetails, BookingIdentity, BookingsForm, BookingsQuery } from '../models/bookings';
import { BookingDatePipe } from '../formatters/booking-date';

@Component({
  selector: 'app-bookings-page',
  imports: [DecimalPipe, TitleCasePipe, BookingDatePipe, ReactiveFormsModule],
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
  readonly detailHeading = viewChild<ElementRef<HTMLElement>>('detailHeading');
  readonly listHeading = viewChild<ElementRef<HTMLElement>>('listHeading');
  private trigger: HTMLElement | null = null;
  private focusedIdentity = '';

  constructor() {
    afterRenderEffect(() => {
      const row = this.selected();
      const key = row ? `${row.bookingType}:${row.bookingPublicId}` : '';
      if (key === this.focusedIdentity) return;
      if (key) this.detailHeading()?.nativeElement.focus();
      else if (this.focusedIdentity)
        (this.trigger?.isConnected ? this.trigger : this.listHeading()?.nativeElement)?.focus();
      this.focusedIdentity = key;
    });
  }

  name(value: NamedReference): string {
    return value.nameEn?.trim() || value.nameAr?.trim() || 'Not recorded';
  }
  recorded(value: string | null): string {
    return value?.trim() || 'Not recorded';
  }
  isSelected(row: BookingReportEntry): boolean {
    return (
      this.selected()?.bookingType === row.bookingType &&
      this.selected()?.bookingPublicId === row.bookingPublicId
    );
  }
  open(row: BookingReportEntry, event: Event): void {
    this.trigger = event.currentTarget as HTMLElement;
    this.viewDetails.emit(row);
  }
  @HostListener('keydown.escape') escape(): void {
    if (this.selected()) this.closeDetails.emit();
  }
}
