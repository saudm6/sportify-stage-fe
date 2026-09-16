import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { BookingReport, BookingReportEntry } from '../../shared/models/booking-report';
import { dateRange } from '../../shared/models/report-filters';
import { BookingReportService } from '../../shared/service/booking-report.service';
import { BookingsPage } from '../components/bookings-page';
import {
  BookingDetails,
  BookingIdentity,
  BookingsFilters,
  BookingsForm,
  BookingsQuery,
  validBookingsFilters,
} from '../models/bookings';
import { BookingsService } from '../service/bookings.service';

const defaults = (): BookingsQuery => ({
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
const validationMessage = 'Choose valid filters, dates and pagination, then Apply.';
function requestError(error: HttpErrorResponse, detail = false): string {
  if (error.status === 403) return 'Access denied.';
  if (detail && error.status === 404) return 'Booking no longer available.';
  if (error.status === 400) return 'The server rejected these filters. Check the values and Apply.';
  return detail
    ? 'Booking details could not be loaded. Try again.'
    : 'Bookings could not be loaded. Try again.';
}

@Component({
  selector: 'app-bookings',
  imports: [BookingsPage],
  template: `<app-bookings-page
    [form]="form"
    [applied]="applied()"
    [report]="report()"
    [options]="options()"
    [loading]="loading()"
    [error]="error()"
    [validation]="validation()"
    [selected]="selected()"
    [detail]="detail()"
    [detailLoading]="detailLoading()"
    [detailError]="detailError()"
    (applyFilters)="apply()"
    (resetFilters)="reset()"
    (retry)="retry.next()"
    (changePage)="setPage($event)"
    (changePageSize)="setPageSize($event)"
    (viewDetails)="openDetails($event)"
    (closeDetails)="closeDetails()"
    (retryDetails)="detailRetry.next()"
  />`,
})
export class Bookings {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reports = inject(BookingReportService);
  private readonly bookings = inject(BookingsService);
  readonly retry = new Subject<void>();
  readonly detailRetry = new Subject<void>();
  private readonly selection = new Subject<BookingIdentity | null>();
  readonly applied = signal<BookingsQuery>(defaults());
  readonly form: BookingsForm = new FormGroup(
    {
      from: new FormControl('', { nonNullable: true }),
      to: new FormControl('', { nonNullable: true }),
      branchPublicId: new FormControl('', { nonNullable: true }),
      sportPublicId: new FormControl('', { nonNullable: true }),
      courtPublicId: new FormControl('', { nonNullable: true }),
      status: new FormControl('', { nonNullable: true }),
      bookingType: new FormControl('', { nonNullable: true }),
      search: new FormControl('', { nonNullable: true }),
    },
    {
      validators: (control) =>
        validBookingsFilters(control.getRawValue()) ? null : { invalidFilters: true },
    },
  );
  readonly report = signal<BookingReport | null>(null);
  readonly options = signal<BookingReport['availableFilters']>({
    branches: [],
    sports: [],
    courts: [],
    statuses: [],
  });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly validation = signal('');
  readonly selected = signal<BookingIdentity | null>(null);
  readonly detail = signal<BookingDetails | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');

  constructor() {
    this.selection
      .pipe(
        switchMap((identity) =>
          this.detailRetry.pipe(
            startWith(undefined),
            switchMap(() => {
              this.detail.set(null);
              this.detailError.set('');
              this.detailLoading.set(!!identity);
              return identity
                ? this.bookings.getDetails(identity.bookingType, identity.bookingPublicId).pipe(
                    map((detail) => ({ detail, error: '' })),
                    catchError((error) => of({ detail: null, error: requestError(error, true) })),
                  )
                : of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.detailLoading.set(false);
        if (result) {
          this.detail.set(result.detail);
          this.detailError.set(result.error);
        }
      });
    this.route.queryParamMap
      .pipe(
        switchMap((params) => {
          const query = defaults();
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
          this.applied.set(query);
          const { page: ignoredPage, pageSize: ignoredSize, ...filters } = query;
          this.form.setValue(filters, { emitEvent: false });
          this.validation.set('');
          return this.retry.pipe(
            startWith(undefined),
            switchMap(() => {
              this.closeDetails();
              this.report.set(null);
              this.error.set('');
              this.loading.set(false);
              if (
                !validBookingsFilters(query) ||
                !Number.isInteger(query.page) ||
                query.page < 1 ||
                query.page > 1000000 ||
                ![20, 50, 100].includes(query.pageSize)
              ) {
                this.validation.set(validationMessage);
                return of(null);
              }
              if (['from', 'to', 'page', 'pageSize'].some((key) => !params.has(key))) {
                void this.router.navigate([], {
                  relativeTo: this.route,
                  queryParams: query,
                  replaceUrl: true,
                });
                return of(null);
              }
              this.loading.set(true);
              return this.reports.getReport(query, query).pipe(
                map((report) => ({ report, error: '' })),
                catchError((error) => of({ report: null, error: requestError(error) })),
              );
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result) {
          this.report.set(result.report);
          this.error.set(result.error);
          if (result.report) this.options.set(result.report.availableFilters);
        }
      });
    for (const control of [this.form.controls.branchPublicId, this.form.controls.sportPublicId]) {
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        const values = this.form.getRawValue();
        const court = this.options().courts.find((item) => item.publicId === values.courtPublicId);
        if (
          court &&
          ((values.branchPublicId && values.branchPublicId !== court.branchPublicId) ||
            (values.sportPublicId && values.sportPublicId !== court.sportPublicId))
        )
          this.form.controls.courtPublicId.setValue('');
      });
    }
  }

  private navigate(query: BookingsQuery) {
    this.validation.set('');
    if (JSON.stringify(query) === JSON.stringify(this.applied())) {
      this.retry.next();
      return Promise.resolve(true);
    }
    return this.router.navigate([], { relativeTo: this.route, queryParams: query });
  }
  apply() {
    const filters: BookingsFilters = this.form.getRawValue();
    if (!validBookingsFilters(filters)) {
      this.form.markAllAsTouched();
      this.validation.set(validationMessage);
      return Promise.resolve(false);
    }
    return this.navigate({
      ...filters,
      status: filters.status.trim(),
      search: filters.search.trim(),
      page: 1,
      pageSize: [20, 50, 100].includes(this.applied().pageSize) ? this.applied().pageSize : 20,
    });
  }
  reset() {
    const query = defaults();
    const { page, pageSize, ...filters } = query;
    this.form.setValue(filters, { emitEvent: false });
    return this.navigate(query);
  }
  setPage(page: number) {
    if (!Number.isInteger(page) || page < 1 || page > 1000000) return Promise.resolve(false);
    return this.navigate({ ...this.applied(), page });
  }
  setPageSize(pageSize: number) {
    if (![20, 50, 100].includes(pageSize)) return Promise.resolve(false);
    return this.navigate({ ...this.applied(), page: 1, pageSize });
  }
  openDetails(row: BookingReportEntry) {
    const identity = { bookingType: row.bookingType, bookingPublicId: row.bookingPublicId };
    this.selected.set(identity);
    this.selection.next(identity);
  }
  closeDetails() {
    this.selected.set(null);
    this.selection.next(null);
  }
}
