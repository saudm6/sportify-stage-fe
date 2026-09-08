import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { hasAnyRole, roleGuard } from './role.guard';

@Component({ template: '' })
class Page {}

describe('Role guard', () => {
  const token = (roles: unknown, exp = Date.now() / 1000 + 300) =>
    `e30.${btoa(JSON.stringify({ exp, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles }))}.signature`;

  afterEach(() => localStorage.removeItem('authToken'));

  it('accepts any configured role as a string or multi-role array', () => {
    expect(hasAnyRole(['ADMIN'], token('ADMIN'))).toBe(true);
    expect(hasAnyRole(['ADMIN'], token(['USER', 'ADMIN']))).toBe(true);
    expect(hasAnyRole(['USER', 'ADMIN'], token('USER'))).toBe(true);
    expect(hasAnyRole(['MANAGER'], token('MANAGER'))).toBe(true);
  });

  it('rejects disallowed roles, missing roles, expired and malformed tokens', () => {
    for (const value of [null, 'invalid', token('USER'), token(undefined), token('ADMIN', 1)]) {
      expect(hasAnyRole(['ADMIN'], value)).toBe(false);
    }
    expect(hasAnyRole([], token('ADMIN'))).toBe(false);
  });

  it('enforces section and child roles on direct visits and subsequent navigation', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'login', component: Page },
      { path: 'staff', canActivate: [roleGuard], canActivateChild: [roleGuard], data: { allowedRoles: ['ADMIN', 'MANAGER'] }, children: [
        { path: 'dashboard', component: Page },
        { path: 'restricted', component: Page, data: { allowedRoles: ['ADMIN'] } },
      ] },
      { path: 'unconfigured', component: Page, canActivate: [roleGuard] },
    ])] });
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    localStorage.setItem('authToken', token('MANAGER'));
    await harness.navigateByUrl('/staff/dashboard');
    expect(router.url).toBe('/staff/dashboard');
    await harness.navigateByUrl('/staff/restricted');
    expect(router.url).toBe('/login');
    localStorage.setItem('authToken', token('ADMIN'));
    await harness.navigateByUrl('/staff/restricted');
    expect(router.url).toBe('/staff/restricted');
    localStorage.setItem('authToken', token('USER'));
    await harness.navigateByUrl('/staff/dashboard');
    expect(router.url).toBe('/login');
    await harness.navigateByUrl('/unconfigured');
    expect(router.url).toBe('/login');
  });
});
