import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BookingReportEntry } from '../../shared/models/booking-report';
import { dateRange } from '../../shared/functions/dates';
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
  const report = {
    from: '2026-09-01',
    to: '2026-09-30',
    entries: [customer, external],
    pagination: { page: 1, pageSize: 20, totalItems: 41, totalPages: 3 },
  };
  const options = {
    branches: [reference],
    sports: [reference],
    courts: [{ ...reference, branchPublicId: id, sportPublicId: id }],
    statuses: ['PENDING', 'CONFIRMED', 'CANCELLED'],
    bookingTypes: ['INTERNAL', 'EXTERNAL'],
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
  let optionsRequests: number;
  const filters = () => {
    optionsRequests++;
    return http.expectOne((req) => req.url.endsWith('/staff/booking-filters'));
  };
  const flushOptions = () => {
    const requests = http.match((req) => req.url.endsWith('/staff/booking-filters'));
    optionsRequests += requests.length;
    requests.forEach((request) => request.flush(options));
  };
  const list = () => {
    flushOptions();
    return http.expectOne((req) => req.url.endsWith('/staff/bookings'));
  };
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
    optionsRequests = 0;
  });
  afterEach(() => {
    flushOptions();
    expect(optionsRequests).toBe(1);
    http.verify();
  });

  it('recovers through Apply and reopening details without dedicated retry buttons', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, Bookings);
    filters().flush({}, { status: 500, statusText: 'Error' });
    list().flush({}, { status: 500, statusText: 'Error' });
    harness.detectChanges();
    const retryButtons = () =>
      [...harness.routeNativeElement!.querySelectorAll('button')].filter((button) =>
        /retry/i.test(button.textContent),
      );
    expect(retryButtons()).toHaveLength(0);

    await page.apply();
    const repeated = list();
    expect(repeated.request.method).toBe('GET');
    repeated.flush(report);
    const appliedUrl = TestBed.inject(Router).url;
    await page.apply();
    const pending = list();
    await page.apply();
    expect(pending.cancelled).toBe(true);
    list().flush(report);
    expect(TestBed.inject(Router).url).toBe(appliedUrl);
    http.expectNone((req) => req.url.endsWith('/staff/booking-filters'));

    page.openDetails(customer);
    detail('INTERNAL').flush({}, { status: 500, statusText: 'Error' });
    harness.detectChanges();
    expect(retryButtons()).toHaveLength(0);
    page.openDetails(customer);
    detail('INTERNAL').flush(details(customer));
    expect(page.detail()).toEqual(details(customer));
  });

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
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('tr.selected-row')?.contains(buttons[0])).toBe(true);
    expect(field('Transaction reference')).toBe('Not recorded');
    expect(field('Customer contact')).toBe('Not recorded');
    expect(field('External notes')).toBe('Not applicable');
    expect(field('Cancelled at')).toBe('Not applicable');
    expect(field('Start')).toContain('10:00');
    expect(field('Recorded at')).toContain('01 Sept 2026');
    buttons[1].click();
    detail('EXTERNAL').flush({
      ...details(external),
      customerContact: '91234567',
      externalNotes: 'Bring rackets',
    });
    harness.detectChanges();
    expect(document.activeElement).toBe(root.querySelector('#detail-heading'));
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('tr.selected-row')?.contains(buttons[1])).toBe(true);
    expect(field('Transaction reference')).toBe('Not applicable');
    expect(field('Customer contact')).toBe('91234567');
    expect(field('External notes')).toBe('Bring rackets');
    expect(field('Cancelled at')).toBe('Not recorded');
    expect(field('Cancelled by')).toBe('Unavailable for external bookings');
    expect(root.textContent).not.toMatch(/unpaid/i);
  });

  it('uses Arabic names and missing-value labels when displayed text is blank', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Bookings);
    list().flush({
      ...report,
      entries: [
        {
          ...customer,
          customerName: '  ',
          court: { ...reference, nameEn: '  ', nameAr: ' ملعب ' },
          branch: { ...reference, nameEn: '', nameAr: '' },
        },
      ],
    });
    harness.detectChanges();
    const cells = harness.routeNativeElement!.querySelectorAll('tbody tr td');
    expect(cells[1].querySelector('strong')!.textContent).toBe('Not recorded');
    expect(cells[2].querySelector('strong')!.textContent).toBe('ملعب');
    expect(cells[2].querySelector('small')!.textContent).toBe('Not recorded');
  });

  it('renders equivalent zoned and unzoned timestamps in Muscat and handles invalid dates', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Bookings);
    const timestamps = [
      '2026-09-30T21:30:00Z',
      '2026-10-01T01:30:00+04:00',
      '2026-10-01T01:30:00',
      '2026-10-01 01:30:00',
      'invalid',
    ];
    list().flush({
      ...report,
      entries: timestamps.map((bookingStart, index) => ({
        ...customer,
        bookingPublicId: String(index),
        bookingStart,
      })),
    });
    harness.detectChanges();
    const cells = [...harness.routeNativeElement!.querySelectorAll('.date-cell')];
    for (const cell of cells.slice(0, 4)) {
      expect(cell.querySelector('strong')!.textContent).toBe('01 Oct 2026');
      expect(cell.querySelector('small')!.textContent).toBe('01:30 am');
    }
    expect(cells[4].querySelector('strong')!.textContent).toBe('Not recorded');
    expect(cells[4].querySelector('small')!.textContent).toBe('');
  });

  it('updates visible courts from URL filters, draft changes and Reset', async () => {
    const otherId = '22222222-2222-2222-2222-222222222222';
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(`${url}&branchPublicId=${id}`, Bookings);
    filters().flush({
      ...options,
      courts: [
        options.courts[0],
        { ...reference, publicId: 'other-sport', branchPublicId: id, sportPublicId: otherId },
        { ...reference, publicId: 'other-branch', branchPublicId: otherId, sportPublicId: id },
      ],
    });
    list().flush(report);
    const visibleCourts = () => {
      harness.detectChanges();
      return [
        ...harness.routeNativeElement!.querySelectorAll<HTMLOptionElement>(
          'select[aria-label="Court"] option',
        ),
      ].map((option) => option.value);
    };
    expect(visibleCourts()).toEqual(['', id, 'other-sport']);
    page.form.controls.sportPublicId.setValue(id);
    expect(visibleCourts()).toEqual(['', id]);
    page.form.controls.branchPublicId.setValue(otherId);
    expect(visibleCourts()).toEqual(['', 'other-branch']);
    await page.reset();
    list().flush(report);
    expect(visibleCourts()).toEqual(['', id, 'other-sport', 'other-branch']);
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

  it('clears unavailable selections when options arrive while preserving search', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, Bookings);
    http.expectOne((req) => req.url.endsWith('/staff/bookings')).flush(report);
    const selections = {
      branchPublicId: id,
      sportPublicId: id,
      courtPublicId: id,
      status: 'CONFIRMED',
      bookingType: 'INTERNAL',
      search: 'Alice',
    };
    page.form.patchValue(selections);
    filters().flush({ branches: [], sports: [], courts: [], statuses: [], bookingTypes: [] });
    harness.detectChanges();
    http.expectNone((req) => req.url.endsWith('/staff/bookings'));
    const cleared = {
      branchPublicId: '',
      sportPublicId: '',
      courtPublicId: '',
      status: '',
      bookingType: '',
    };
    expect(page.form.getRawValue()).toMatchObject({ ...cleared, search: 'Alice' });
    for (const label of ['Branch', 'Sport', 'Court', 'Status', 'Source']) {
      const select = harness.routeNativeElement!.querySelector<HTMLSelectElement>(
        `select[aria-label="${label}"]`,
      )!;
      expect(select.value).toBe('');
      expect(select.selectedIndex).toBe(0);
    }
    await page.apply();
    const applied = list();
    for (const key of Object.keys(cleared)) expect(applied.request.params.has(key)).toBe(false);
    expect(applied.request.params.get('search')).toBe('Alice');
    applied.flush(report);
  });

  it.each(['branchPublicId', 'sportPublicId'] as const)(
    'clears a court whose loaded %s does not match the selection',
    async (key) => {
      const harness = await RouterTestingHarness.create();
      const page = await harness.navigateByUrl(url, Bookings);
      http.expectOne((req) => req.url.endsWith('/staff/bookings')).flush(report);
      page.form.patchValue({ branchPublicId: id, sportPublicId: id, courtPublicId: id });
      filters().flush({
        ...options,
        courts: [{ ...options.courts[0], [key]: '22222222-2222-2222-2222-222222222222' }],
      });
      expect(page.form.controls.courtPublicId.value).toBe('');
      await page.apply();
      const applied = list();
      expect(applied.request.params.has('courtPublicId')).toBe(false);
      expect(applied.request.params.get(key)).toBe(id);
      applied.flush(report);
    },
  );

  it('focuses details on open and restores focus on Close, Escape and list navigation', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, Bookings);
    list().flush(report);
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    const buttons = root.querySelectorAll<HTMLButtonElement>('button.view');

    buttons[0].focus();
    buttons[0].click();
    harness.detectChanges();
    expect(document.activeElement).toBe(root.querySelector('#detail-heading'));
    detail('INTERNAL').flush(details(customer));
    harness.detectChanges();
    root.querySelector<HTMLButtonElement>('button[aria-label="Close booking details"]')!.click();
    harness.detectChanges();
    expect(root.querySelector('#booking-detail')).toBeNull();
    expect(document.activeElement).toBe(buttons[0]);

    buttons[1].focus();
    buttons[1].click();
    detail('EXTERNAL').flush(details(external));
    harness.detectChanges();
    expect(document.activeElement).toBe(root.querySelector('#detail-heading'));
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    harness.detectChanges();
    expect(root.querySelector('#booking-detail')).toBeNull();
    expect(document.activeElement).toBe(buttons[1]);

    buttons[0].click();
    detail('INTERNAL').flush(details(customer));
    harness.detectChanges();
    expect(document.activeElement).toBe(root.querySelector('#detail-heading'));
    await page.setPage(2);
    harness.detectChanges();
    expect(buttons[0].isConnected).toBe(false);
    expect(document.activeElement).toBe(root.querySelector('#list-heading'));
    list().flush(report);
  });

  it('cancels stale requests and recovers through Apply and reopening details', async () => {
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
    page.openDetails(customer);
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
    expect(harness.routeNativeElement!.textContent).toContain('Apply filters to try again');
    await page.apply();
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
      await page.apply();
      list().flush({}, { status, statusText: 'Error' });
      harness.detectChanges();
      expect(harness.routeNativeElement!.textContent).toContain(text);
      expect(harness.routeNativeElement!.querySelector('tbody')).toBeNull();
    }
    await page.apply();
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

  it('loads options once and preserves them when a list request fails', async () => {
    const loadedOptions = { ...options, bookingTypes: ['EXTERNAL'] };
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, Bookings);
    const initialOptions = filters();
    expect(initialOptions.request.params.keys()).toEqual([]);
    initialOptions.flush(loadedOptions);
    list().flush(report);
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    expect(root.querySelector('select[aria-label="Source"] option[value="INTERNAL"]')).toBeNull();
    expect(
      root.querySelector('select[aria-label="Source"] option[value="EXTERNAL"]')?.textContent,
    ).toBe('External');
    expect(
      root.querySelector('select[aria-label="Status"] option[value="PENDING"]')?.textContent,
    ).toBe('Pending');
    await page.apply();
    http.expectNone((req) => req.url.endsWith('/staff/booking-filters'));
    http
      .expectOne((req) => req.url.endsWith('/staff/bookings'))
      .flush({}, { status: 500, statusText: 'Error' });
    expect(page.options()).toEqual(loadedOptions);
    expect(page.optionsError()).toBe('');
    await page.apply();
    http.expectOne((req) => req.url.endsWith('/staff/bookings')).flush(report);
    expect(page.report()).toEqual(report);
    expect(page.options()).toEqual(loadedOptions);
    http.expectNone((req) => req.url.endsWith('/staff/booking-filters'));
  });

  it('cancels options, list and detail requests on destruction', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, Bookings);
    const pendingOptions = filters();
    const pendingData = http.expectOne((req) => req.url.endsWith('/staff/bookings'));
    page.openDetails(external);
    const pendingDetail = detail('EXTERNAL');
    harness.fixture.destroy();
    expect(pendingOptions.cancelled).toBe(true);
    expect(pendingData.cancelled).toBe(true);
    expect(pendingDetail.cancelled).toBe(true);
    page.openDetails(customer);
    http.expectNone((req) => req.url.includes('/staff/'));
  });
});
