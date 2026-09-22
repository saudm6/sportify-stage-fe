import { Component } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject, map } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AppLayout } from './app-layout';

@Component({ template: '' })
class Page {}

const token = (roles: string[]) =>
  `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 300, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles }))}.signature`;

describe('Account navigation', () => {
  let mobile: BehaviorSubject<boolean>;
  beforeEach(() => {
    mobile = new BehaviorSubject(false);
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [AppLayout], providers: [
      { provide: BreakpointObserver, useValue: { observe: () => mobile.pipe(map(matches => ({ matches }))) } },
      provideRouter([
      { path: 'login', component: Page }, { path: 'product', component: Page },
      { path: 'staff/dashboard', component: Page }, { path: 'account', component: Page },
    ])] });
  });
  afterEach(() => localStorage.clear());

  it.each(['USER', 'ADMIN', 'FINANCE', 'SUPERVISOR'])('offers My Account to %s', async role => {
    localStorage.setItem('authToken', token([role]));
    const fixture = TestBed.createComponent(AppLayout);
    await fixture.whenStable();
    const menu = fixture.nativeElement.querySelector('details');
    expect(menu).not.toBeNull();
    menu.querySelector('summary').click();
    expect(menu.open).toBe(true);
    expect(menu.querySelector('a').getAttribute('href')).toBe('/account');
  });

  it.each(['ADMIN', 'FINANCE', 'SUPERVISOR'])('lets %s return from My Account to Dashboard', async role => {
    localStorage.setItem('authToken', token([role]));
    const fixture = TestBed.createComponent(AppLayout);
    await TestBed.inject(Router).navigateByUrl('/account');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/staff/dashboard"]')).not.toBeNull();
  });

  it('hides protected links while signed out and updates immediately on sign-in/out', async () => {
    const fixture = TestBed.createComponent(AppLayout);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    const auth = TestBed.inject(AuthService);
    auth.acceptLogin({ hasAuthority: true, token: token(['USER']) });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Products');
    expect(fixture.nativeElement.textContent).not.toContain('Dashboard');
    expect(fixture.nativeElement.textContent).not.toContain('Switch');
    fixture.nativeElement.querySelector('[aria-label="Sign out"]').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('shows area-specific links and switching only for dual-role accounts after refresh', async () => {
    localStorage.setItem('authToken', token(['ADMIN', 'USER']));
    const fixture = TestBed.createComponent(AppLayout);
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

  it('initializes area context from the current URL and uses the authorized brand destination', async () => {
    localStorage.setItem('authToken', token(['ADMIN', 'USER']));
    await TestBed.inject(Router).navigateByUrl('/staff/dashboard');
    const fixture = TestBed.createComponent(AppLayout);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Switch to legacy area');
    expect(fixture.nativeElement.querySelector('.brand').getAttribute('href')).toBe('/staff/dashboard');
    TestBed.inject(AuthService).acceptLogin({ hasAuthority: true, token: token(['USER']) });
    await TestBed.inject(Router).navigateByUrl('/product');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.brand').getAttribute('href')).toBe('/product');
    for (const href of ['/product', '/users', '/order-line-item', '/order']) {
      expect(fixture.nativeElement.querySelector(`nav a[href="${href}"]`)).not.toBeNull();
    }
    expect(fixture.nativeElement.querySelector('nav a[href="/product"]').getAttribute('aria-current')).toBe('page');
  });

  it('collapses without changing the URL and closes Profile after selecting My Account', async () => {
    localStorage.setItem('authToken', token(['ADMIN']));
    const fixture = TestBed.createComponent(AppLayout);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/staff/dashboard?from=2026-09-01');
    await fixture.whenStable();
    const toggle = fixture.nativeElement.querySelector('[aria-controls="sidebar-navigation"]');
    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-label')).toBe('Expand sidebar');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(router.url).toBe('/staff/dashboard?from=2026-09-01');
    const menu = fixture.nativeElement.querySelector('details');
    menu.querySelector('summary').click();
    menu.querySelector('a').click();
    await fixture.whenStable();
    expect(menu.open).toBe(false);
    expect(router.url).toBe('/account');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('nav a[href="/staff/dashboard"]').length).toBe(1);
    expect(fixture.nativeElement.querySelector('nav a[href="/staff/bookings"]')).not.toBeNull();
  });

  it('defaults mobile closed, dismisses with Escape and returns focus after navigation', async () => {
    localStorage.setItem('authToken', token(['USER']));
    mobile.next(true);
    const fixture = TestBed.createComponent(AppLayout);
    await fixture.whenStable();
    const toggle = fixture.nativeElement.querySelector('[aria-controls="sidebar-navigation"]');
    const body = fixture.nativeElement.querySelector('#sidebar-navigation');
    expect(body.hidden).toBe(true);
    toggle.focus();
    toggle.click();
    await fixture.whenStable();
    expect(body.hidden).toBe(false);
    expect(fixture.nativeElement.querySelector('[aria-modal="true"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.content').inert).toBe(true);
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(body.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
    toggle.click();
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/account');
    await fixture.whenStable();
    expect(body.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
    expect(fixture.nativeElement.querySelector('.content').inert).toBe(false);
    toggle.click();
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/account');
    await fixture.whenStable();
    expect(body.hidden).toBe(true);
  });

  it('removes the open drawer and releases the page when the session is lost', async () => {
    localStorage.setItem('authToken', token(['USER']));
    mobile.next(true);
    const fixture = TestBed.createComponent(AppLayout);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[aria-controls]').click();
    await fixture.whenStable();
    localStorage.removeItem('authToken');
    TestBed.inject(AuthService).getToken();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    expect(fixture.nativeElement.querySelector('.backdrop')).toBeNull();
    expect(fixture.nativeElement.querySelector('.content').inert).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
