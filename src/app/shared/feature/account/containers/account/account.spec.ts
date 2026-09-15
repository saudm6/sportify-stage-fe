import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../../../core/urls';
import { Account } from './account';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../../app.routes';
import { authInterceptor } from '../../../../../core/auth.interceptor';

const url = `${API_BASE_URL}/users/me`;
const profile = { publicId: 'dcb4da6e-cac9-48aa-b383-28f3a64c2ba1',
  name: 'Test User', email: 'one@example.com', contactNumber: '+96890000001',
  roles: [{ roleName: 'USER', isActive: true }] };

describe('My Account', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Account],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function loaded() {
    const fixture = TestBed.createComponent(Account);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush(profile);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http };
  }

  it('shows required, length and email errors without sending invalid input', () => {
    const { page, http, fixture } = loaded();
    page.form.setValue({ name: '  ', email: 'invalid', contactNumber: 'x'.repeat(31) });
    page.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Name is required.');
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
    expect(fixture.nativeElement.textContent).toContain('30 characters');
    page.form.controls.name.setValue('x'.repeat(151));
    page.form.controls.email.setValue('x'.repeat(256));
    expect(page.form.controls.name.hasError('maxlength')).toBe(true);
    expect(page.form.controls.email.hasError('maxlength')).toBe(true);
    http.expectNone(url);
  });

  it.each([
    [400, { errors: { Name: ['Choose another name.'] } }, 'name', 'Choose another name.'],
    [409, { detail: 'A user with this email already exists.' }, 'email', 'A user with this email already exists.'],
    [409, { detail: 'A user with this contact number already exists.' }, 'contactNumber', 'A user with this contact number already exists.'],
  ] as const)('maps %s field errors and clears them on correction', (status, body, field, message) => {
    const { page, http, fixture } = loaded();
    page.save();
    http.expectOne(url).flush(body, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(page.form.controls[field].getError('server')).toBe(message);
    expect(fixture.nativeElement.textContent).toContain(message);
    page.form.controls[field].setValue(field === 'email' ? 'changed@example.com' : 'Changed');
    expect(page.form.controls[field].hasError('server')).toBe(false);
    expect(page.form.valid).toBe(true);
  });

  it.each([{}, { errors: { Unexpected: ['Do not expose this.'] } }, { errors: { Name: [42] } }])(
    'uses safe fallback for unknown validation payloads', body => {
      const { page, http } = loaded();
      page.save();
      http.expectOne(url).flush(body, { status: 400, statusText: 'Bad Request' });
      expect(page.error()).toBe('Unable to save your account. Please try again.');
      expect(page.form.getRawValue().name).toBe(profile.name);
    });

  it.each([401, 403, 404])('keeps failed edits read-only after %s', status => {
    const { page, http, fixture } = loaded();
    page.form.controls.name.setValue('Unsaved');
    page.save();
    http.expectOne(url).flush({}, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(page.form.controls.name.value).toBe('Unsaved');
    expect(page.unavailable()).toBe(true);
    expect(fixture.nativeElement.querySelector('input').readOnly).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    page.save();
    http.expectNone(url);
  });

  it('retries a failed load and keeps roles read-only', () => {
    const fixture = TestBed.createComponent(Account);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    fixture.nativeElement.querySelector('button').click();
    http.expectOne(url).flush({ ...profile, roles: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No roles assigned.');
    expect(fixture.nativeElement.querySelectorAll('input').length).toBe(3);
    expect(fixture.nativeElement.textContent).not.toContain(profile.publicId);
  });

  it('preserves edits on network failure, blocks Cancel while pending and cancels on destroy', () => {
    const { page, http, fixture } = loaded();
    page.form.controls.name.setValue('Unsaved');
    page.save();
    const request = http.expectOne(url);
    page.cancel();
    fixture.detectChanges();
    expect(page.form.controls.name.value).toBe('Unsaved');
    expect(fixture.nativeElement.querySelector('input').readOnly).toBe(true);
    request.error(new ProgressEvent('error'));
    expect(page.form.controls.name.value).toBe('Unsaved');
    expect(page.saving()).toBe(false);
    page.save();
    const pending = http.expectOne(url);
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });

  it('treats an empty profile as missing instead of a successful save', () => {
    const { page, http, fixture } = loaded();
    page.form.controls.name.setValue('Unsaved');
    page.save();
    http.expectOne(url).flush(null);
    expect(page.unavailable()).toBe(true);
    expect(page.success()).toBe('');
    expect(page.form.controls.name.value).toBe('Unsaved');
    fixture.destroy();
  });

  it('keeps failed edits and cancels to the latest server-confirmed values', () => {
    const fixture = TestBed.createComponent(Account);
    const page = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const url = `${API_BASE_URL}/users/me`;
    const original = {
      publicId: 'dcb4da6e-cac9-48aa-b383-28f3a64c2ba1',
      name: 'Test User', contactNumber: '+96890000001', email: 'one@example.com',
      roles: [{ roleName: 'USER', isActive: true }],
    };
    fixture.detectChanges();
    http.expectOne(url).flush(original);
    page.form.controls.name.setValue('Edited User');
    page.save();
    const failed = http.expectOne(url);
    expect(failed.request.method).toBe('PATCH');
    expect(Object.keys(failed.request.body).sort()).toEqual(['contactNumber', 'email', 'name']);
    page.save();
    http.expectNone(url); // The first request is already matched; no second submission.
    failed.flush({}, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.name.value).toBe('Edited User');
    expect(page.saving()).toBe(false);
    page.cancel();
    expect(page.form.controls.name.value).toBe('Test User');
    page.form.controls.name.setValue(' Saved User ');
    page.save();
    http.expectOne(url).flush({ ...original, name: 'Saved User' });
    expect(page.success()).toBe('Account updated successfully.');
    page.form.controls.name.setValue('Unsaved');
    page.cancel();
    expect(page.form.controls.name.value).toBe('Saved User');
    expect(page.form.pristine).toBe(true);
    expect(page.form.untouched).toBe(true);
    fixture.destroy();
  });
});

describe('Account route and session', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it.each(['USER', 'ADMIN', 'FINANCE', 'SUPERVISOR', ['ADMIN', 'USER']])(
    'restores %s and ignores editable identity parameters', async roles => {
      const token = `e30.${btoa(JSON.stringify({ sub: profile.publicId, exp: Date.now() / 1000 + 300,
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles }))}.signature`;
      localStorage.setItem('authToken', token);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/account?publicId=someone-else');
      const http = TestBed.inject(HttpTestingController);
      const request = http.expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      request.flush(profile);
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('My Account');
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
      http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/login');
      expect(localStorage.getItem('authToken')).toBeNull();
    });

  it('redirects anonymous visits without loading a profile', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/account');
    expect(TestBed.inject(Router).url).toBe('/login');
    TestBed.inject(HttpTestingController).expectNone(url);
  });
});
