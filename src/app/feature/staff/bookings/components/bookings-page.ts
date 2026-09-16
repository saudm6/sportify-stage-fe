import { DecimalPipe } from '@angular/common';
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
  BookingReport,
  BookingReportEntry,
  NamedReference,
} from '../../shared/models/booking-report';
import { BookingDetails, BookingIdentity, BookingsForm, BookingsQuery } from '../models/bookings';

@Component({
  selector: 'app-bookings-page',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './bookings-page.html',
  styleUrl: './bookings-page.css',
})
export class BookingsPage {
  readonly form = input.required<BookingsForm>();
  readonly applied = input.required<BookingsQuery>();
  readonly report = input<BookingReport | null>(null);
  readonly options = input.required<BookingReport['availableFilters']>();
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
  private readonly dateFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Muscat',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  private readonly timeFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Muscat',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

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

  courts() {
    const { branchPublicId, sportPublicId } = this.form().getRawValue();
    return this.options().courts.filter(
      (court) =>
        (!branchPublicId || court.branchPublicId === branchPublicId) &&
        (!sportPublicId || court.sportPublicId === sportPublicId),
    );
  }
  name(value: NamedReference): string {
    return value.nameEn?.trim() || value.nameAr?.trim() || 'Not recorded';
  }
  recorded(value: string | null): string {
    return value?.trim() || 'Not recorded';
  }
  source(row: BookingReportEntry): string {
    return row.bookingType === 'CUSTOMER' ? 'Customer' : 'External';
  }
  status(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  pageSize(event: Event): void {
    this.changePageSize.emit(Number((event.target as HTMLSelectElement).value));
  }
  date(value: string): string {
    const date = this.timestamp(value);
    return date ? this.dateFormat.format(date) : 'Not recorded';
  }
  time(value: string): string {
    const date = this.timestamp(value);
    return date ? this.timeFormat.format(date) : '';
  }
  dateTime(value: string | null): string {
    return value ? `${this.date(value)} · ${this.time(value)}` : 'Not recorded';
  }
  private timestamp(value: string): Date | null {
    const date = new Date(
      /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}+04:00`,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
