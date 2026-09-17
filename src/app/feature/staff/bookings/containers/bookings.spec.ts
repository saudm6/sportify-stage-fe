import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BookingList, BookingReportEntry } from '../../shared/models/booking-report';
import { dateRange } from '../../shared/models/report-filters';
import { BookingDetails } from '../models/bookings';
import { Bookings } from './bookings';

describe('Staff bookings', () => {
  let http: HttpTestingController;
  const id = '11111111-1111-1111-1111-111111111111';
  const url = '/staff/bookings?from=2026-09-01&to=2026-09-30&page=1&pageSize=20';
  const reference = { publicId: id, nameEn: 'Seeb', nameAr: '' };
  const customer: BookingReportEntry = {
    bookingPublicId: id,
    bookingType: 'INTERNAL',
    transactionReference: null,
    bookingStart: '2026-09-16T10:00:00',
    recordedAt: '2026-09-01T09:00:00',
    customerName: 'Alice',
    branch: reference,
    court: reference,
    sport: reference,
    status: 'CONFIRMED',
    amount: 12.3,
  };
  const external: BookingReportEntry = {
    ...customer,
    bookingType: 'EXTERNAL',
    customerName: '',
    status: 'CANCELLED',
  };
  const report: BookingList = {
    from: '2026-09-01',
    to: '2026-09-30',
    entries: [customer, external],
    pagination: { page: 1, pageSize: 20, totalItems: 41, totalPages: 3 },
    availableFilters: {
      branches: [reference],
      sports: [reference],
      courts: [{ ...reference, branchPublicId: id, sportPublicId: id }],
      statuses: ['CONFIRMED', 'CANCELLED'],
    },
  };
  const details = (row: BookingReportEntry): BookingDetails => ({
    ...row,
    bookingEnd: '2026-09-16T11:00:00',
    durationMinutes: 60,
    customerContact: null,
    externalNotes: null,
    cancelledAt: null,
    cancelledByName: null,
  });
  const list = () => http.expectOne((req) => req.url.endsWith('/staff/bookings'));
  const detail = (source: string) =>
    http.expectOne((req) => req.url.endsWith(`/staff/bookings/${source}/${id}`));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'staff/bookings', component: Bookings }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('renders composite identities and full totals, opens source-specific details and labels missing values precisely', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Bookings);
    list().flush(report);
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    expect(root.querySelector('.count')!.textContent).toContain('41');
    expect(root.querySelectorAll('tbody tr').length).toBe(2);
    expect(root.textContent).toContain('12.300');
    for (const label of ['Branch', 'Sport', 'Court', 'Status', 'Source']) {
      expect(root.querySelector(`select[aria-label="${label}"]`)).not.toBeNull();
    }
    expect(
      root.querySelector('select[aria-label="Source"] option[value="INTERNAL"]')?.textContent,
    ).toBe('Internal');
    const buttons = root.querySelectorAll<HTMLButtonElement>('button.view');
    const field = (label: string) =>
      [...root.querySelectorAll('dt')]
        .find((node) => node.textContent === label)!
        .nextElementSibling!.textContent.trim();
    buttons[0].click();
    detail('INTERNAL').flush(details(customer));
    harness.detectChanges();
    expect(field('Transaction reference')).toBe('Not recorded');
    expect(field('Customer contact')).toBe('Not recorded');
    expect(field('External notes')).toBe('Not applicable');
    expect(field('Cancelled at')).toBe('Not applicable');
    expect(field('Start')).toContain('10:00');
    expect(field('Recorded at')).toContain('01 Sept 2026');
    buttons[1].click();
    detail('EXTERNAL').flush(details(external));
    harness.detectChanges();
    expect(field('Transaction reference')).toBe('Not applicable');
    expect(field('External notes')).toBe('Not recorded');
    expect(field('Cancelled at')).toBe('Not recorded');
    expect(field('Cancelled by')).toBe('Unavailable for external bookings');
    expect(root.textContent).not.toMatch(/unpaid/i);
  });

  it('applies server filters once, pages with applied values, changes size and restores URL state', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url.replace('page=1', 'page=2'), Bookings);
    list().flush(report);
    page.form.patchValue({
      search: ' Alice ',
      status: 'CONFIRMED',
      bookingType: 'INTERNAL',
      courtPublicId: id,
    });
    http.expectNone((req) => req.url.endsWith('/staff/bookings'));
    await page.apply();
    const applied = list();
    expect(applied.request.params.get('page')).toBe('1');
    for (const [key, value] of Object.entries({
      search: 'Alice',
      status: 'CONFIRMED',
      bookingType: 'INTERNAL',
      courtPublicId: id,
    })) {
      expect(applied.request.params.get(key)).toBe(value);
    }
    applied.flush(report);
    const appliedUrl = TestBed.inject(Router).url;
    page.form.controls.search.setValue('unsubmitted');
    await page.setPage(2);
    const next = list();
    expect(next.request.params.get('search')).toBe('Alice');
    expect(next.request.params.get('page')).toBe('2');
    next.flush(report);
    await page.setPageSize(50);
    const size = list();
    expect(size.request.params.get('page')).toBe('1');
    expect(size.request.params.get('pageSize')).toBe('50');
    size.flush(report);
    await harness.navigateByUrl(appliedUrl, Bookings);
    list().flush(report);
    expect(page.form.controls.search.value).toBe('Alice');
    expect(page.applied().pageSize).toBe(20);
    page.form.patchValue({
      courtPublicId: id,
      branchPublicId: '22222222-2222-2222-2222-222222222222',
    });
    expect(page.form.controls.courtPublicId.value).toBe('');
  });

  it('cancels stale list and detail requests, closes on navigation, and retries failures without stale records', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, Bookings);
    const staleList = list();
    await page.setPage(2);
    expect(staleList.cancelled).toBe(true);
    list().flush(report);
    page.openDetails(customer);
    const staleDetail = detail('INTERNAL');
    page.openDetails(external);
    expect(staleDetail.cancelled).toBe(true);
    const closedDetail = detail('EXTERNAL');
    page.closeDetails();
    expect(closedDetail.cancelled).toBe(true);
    page.openDetails(customer);
    detail('INTERNAL').flush({}, { status: 500, statusText: 'Error' });
    page.detailRetry.next();
    detail('INTERNAL').flush(details(customer));
    expect(page.detail()).not.toBeNull();
    page.openDetails(external);
    const navigatedDetail = detail('EXTERNAL');
    await page.setPage(3);
    expect(navigatedDetail.cancelled).toBe(true);
    expect(page.selected()).toBeNull();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Loading bookings');
    expect(harness.routeNativeElement!.querySelector('tbody')).toBeNull();
    list().flush({}, { status: 500, statusText: 'Error' });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Retry');
    page.retry.next();
    list().flush(report);
    expect(page.report()).toEqual(report);
  });

  it('distinguishes empty, out-of-range, forbidden, rejected filters and missing detail states', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, Bookings);
    list().flush({
      ...report,
      entries: [],
      pagination: { ...report.pagination, totalItems: 0, totalPages: 0 },
    });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('No bookings match');
    await page.setPage(4);
    list().flush({ ...report, entries: [], pagination: { ...report.pagination, page: 4 } });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('Return to first page');
    for (const [status, text] of [
      [400, 'server rejected'],
      [403, 'Access denied'],
    ] as const) {
      page.retry.next();
      list().flush({}, { status, statusText: 'Error' });
      harness.detectChanges();
      expect(harness.routeNativeElement!.textContent).toContain(text);
      expect(harness.routeNativeElement!.querySelector('tbody')).toBeNull();
    }
    page.retry.next();
    list().flush(report);
    for (const [status, text] of [
      [404, 'Booking no longer available'],
      [403, 'Access denied'],
    ] as const) {
      page.openDetails(customer);
      detail('INTERNAL').flush({}, { status, statusText: 'Error' });
      harness.detectChanges();
      expect(harness.routeNativeElement!.textContent).toContain(text);
      expect(harness.routeNativeElement!.querySelectorAll('tbody tr').length).toBe(2);
    }
  });

  it('rejects malformed URL values without fetching and recovers via Apply', async () => {
    const harness = await RouterTestingHarness.create();
    for (const query of [
      'page=0',
      'page=1.5',
      'page=1000001',
      'pageSize=101',
      'bookingType=OTHER',
      'bookingType=CUSTOMER',
      'status=OTHER',
      'courtPublicId=00000000-0000-0000-0000-000000000000',
      'from=2026-02-30',
      `search=${'x'.repeat(201)}`,
      `status=${'x'.repeat(21)}`,
    ]) {
      const params = new URLSearchParams(url.split('?')[1]);
      const [key, value] = query.split('=');
      params.set(key, value);
      await harness.navigateByUrl(`/staff/bookings?${params}`, Bookings);
      http.expectNone((req) => req.url.endsWith('/staff/bookings'));
      expect(harness.routeNativeElement!.textContent).toContain('Choose valid filters');
    }
    const page = await harness.navigateByUrl(url.replace('page=1', 'page=0'), Bookings);
    await page.apply();
    list().flush(report);
    expect(page.applied().page).toBe(1);
  });

  it('persists defaults and resets filters to the Muscat month', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/staff/bookings');
    await TestBed.inject(ApplicationRef).whenStable();
    const initial = list();
    expect(initial.request.params.get('from')).toBe(dateRange('month').from);
    initial.flush(report);
    expect(TestBed.inject(Router).url).toContain('pageSize=20');
    const page = await harness.navigateByUrl(`${url}&search=Alice&bookingType=INTERNAL`, Bookings);
    list().flush(report);
    await page.reset();
    const reset = list();
    expect(reset.request.params.get('from')).toBe(dateRange('month').from);
    expect(reset.request.params.has('search')).toBe(false);
    expect(reset.request.params.has('bookingType')).toBe(false);
    reset.flush(report);
  });
});
