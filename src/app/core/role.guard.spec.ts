import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

@Component({ template: '' })
class Page {}

const token = (roles: unknown, exp = Date.now() / 1000 + 300) =>
  `e30.${btoa(JSON.stringify({ exp, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles }))}.signature`;

describe('Role guard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'login', component: Page },
      { path: 'product', component: Page, canActivate: [roleGuard], data: { allowedRoles: ['USER'] } },
      { path: 'staff', canActivate: [roleGuard], canActivateChild: [roleGuard], data: { allowedRoles: ['ADMIN', 'FINANCE', 'SUPERVISOR'] }, children: [
        { path: 'dashboard', component: Page },
        { path: 'restricted', component: Page, data: { allowedRoles: ['USER'] } },
      ] },
      { path: 'unconfigured', component: Page, canActivate: [roleGuard] },
    ])] });
  });
  afterEach(() => localStorage.clear());

  it('rejects malformed role arrays and unsupported-only sessions', () => {
    const auth = TestBed.inject(AuthService);
    for (const roles of [['ADMIN', 7], 'MANAGER']) {
      localStorage.setItem('authToken', token(roles));
      expect(auth.hasAnyRole(['ADMIN', 'MANAGER'])).toBe(false);
    }
  });

  it('sends signed-out, expired and malformed sessions to plain login', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    for (const value of ['', 'invalid', token('ADMIN', 1)]) {
      localStorage.setItem('authToken', value);
      await harness.navigateByUrl('/staff/dashboard?from=2026-09-01#report');
      expect(router.url).toBe('/login');
      expect(localStorage.getItem('authToken')).toBeNull();
    }
  });

  it.each(['FINANCE', 'SUPERVISOR'])('permits %s through staff area and child guards', async role => {
    localStorage.setItem('authToken', token(role));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/staff/dashboard');
    expect(TestBed.inject(Router).url).toBe('/staff/dashboard');
    await harness.navigateByUrl('/product');
    expect(TestBed.inject(Router).url).toBe('/staff/dashboard');
  });

  it('enforces area and child roles, then rechecks after logout', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    const auth = TestBed.inject(AuthService);
    localStorage.setItem('authToken', token('USER'));
    await harness.navigateByUrl('/staff/dashboard');
    expect(router.url).toBe('/product');
    localStorage.setItem('authToken', token('ADMIN'));
    await harness.navigateByUrl('/staff/dashboard');
    expect(router.url).toBe('/staff/dashboard');
    await harness.navigateByUrl('/staff/restricted');
    expect(router.url).toBe('/staff/dashboard');
    await harness.navigateByUrl('/product');
    expect(router.url).toBe('/staff/dashboard');
    localStorage.setItem('authToken', token(['USER', 'ADMIN']));
    await harness.navigateByUrl('/staff/restricted');
    expect(router.url).toBe('/staff/restricted');
    await harness.navigateByUrl('/product');
    expect(router.url).toBe('/product');
    await harness.navigateByUrl('/unconfigured');
    expect(router.url).toBe('/staff/dashboard');
    auth.logout();
    await harness.navigateByUrl('/product');
    expect(router.url).toBe('/login');
  });
});
