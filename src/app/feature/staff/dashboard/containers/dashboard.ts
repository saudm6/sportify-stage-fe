import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { DashboardPage } from '../components/dashboard-page';
import { BookingFilterOptions, BookingReport } from '../../shared/models/booking-report';
import { ReportFilters, DatePreset } from '../../shared/models/report-filters';
import { dateRange, validFilters } from '../../shared/utils/report-filters';
import { StaffBookingsApi } from '../../shared/service/staff-bookings-api';

@Component({
  selector: 'app-dashboard',
  imports: [DashboardPage],
  template: `<app-dashboard-page [form]="form" [applied]="applied()" [report]="report()"
    [options]="options()" [optionsLoading]="optionsLoading()" [optionsError]="optionsError()"
    (retryOptions)="optionsRetry.next()" [loading]="loading()" [error]="error()" [validation]="validation()"
    [preset]="preset()" (applyFilters)="apply()" (resetFilters)="reset()"
    (choosePreset)="selectPreset($event)" (retry)="retry.next()" />`,
})
export class Dashboard {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(StaffBookingsApi);
  readonly optionsRetry = new Subject<void>();
  readonly optionsLoading = signal(false);
  readonly optionsError = signal('');
  readonly retry = new Subject<void>();
  readonly applied = signal<ReportFilters>({ ...dateRange('month'), branchPublicId: '', sportPublicId: '' });
  readonly preset = signal<DatePreset>('month');
  readonly form = new FormGroup({
    from: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    to: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    branchPublicId: new FormControl('', { nonNullable: true }),
    sportPublicId: new FormControl('', { nonNullable: true }),
  }, { validators: control => validFilters(control.getRawValue()) ? null : { invalidFilters: true } });
  readonly report = signal<BookingReport | null>(null);
  readonly options = signal<BookingFilterOptions>({ branches: [], sports: [], courts: [], statuses: [], bookingTypes: [] });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly validation = signal('');

  constructor() {
    this.optionsRetry
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.optionsLoading.set(true);
          this.optionsError.set('');
          return this.service.getFilters().pipe(
            map((options) => ({ options, error: '' })),
            catchError(() =>
              of({ options: null, error: 'Filter options could not be loaded. Try again.' }),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.optionsLoading.set(false);
        this.optionsError.set(result.error);
        if (result.options) this.options.set(result.options);
      });
    this.route.queryParamMap.pipe(
      switchMap(params => {
        const defaults = dateRange('month');
        const filters: ReportFilters = {
          from: params.get('from') ?? defaults.from,
          to: params.get('to') ?? defaults.to,
          branchPublicId: params.get('branchPublicId') ?? '',
          sportPublicId: params.get('sportPublicId') ?? '',
        };
        this.applied.set(filters);
        this.form.setValue(filters);
        this.preset.set((['month', 'today', 'week'] as const).find(preset => {
          const range = dateRange(preset);
          return range.from === filters.from && range.to === filters.to;
        }) ?? 'custom');
        this.validation.set('');
        return this.retry.pipe(startWith(undefined), switchMap(() => {
          this.report.set(null);
          this.error.set('');
          this.loading.set(false);
          if (!validFilters(filters)) {
            this.validation.set('Choose a valid date range and branch or sport, then Apply.');
            return of(null);
          }
          // Persist concrete dates so refresh/back keep the same calendar range.
          if (!params.has('from') || !params.has('to')) {
            void this.router.navigate([], { relativeTo: this.route, queryParams: filters, replaceUrl: true });
            return of(null);
          }
          this.loading.set(true);
          return this.service.getReport(filters).pipe(
            map(report => ({ report, error: '' })),
            catchError(() => of({ report: null, error: 'Booking metrics could not be loaded. Try again.' })),
          );
        }));
      }),
      takeUntilDestroyed(),
    ).subscribe(result => {
      this.loading.set(false);
      if (!result) return;
      this.report.set(result.report);
      this.error.set(result.error);
    });
  }

  selectPreset(preset: DatePreset) {
    this.preset.set(preset);
    if (preset !== 'custom') this.form.patchValue(dateRange(preset));
  }

  async apply() {
    const filters = this.form.getRawValue();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.validation.set('Choose a valid date range and branch or sport, then Apply.');
      return;
    }
    this.validation.set('');
    if (JSON.stringify(filters) === JSON.stringify(this.applied())) {
      this.retry.next();
      return;
    }
    await this.router.navigate([], { relativeTo: this.route, queryParams: filters });
  }

  reset() {
    this.form.setValue({ ...dateRange('month'), branchPublicId: '', sportPublicId: '' });
    this.preset.set('month');
    return this.apply();
  }
}
