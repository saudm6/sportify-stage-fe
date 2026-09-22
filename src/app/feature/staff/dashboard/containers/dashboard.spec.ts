import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Dashboard } from './dashboard';
import { dateRange } from '../../shared/functions/dates';
import { DEFAULT_PAGE_SIZE } from '../../../../shared/functions/pagination';

describe('Staff dashboard', () => {
  let http: HttpTestingController;
  let optionsRequests: number;
  let expectedOptionsRequests: number;
  const options = {
    branches: [],
    sports: [],
    courts: [],
    statuses: ['PENDING', 'CONFIRMED', 'CANCELLED'],
    bookingTypes: ['EXTERNAL'],
  };
  const filters = () => {
    optionsRequests++;
    return http.expectOne((req) => req.url.endsWith('/staff/booking-filters'));
  };
  const response = {
    from: '2026-09-01', to: '2026-09-30',
    summary: { totalBookings: 42, totalBookingRevenue: 123.456, averageBookingValue: 2.939 },
    byBranch: [{ publicId: 'branch', nameEn: 'Seeb', nameAr: '', totalBookings: 42, totalBookingRevenue: 123.456, averageBookingValue: 2.939 }],
    bySport: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'staff/dashboard', component: Dashboard }]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    optionsRequests = 0; expectedOptionsRequests = 1;
  });
  afterEach(() => {
    const requests = http.match((req) => req.url.endsWith('/staff/booking-filters'));
    optionsRequests += requests.length;
    expect(optionsRequests).toBe(expectedOptionsRequests);
    requests[0]?.flush({
      branches: [],
      sports: [],
      courts: [],
      statuses: ['PENDING', 'CONFIRMED', 'CANCELLED'],
      bookingTypes: ['INTERNAL', 'EXTERNAL'],
    });
    http.verify();
  });


  it('links to confirmed bookings using applied filters even while drafts change', async () => {
    const harness = await RouterTestingHarness.create();
    const branch = '11111111-1111-1111-1111-111111111111';
    const sport = '22222222-2222-2222-2222-222222222222';
    const page = await harness.navigateByUrl(`/staff/dashboard?from=2026-09-01&to=2026-09-30&branchPublicId=${branch}&sportPublicId=${sport}`, Dashboard);
    http.expectOne(req => req.url.endsWith('/staff/booking-report')).flush(response);
    page.form.patchValue({ from: '2026-09-15', branchPublicId: '', sportPublicId: '' });
    harness.detectChanges();
    const link = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('a[href*="/staff/bookings"]')!;
    const target = new URL(link.href);
    expect(Object.fromEntries(target.searchParams)).toEqual({ from: '2026-09-01', to: '2026-09-30',
      branchPublicId: branch, sportPublicId: sport, status: 'CONFIRMED', page: '1', pageSize: String(DEFAULT_PAGE_SIZE) });
    http.expectNone(req => req.url.endsWith('/staff/booking-report'));
  });

  it('uses Muscat calendar dates, Monday weeks and leap-year month ends', () => {
    expectedOptionsRequests = 0;
    expect(dateRange('today', new Date('2026-09-30T21:00:00Z'))).toEqual({ from: '2026-10-01', to: '2026-10-01' });
    expect(dateRange('week', new Date('2026-09-06T12:00:00Z'))).toEqual({ from: '2026-08-31', to: '2026-09-06' });
    expect(dateRange('month', new Date('2024-02-10T12:00:00Z'))).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('renders API totals, keeps drafts unapplied, cancels stale requests and restores URL filters', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/staff/dashboard?from=2026-09-01&to=2026-09-30', Dashboard);
    const first = http.expectOne(req => req.url.endsWith('/staff/booking-report'));
    expect(first.request.params.has('page')).toBe(false);
    expect(first.request.params.has('pageSize')).toBe(false);
    first.flush(response);
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('123.456');
    expect(harness.routeNativeElement!.textContent).toContain('Seeb');
    page.form.controls.from.setValue('2026-09-02');
    http.expectNone(req => req.url.endsWith('/staff/booking-report'));
    expect(page.applied().from).toBe('2026-09-01');
    await page.apply();
    const stale = http.expectOne(req => req.params.get('from') === '2026-09-02');
    await harness.navigateByUrl('/staff/dashboard?from=2026-09-03&to=2026-09-30', Dashboard);
    expect(stale.cancelled).toBe(true);
    http.expectOne(req => req.params.get('from') === '2026-09-03').flush(response);
    await harness.navigateByUrl('/staff/dashboard?from=2026-09-01&to=2026-09-30', Dashboard);
    http.expectOne(req => req.params.get('from') === '2026-09-01').flush(response);
    expect(page.form.controls.from.value).toBe('2026-09-01');
  });

  it('shows Retry on failure, then genuine empty results after retry', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/staff/dashboard?from=2026-09-01&to=2026-09-30', Dashboard);
    http.expectOne(req => req.url.endsWith('/staff/booking-report')).flush({}, { status: 500, statusText: 'Error' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Retry');
    expect(harness.routeNativeElement!.querySelector('.metrics')).toBeNull();
    page.retry.next();
    http.expectOne(req => req.url.endsWith('/staff/booking-report')).flush({ ...response, summary: { totalBookings: 0, totalBookingRevenue: 0, averageBookingValue: 0 }, byBranch: [] });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('No confirmed bookings');
    expect(harness.routeNativeElement!.textContent).toContain('0.000');
  });

  it('rejects invalid URL dates without requesting misleading totals', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/staff/dashboard?from=2026-02-30&to=2026-02-01', Dashboard);
    http.expectNone(req => req.url.endsWith('/staff/booking-report'));
    expect(harness.routeNativeElement!.textContent).toContain('valid date range');
  });

  it('validates required dates, date limits and range order in the reactive form', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/staff/dashboard?from=2026-09-01&to=2026-09-30', Dashboard);
    http.expectOne(req => req.url.endsWith('/staff/booking-report')).flush(response);
    for (const from of ['', '2026-02-30', '9999-12-31', '2026-10-01']) {
      page.form.controls.from.setValue(from);
      expect(page.form.invalid).toBe(true);
      await page.apply();
      http.expectNone(req => req.url.endsWith('/staff/booking-report'));
    }
    page.form.controls.from.setValue('2026-09-01');
    expect(page.form.valid).toBe(true);
    harness.detectChanges();
    for (const input of harness.routeNativeElement!.querySelectorAll('input[type="date"]')) {
      expect(input.hasAttribute('required')).toBe(false);
      expect(input.hasAttribute('max')).toBe(false);
    }
  });

  it('persists the default month in the URL and resets every filter', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/staff/dashboard');
    await TestBed.inject(ApplicationRef).whenStable();
    const initial = http.expectOne(req => req.url.endsWith('/staff/booking-report'));
    expect(initial.request.params.get('from')).toBe(dateRange('month').from);
    expect(TestBed.inject(Router).url).toContain(`from=${dateRange('month').from}`);
    initial.flush(response);
    const branch = '11111111-1111-1111-1111-111111111111';
    const sport = '22222222-2222-2222-2222-222222222222';
    const page = await harness.navigateByUrl(`/staff/dashboard?from=2026-01-01&to=2026-01-31&branchPublicId=${branch}&sportPublicId=${sport}`, Dashboard);
    http.expectOne(req => req.params.get('branchPublicId') === branch && req.params.get('sportPublicId') === sport).flush(response);
    await page.reset();
    const reset = http.expectOne(req => req.params.get('from') === dateRange('month').from);
    expect(reset.request.params.has('branchPublicId')).toBe(false);
    expect(reset.request.params.has('sportPublicId')).toBe(false);
    expect(page.preset()).toBe('month');
    reset.flush(response);
  });
  it('retries options and data independently, preserves options on refresh failure and cancels on destruction', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(
      '/staff/dashboard?from=2026-09-01&to=2026-09-30',
      Dashboard,
    );
    filters().flush({}, { status: 500, statusText: 'Error' });
    http.expectOne((req) => req.url.endsWith('/staff/booking-report')).flush(response);
    harness.detectChanges();
    expect(page.report()).toEqual(response);
    expect(page.optionsError()).toContain('Filter options');
    expect(harness.routeNativeElement!.textContent).toContain('Retry filter options');
    page.optionsRetry.next();
    expectedOptionsRequests++;
    http.expectNone((req) => req.url.endsWith('/staff/booking-report'));
    const refreshed = filters();
    expect(refreshed.request.params.keys()).toEqual([]);
    refreshed.flush(options);
    page.retry.next();
    http.expectNone((req) => req.url.endsWith('/staff/booking-filters'));
    http
      .expectOne((req) => req.url.endsWith('/staff/booking-report'))
      .flush({}, { status: 500, statusText: 'Error' });
    expect(page.options()).toEqual(options);
    expect(page.optionsError()).toBe('');
    page.retry.next();
    http.expectOne((req) => req.url.endsWith('/staff/booking-report')).flush(response);
    expect(page.report()).toEqual(response);
    page.optionsRetry.next();
    expectedOptionsRequests++;
    filters().flush({}, { status: 500, statusText: 'Error' });
    expect(page.options()).toEqual(options);
    expect(page.report()).toEqual(response);
    page.optionsRetry.next();
    expectedOptionsRequests++;
    const pendingOptions = filters();
    await harness.navigateByUrl('/staff/dashboard?from=2026-09-02&to=2026-09-30', Dashboard);
    const pendingData = http.expectOne((req) => req.url.endsWith('/staff/booking-report'));

    harness.fixture.destroy();
    expect(pendingOptions.cancelled).toBe(true);
    expect(pendingData.cancelled).toBe(true);

    page.optionsRetry.next();
    page.retry.next();
    http.expectNone((req) => req.url.includes('/staff/'));
  });
});
