import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, merge, of, Subject, switchMap } from 'rxjs';
import {
  BookingFilterOptions,
  BookingList,
  BookingReportEntry,
} from '../../shared/models/booking-report';
import { StaffBookingsApi } from '../../shared/service/staff-bookings-api';

import { BookingsPage } from '../components/bookings-page';
import {
  BookingDetails,
  BookingIdentity,
  BookingsFilters,
  BookingsForm,
  BookingsQuery,
} from '../models/bookings';
import { validBookingsFilters } from '../functions/bookings-filters';
import { defaultBookingsQuery, queryFromParams } from '../functions/bookings-query';
import { defaultPagination, updatePagination, validPagination } from '../../../../shared/functions/pagination';

const validationMessage = 'Choose valid filters, dates and pagination, then Apply.';

function requestError(error: HttpErrorResponse, detail = false): string {
  if (error.status === 403) return 'Access denied.';
  if (detail && error.status === 404) return 'Booking no longer available.';
  if (error.status === 400) return 'The server rejected these filters. Check the values and Apply.';
  return detail
    ? 'Booking details could not be loaded. Open the booking again.'
    : 'Bookings could not be loaded. Apply filters to try again.';
}

@Component({
  selector: 'app-bookings',
  imports: [BookingsPage],
  template: `<app-bookings-page
    [form]="form"
    [applied]="applied()"
    [report]="report()"
    [options]="options()"
    [courts]="courts()"
    [optionsLoading]="optionsLoading()"
    [optionsError]="optionsError()"
    [loading]="loading()"
    [error]="error()"
    [validation]="validation()"
    [selected]="selected()"
    [detail]="detail()"
    [detailLoading]="detailLoading()"
    [detailError]="detailError()"
    (applyFilters)="apply()"
    (resetFilters)="reset()"
    (changePage)="setPage($event)"
    (changePageSize)="setPageSize($event)"
    (viewDetails)="openDetails($event)"
    (closeDetails)="closeDetails()"
  />`,
})
export class Bookings {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly service = inject(StaffBookingsApi);
  readonly optionsLoading = signal(false);
  readonly optionsError = signal('');
  private optionsLoaded = false;
  private readonly listRefresh = new Subject<void>();
  private readonly selection = new Subject<BookingIdentity | null>();
  readonly applied = signal<BookingsQuery>(defaultBookingsQuery());
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
  readonly report = signal<BookingList | null>(null);
  readonly options = signal<BookingFilterOptions>({
    branches: [],
    sports: [],
    courts: [],
    statuses: [],
    bookingTypes: [],
  });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly validation = signal('');
  readonly selected = signal<BookingIdentity | null>(null);
  readonly detail = signal<BookingDetails | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');

  constructor() {
    this.loadFilterOptions();
    this.watchBookingSelection();
    this.watchListQuery();
    this.initializeCourtSelection();
  }

  private loadFilterOptions() {
    this.optionsLoading.set(true);
    this.service
      .getFilters()
      .pipe(
        map((options) => ({ options, error: '' })),
        catchError(() =>
          of({
            options: null,
            error: 'Filter options could not be loaded. Reload the page to try again.',
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.optionsLoading.set(false);
        this.optionsError.set(result.error);
        if (result.options) {
          this.optionsLoaded = true;
          this.options.set(result.options);
          this.reconcileSelections(result.options);
        }
      });
  }

  private watchBookingSelection() {
    this.selection
      .pipe(
        switchMap((identity) => {
          this.detail.set(null);
          this.detailError.set('');
          this.detailLoading.set(!!identity);
          return identity
            ? this.service.getDetails(identity.bookingType, identity.bookingPublicId).pipe(
                map((detail) => ({ detail, error: '' })),
                catchError((error) => of({ detail: null, error: requestError(error, true) })),
              )
            : of(null);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.detailLoading.set(false);
        if (result) {
          this.detail.set(result.detail);
          this.detailError.set(result.error);
        }
      });
  }

  private watchListQuery() {
    merge(
      this.route.queryParamMap,
      this.listRefresh.pipe(map(() => this.route.snapshot.queryParamMap)),
    )
      .pipe(
        switchMap((params) => {
          const query = queryFromParams(params);
          this.applied.set(query);
          const { page: ignoredPage, pageSize: ignoredSize, ...filters } = query;
          this.form.setValue(filters, { emitEvent: false });
          this.validation.set('');
          this.closeDetails();
          this.report.set(null);
          this.error.set('');
          this.loading.set(false);
          if (validBookingsFilters(query) && validPagination(query)) {
            if (this.optionsLoaded && this.reconcileSelections(this.options())) return of(null);
            if (['from', 'to', 'page', 'pageSize'].every((key) => params.has(key))) {
              this.loading.set(true);
              return this.service.getList(query).pipe(
                map((report) => ({ report, error: '' })),
                catchError((error) => of({ report: null, error: requestError(error) })),
              );
            } else {
              void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: query,
                replaceUrl: true,
              });
              return of(null);
            }
          } else {
            this.validation.set(validationMessage);
            return of(null);
          }
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result) {
          this.report.set(result.report);
          this.error.set(result.error);
        }
      });
  }

  private initializeCourtSelection() {
    for (const control of [this.form.controls.branchPublicId, this.form.controls.sportPublicId]) {
      control.valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.clearIncompatibleCourt());
    }
  }

  private reconcileSelections(options: BookingFilterOptions) {
    const draft = this.form.getRawValue();
    const query = { ...this.applied() };
    for (const [key, values] of [
      ['branchPublicId', options.branches.map((item) => item.publicId)],
      ['sportPublicId', options.sports.map((item) => item.publicId)],
      ['courtPublicId', options.courts.map((item) => item.publicId)],
      ['status', options.statuses],
      ['bookingType', options.bookingTypes],
    ] as const) {
      for (const filters of [draft, query]) {
        if (filters[key] && !values.some((value) => value === filters[key])) filters[key] = '';
      }
    }
    draft.courtPublicId = this.compatibleCourtId(draft);
    query.courtPublicId = this.compatibleCourtId(query);
    this.form.setValue(draft, { emitEvent: false });
    if (JSON.stringify(query) === JSON.stringify(this.applied())) return false;
    query.page = 1;
    this.applied.set(query);
    void this.router.navigate([], { relativeTo: this.route, queryParams: query, replaceUrl: true });
    return true;
  }

  courts() {
    const { branchPublicId, sportPublicId } = this.form.getRawValue();
    return this.options().courts.filter(
      (court) =>
        (!branchPublicId || court.branchPublicId === branchPublicId) &&
        (!sportPublicId || court.sportPublicId === sportPublicId),
    );
  }

  private clearIncompatibleCourt() {
    this.form.controls.courtPublicId.setValue(this.compatibleCourtId(this.form.getRawValue()));
  }

  private compatibleCourtId(values: BookingsFilters) {
    const court = this.options().courts.find((item) => item.publicId === values.courtPublicId);
    if (
      court &&
      ((values.branchPublicId && values.branchPublicId !== court.branchPublicId) ||
        (values.sportPublicId && values.sportPublicId !== court.sportPublicId))
    )
      return '';
    return values.courtPublicId;
  }

  private navigate(query: BookingsQuery) {
    this.validation.set('');
    if (JSON.stringify(query) === JSON.stringify(this.applied())) {
      this.listRefresh.next();
      return Promise.resolve(true);
    }
    return this.router.navigate([], { relativeTo: this.route, queryParams: query });
  }
  apply() {
    const filters: BookingsFilters = this.form.getRawValue();
    if (validBookingsFilters(filters)) {
      return this.navigate({
        ...filters,
        status: filters.status.trim(),
        search: filters.search.trim(),
        ...(updatePagination(this.applied(), { page: 1 }) ?? defaultPagination()),
      });
    } else {
      this.form.markAllAsTouched();
      this.validation.set(validationMessage);
      return Promise.resolve(false);
    }
  }
  reset() {
    const query = defaultBookingsQuery();
    const { page, pageSize, ...filters } = query;
    this.form.setValue(filters, { emitEvent: false });
    return this.navigate(query);
  }
  setPage(page: number) {
    const pagination = updatePagination(this.applied(), { page });
    return pagination ? this.navigate({ ...this.applied(), ...pagination }) : Promise.resolve(false);
  }
  setPageSize(pageSize: number) {
    const pagination = updatePagination(this.applied(), { pageSize });
    return pagination ? this.navigate({ ...this.applied(), ...pagination }) : Promise.resolve(false);
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
