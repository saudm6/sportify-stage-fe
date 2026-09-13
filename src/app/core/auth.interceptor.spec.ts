import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('Authenticated API requests', () => {
  const api = 'http://localhost:5210/api';
  const token = (id = 1, exp = Date.now() / 1000 + 300) =>
    `e30.${btoa(JSON.stringify({ exp, jti: id, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'USER' }))}.signature`;
  let http: HttpClient;
  let requests: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    auth.acceptLogin({ hasAuthority: true, token: token() });
  });
  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.useRealTimers();
  });

  it.each(['request', 'late 401'])('redirects once when %s discovers expiry before the timer runs', (trigger) => {
    vi.useFakeTimers();
    auth.acceptLogin({ hasAuthority: true, token: token(1, Date.now() / 1000 + 1) });
    if (trigger === 'request') vi.setSystemTime(Date.now() + 1001);
    http.get(`${api}/product`).subscribe({ error: () => {} });
    const request = requests.expectOne(`${api}/product`);
    expect(request.request.headers.has('Authorization')).toBe(trigger === 'late 401');
    if (trigger === 'late 401') vi.setSystemTime(Date.now() + 1001);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.session()).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    vi.runOnlyPendingTimers();
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
  });

  it('attaches a valid token only to protected requests on the API origin', () => {
    for (const url of [`${api}/product`, `${api}/account/login?x=1`, `${api}/account/register/`,
      'https://external.test/api/product', 'http://localhost.evil.test:5210/api/product',
      `${api}-other/product`, `${api}/../assets/icon.svg`, '/assets/icon.svg']) {
      http.get(url).subscribe();
      const request = requests.expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe(url === `${api}/product` ? `Bearer ${auth.getToken()}` : null);
      request.flush({});
    }
    localStorage.setItem('authToken', token(1, 1));
    http.get(`${api}/product`).subscribe();
    const expired = requests.expectOne(`${api}/product`);
    expect(expired.request.headers.has('Authorization')).toBe(false);
    expired.flush({});
    expect(auth.session()).toBeNull();
  });

  it('clears the current session on 401, but retains it on 403 and network failure', () => {
    for (const status of [403, 0, 401]) {
      http.get(`${api}/product`).subscribe({ error: () => {} });
      const request = requests.expectOne(`${api}/product`);
      if (status === 0) request.error(new ProgressEvent('error'));
      else request.flush({}, { status, statusText: 'Denied' });
      expect(auth.session() !== null).toBe(status !== 401);
    }
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
  });

  it('does not let an old request or anonymous login 401 clear a new session', () => {
    http.get(`${api}/product`).subscribe({ error: () => {} });
    const old = requests.expectOne(`${api}/product`);
    const newToken = token(2);
    auth.acceptLogin({ hasAuthority: true, token: newToken });
    old.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.post(`${api}/account/login`, {}).subscribe({ error: () => {} });
    requests.expectOne(`${api}/account/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.getToken()).toBe(newToken);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
