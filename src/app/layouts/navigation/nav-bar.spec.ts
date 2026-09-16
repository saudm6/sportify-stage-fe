import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NavBar } from './nav-bar';

@Component({ template: '' })
class Page {}

const token = (roles: string[]) =>
  `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 300, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles }))}.signature`;

describe('Account navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [NavBar], providers: [provideRouter([
      { path: 'login', component: Page }, { path: 'product', component: Page },
      { path: 'staff/dashboard', component: Page }, { path: 'account', component: Page },
    ])] });
  });
  afterEach(() => localStorage.clear());

  it.each(['USER', 'ADMIN', 'FINANCE', 'SUPERVISOR'])('offers My Account to %s', async role => {
    localStorage.setItem('authToken', token([role]));
    const fixture = TestBed.createComponent(NavBar);
    await fixture.whenStable();
    const menu = fixture.nativeElement.querySelector('details');
    expect(menu).not.toBeNull();
    menu.querySelector('summary').click();
    expect(menu.open).toBe(true);
    expect(menu.querySelector('a').getAttribute('href')).toBe('/account');
  });

  it.each(['ADMIN', 'FINANCE', 'SUPERVISOR'])('lets %s return from My Account to Dashboard', async role => {
    localStorage.setItem('authToken', token([role]));
    const fixture = TestBed.createComponent(NavBar);
    await TestBed.inject(Router).navigateByUrl('/account');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/staff/dashboard"]')).not.toBeNull();
  });

  it('hides protected links while signed out and updates immediately on sign-in/out', async () => {
    const fixture = TestBed.createComponent(NavBar);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    const auth = TestBed.inject(AuthService);
    auth.acceptLogin({ hasAuthority: true, token: token(['USER']) });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Products');
    expect(fixture.nativeElement.textContent).not.toContain('Dashboard');
    expect(fixture.nativeElement.textContent).not.toContain('Switch');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('shows area-specific links and switching only for dual-role accounts after refresh', async () => {
    localStorage.setItem('authToken', token(['ADMIN', 'USER']));
    const fixture = TestBed.createComponent(NavBar);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/staff/dashboard');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).toContain('Switch to legacy area');
    expect(fixture.nativeElement.textContent).not.toContain('Products');
    await router.navigateByUrl('/product');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Products');
    expect(fixture.nativeElement.textContent).toContain('Switch to staff area');
    TestBed.inject(AuthService).acceptLogin({ hasAuthority: true, token: token(['ADMIN']) });
    await router.navigateByUrl('/staff/dashboard');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.textContent).not.toContain('Switch');
  });
});
