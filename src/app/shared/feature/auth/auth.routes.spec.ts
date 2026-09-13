import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AUTH_API_URLS } from '../../../core/urls';
import { authRoutes } from './auth.routes';

describe('authRoutes', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(authRoutes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders anonymous registration at the canonical route', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/register');
    expect(harness.routeNativeElement?.querySelector('app-register-user-page')).not.toBeNull();
    http.expectNone(AUTH_API_URLS.register);
  });

  it('redirects the legacy registration URL to the canonical route', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/users/register');
    expect(TestBed.inject(Router).url).toBe('/register');
    expect(harness.routeNativeElement?.querySelector('app-register-user-page')).not.toBeNull();
    http.expectNone(AUTH_API_URLS.register);
  });
});
