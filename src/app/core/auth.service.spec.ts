import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';

const roleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const token = (roles: unknown = 'USER', exp: unknown = Date.now() / 1000 + 300) =>
  `e30.${btoa(JSON.stringify({ exp, [roleClaim]: roles }))}.signature`;

describe('Session and role home pages', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('restores supported roles from the token on refresh', () => {
    localStorage.setItem('authToken', token(['ADMIN', 'USER']));
    auth = TestBed.inject(AuthService);
    expect(auth.session()?.roles).toEqual(['ADMIN', 'USER']);
    expect(auth.hasAnyRole(['ADMIN'])).toBe(true);
    expect(router.serializeUrl(auth.destination())).toBe('/staff/dashboard');
  });

  it('clears malformed, expired, missing-expiry and unsupported stored tokens', () => {
    auth = TestBed.inject(AuthService);
    for (const value of ['invalid', token('USER', 0), token('USER', null), token('USER', '9999999999'),
      token('USER', 1e308), token(null), token(['ADMIN', 7]), token('MANAGER')]) {
      localStorage.setItem('authToken', value);
      expect(auth.getToken()).toBeNull();
      expect(auth.session()).toBeNull();
      expect(localStorage.getItem('authToken')).toBeNull();
    }
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('requires explicit authority and a usable token before creating a session', () => {
    auth = TestBed.inject(AuthService);
    for (const response of [{ hasAuthority: false, token: token() }, { hasAuthority: true, token: null },
      { hasAuthority: true, token: 'invalid' }, { hasAuthority: true, token: token('MANAGER') }]) {
      expect(auth.acceptLogin(response)).toBeTruthy();
      expect(auth.getToken()).toBeNull();
    }
    expect(auth.acceptLogin({ hasAuthority: true, token: token() })).toBeNull();
    expect(auth.session()?.roles).toEqual(['USER']);
  });

  it('does not disclose other areas when the account has no supported role', () => {
    auth = TestBed.inject(AuthService);
    expect(auth.acceptLogin({ hasAuthority: true, token: token('MANAGER') })).toBe('404 Not Found');
    expect(auth.getToken()).toBeNull();
  });

  it('returns false for role checks without a session', () => {
    auth = TestBed.inject(AuthService);
    expect(auth.hasAnyRole(['ADMIN'])).toBe(false);
  });

  it('expires visible state and routes back to login without another action', async () => {
    vi.useFakeTimers();
    auth = TestBed.inject(AuthService);
    auth.acceptLogin({ hasAuthority: true, token: token('ADMIN', Date.now() / 1000 + 1) });
    await vi.advanceTimersByTimeAsync(1001);
    expect(auth.session()).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
  });

  it('clears session immediately on sign out', () => {
    auth = TestBed.inject(AuthService);
    auth.acceptLogin({ hasAuthority: true, token: token() });
    auth.logout();
    expect(auth.session()).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('chooses login without a session and the role home page after login', () => {
    auth = TestBed.inject(AuthService);
    expect(router.serializeUrl(auth.destination())).toBe('/login');
    auth.acceptLogin({ hasAuthority: true, token: token() });
    expect(router.serializeUrl(auth.destination())).toBe('/product');
    auth.acceptLogin({ hasAuthority: true, token: token('ADMIN') });
    expect(router.serializeUrl(auth.destination())).toBe('/staff/dashboard');
    auth.acceptLogin({ hasAuthority: true, token: token(['USER', 'ADMIN']) });
    expect(router.serializeUrl(auth.destination())).toBe('/staff/dashboard');
  });
});
