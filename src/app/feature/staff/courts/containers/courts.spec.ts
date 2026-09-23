import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { staffRoutes } from '../../staff.routes';

@Component({ template: '' })
class Landing {}

describe('Staff courts', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const id = '11111111-1111-1111-1111-111111111111';
  const branch = { publicId: id, nameEn: 'Seeb', nameAr: 'السيب' };
  const sport = {
    publicId: '22222222-2222-2222-2222-222222222222',
    nameEn: 'Padel',
    nameAr: 'بادل',
  };
  const court = {
    publicId: id,
    courtNameEn: 'Court one',
    courtNameAr: 'ملعب واحد',
    branch,
    sport,
    isIndoor: true,
    isActive: true,
  };
  const prices = [
    { durationMins: 60, price: 0 },
    { durationMins: 90, price: 12.345 },
    { durationMins: 120, price: 20 },
  ];
  const response = { items: [court], availableFilters: { branches: [branch], sports: [sport] } };
  const list = () =>
    http.expectOne((req) => req.url.endsWith('/staff/courts') && req.method === 'GET');
  const details = () =>
    http.expectOne((req) => req.url.endsWith(`/staff/courts/${id}`) && req.method === 'GET');
  const root = () => harness.routeNativeElement!;
  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
  const button = (name: string, host: ParentNode = root()) =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (el) => el.textContent?.trim() === name,
    )!;
  const input = (selector: string, value: string, host: ParentNode = dialog()) => {
    const el = host.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    el.value =
      el instanceof HTMLSelectElement
        ? [...el.options].find(
            (option) => option.value === value || option.value.endsWith(`: ${value}`),
          )!.value
        : value;
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    harness.detectChanges();
  };
  const settle = async () => {
    harness.detectChanges();
    TestBed.inject(MatDialog).openDialogs[0]?.componentRef?.changeDetectorRef.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  const open = async (edit = false) => {
    button(edit ? 'Edit' : 'Add court').click();
    await settle();
    if (edit) {
      details().flush({ ...court, prices: [...prices].reverse() });
      await settle();
    }
  };
  const fill = () => {
    input('[formControlName="courtNameEn"]', ' New court ');
    input('[formControlName="courtNameAr"]', ' ملعب جديد ');
    input('[formControlName="branchPublicId"]', id);
    input('[formControlName="sportPublicId"]', sport.publicId);
    for (const price of prices) input(`#price-${price.durationMins}`, String(price.price));
  };

  beforeEach(async () => {
    localStorage.setItem(
      'authToken',
      `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 600, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'ADMIN' }))}.test`,
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: {
            ...new MatDialogConfig(),
            enterAnimationDuration: 0,
            exitAnimationDuration: 0,
          },
        },
        provideRouter([
          { path: 'staff', children: staffRoutes },
          { path: 'login', component: Landing },
          { path: 'product', component: Landing },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    http.verify();
    localStorage.clear();
  });

  it('loads a staff court table and applies public IDs and false filters without extra controls', async () => {
    await harness.navigateByUrl('/staff/courts');
    list().flush(response);
    harness.detectChanges();
    expect(root().textContent).toContain('Court one');
    expect(root().textContent).toContain('Seeb');
    expect(root().querySelector('input[type="search"]')).toBeNull();
    input('[formControlName="branchPublicId"]', id, root());
    input('[formControlName="sportPublicId"]', sport.publicId, root());
    input('[formControlName="isIndoor"]', 'false', root());
    input('[formControlName="isActive"]', 'false', root());
    button('Apply filters').click();
    const request = list();
    expect(request.request.params.keys().sort()).toEqual([
      'branchPublicId',
      'isActive',
      'isIndoor',
      'sportPublicId',
    ]);
    expect(request.request.params.get('branchPublicId')).toBe(id);
    expect(request.request.params.get('sportPublicId')).toBe(sport.publicId);
    expect(request.request.params.get('isIndoor')).toBe('false');
    expect(request.request.params.get('isActive')).toBe('false');
    request.flush({ ...response, items: [] });
    harness.detectChanges();
    expect(root().textContent).toContain('No courts match');
    button('Reset').click();
    const reset = list();
    expect(reset.request.params.keys()).toEqual([]);
    reset.flush(response);
  });

  it('creates with exactly three prices and refreshes the applied filters', async () => {
    await harness.navigateByUrl('/staff/courts');
    list().flush(response);
    harness.detectChanges();
    input('[formControlName="isActive"]', 'false', root());
    button('Apply filters').click();
    list().flush(response);
    harness.detectChanges();
    await open();
    fill();
    button('Add court', dialog()).click();
    const save = http.expectOne((req) => req.method === 'POST');
    expect(save.request.body).toEqual({
      courtNameEn: 'New court',
      courtNameAr: 'ملعب جديد',
      branchPublicId: id,
      sportPublicId: sport.publicId,
      isIndoor: true,
      prices,
    });
    button('Add court', dialog()).click();
    http.expectNone((req) => req.method === 'POST');
    save.flush({ ...court, prices });
    await settle();
    const refresh = list();
    expect(refresh.request.params.get('isActive')).toBe('false');
    refresh.flush(response);
    await settle();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect((root().querySelector('[formControlName="isActive"]') as HTMLSelectElement).value).toBe(
      'false',
    );
  });

  it('fetches fresh details, maps prices by duration and never puts branch into an edit payload', async () => {
    await harness.navigateByUrl('/staff/courts');
    list().flush(response);
    harness.detectChanges();
    await open(true);
    expect(dialog().querySelector('app-courtpopup app-popup')).not.toBeNull();
    expect(dialog().querySelector<HTMLInputElement>('input[readonly]')?.value).toBe('Seeb');
    expect(dialog().querySelector('select[formControlName="branchPublicId"]')).toBeNull();
    for (const price of prices)
      expect(
        (dialog().querySelector(`#price-${price.durationMins}`) as HTMLInputElement).value,
      ).toBe(String(price.price));
    input('[formControlName="isActive"]', 'false');
    button('Save changes', dialog()).click();
    const save = http.expectOne((req) => req.method === 'PUT');
    expect(save.request.url).toContain(`/courts/${id}`);
    expect(save.request.body).toEqual({
      courtNameEn: court.courtNameEn,
      courtNameAr: court.courtNameAr,
      sportPublicId: sport.publicId,
      isIndoor: true,
      isActive: false,
      prices,
    });
    save.flush({ ...court, prices, isActive: false });
    await settle();
    list().flush(response);
    expect(document.activeElement).toBe(button('Add court'));
  });

  it('rejects blank names and missing, negative, over-precision or overflowing prices', async () => {
    await harness.navigateByUrl('/staff/courts');
    list().flush(response);
    harness.detectChanges();
    await open();
    fill();
    for (const value of ['', '-1', '1.2345', '10000000']) {
      input('#price-90', value);
      button('Add court', dialog()).click();
      await settle();
      http.expectNone((req) => req.method === 'POST');
      expect(dialog().textContent).toContain('three decimal places');
    }
    input('#price-90', '12.345');
    input('[formControlName="courtNameEn"]', '   ');
    button('Add court', dialog()).click();
    http.expectNone((req) => req.method === 'POST');
  });

  it.each([400, 404, 409, 0])(
    'keeps edits after a %s save failure and allows correction',
    async (status) => {
      await harness.navigateByUrl('/staff/courts');
      list().flush(response);
      harness.detectChanges();
      await open(true);
      input('[formControlName="courtNameEn"]', 'Keep my edit');
      button('Save changes', dialog()).click();
      const save = http.expectOne((req) => req.method === 'PUT');
      if (status === 0) save.error(new ProgressEvent('error'));
      else
        save.flush(
          status === 400
            ? { errors: { CourtNameEn: ['Choose another court name.'] } }
            : {
                detail:
                  status === 409
                    ? 'The sport cannot be changed after bookings exist for the court.'
                    : 'Court was not found.',
              },
          { status, statusText: 'Error' },
        );
      await settle();
      expect(
        (dialog().querySelector('[formControlName="courtNameEn"]') as HTMLInputElement).value,
      ).toBe('Keep my edit');
      expect(dialog().querySelector('[role="alert"]')?.textContent?.trim()).toBeTruthy();
      if (status === 400) expect(dialog().textContent).toContain('Choose another court name.');
      if (status === 409) expect(dialog().textContent).toContain('sport cannot be changed');
      expect(button('Save changes', dialog()).disabled).toBe(false);
      button('Save changes', dialog()).click();
      http.expectOne((req) => req.method === 'PUT').flush({ ...court, prices });
      await settle();
      list().flush(response);
    },
  );

  it('blocks editing when details fail and loads them again when reopened', async () => {
    await harness.navigateByUrl('/staff/courts');
    list().flush(response);
    harness.detectChanges();
    button('Edit').click();
    await settle();
    details().flush({}, { status: 404, statusText: 'Not found' });
    await settle();
    expect(dialog().querySelector('form')).toBeNull();
    expect(dialog().textContent).toContain('no longer available');
    button('Cancel', dialog()).click();
    await settle();
    await open(true);
    expect(dialog().querySelector('form')).not.toBeNull();
  });

  it('shows list errors and cancels obsolete requests when applying filters again', async () => {
    await harness.navigateByUrl('/staff/courts');
    list().flush({}, { status: 403, statusText: 'Forbidden' });
    harness.detectChanges();
    expect(root().textContent).toContain('permission');
    button('Apply filters').click();
    const pending = list();
    button('Apply filters').click();
    expect(pending.cancelled).toBe(true);
    list().flush(response);
  });

  it.each(['USER', 'signed-out'])('blocks %s before requesting courts', async (role) => {
    if (role === 'signed-out') localStorage.clear();
    else
      localStorage.setItem(
        'authToken',
        `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 600, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': role }))}.test`,
      );
    await harness.navigateByUrl('/staff/courts');
    expect(TestBed.inject(Router).url).toBe(role === 'USER' ? '/product' : '/login');
    http.expectNone((req) => req.url.includes('/staff/courts'));
  });
});
