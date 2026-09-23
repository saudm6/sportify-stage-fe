import { Component } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject, map } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Sidebar } from './sidebar';
import { vi } from 'vitest';

@Component({ template: '' })
class Page {}

const token = (roles: string[]) =>
  `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 300, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles }))}.signature`;

describe('Account navigation', () => {
  let mobile: BehaviorSubject<boolean>;
  beforeEach(async () => {
    mobile = new BehaviorSubject(false);
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Sidebar], providers: [
      { provide: BreakpointObserver, useValue: { observe: () => mobile.pipe(map(matches => ({ matches }))) } },
      provideRouter([
      { path: 'login', component: Page }, { path: 'register', component: Page },
      { path: '', data: { showSidebar: true }, children: [
        { path: 'product', component: Page }, { path: 'staff/dashboard', component: Page },
        { path: 'account', component: Page },
      ] },
    ])] });
    await TestBed.inject(Router).navigateByUrl('/account');
  });
  afterEach(() => localStorage.clear());

  it.each(['USER', 'ADMIN', 'FINANCE', 'SUPERVISOR'])('offers My Account to %s', async role => {
    localStorage.setItem('authToken', token([role]));
    const fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
    const menu = fixture.nativeElement.querySelector('details');
    expect(menu).not.toBeNull();
    menu.querySelector('summary').click();
    expect(menu.open).toBe(true);
    expect(menu.querySelector('a').getAttribute('href')).toBe('/account');
  });

  it.each(['ADMIN', 'FINANCE', 'SUPERVISOR'])('lets %s return from My Account to Dashboard', async role => {
    localStorage.setItem('authToken', token([role]));
    const fixture = TestBed.createComponent(Sidebar);
    await TestBed.inject(Router).navigateByUrl('/account');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/staff/dashboard"]')).not.toBeNull();
  });

  it('hides protected links while signed out and updates immediately on sign-in/out', async () => {
    const fixture = TestBed.createComponent(Sidebar);
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
    const fixture = TestBed.createComponent(Sidebar);
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
    const fixture = TestBed.createComponent(Sidebar);
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
    const fixture = TestBed.createComponent(Sidebar);
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

  function stubDialog(dialog: HTMLDialogElement) {
    // jsdom has no native dialog methods; real modality/focus is checked in the browser.
    dialog.showModal = vi.fn(() => { dialog.open = true; });
    dialog.close = vi.fn(() => {
      dialog.open = false;
      dialog.dispatchEvent(new Event('close'));
    });
  }

  it('keeps native dialog state in sync and dismisses after navigation, including the current page', async () => {
    localStorage.setItem('authToken', token(['USER']));
    mobile.next(true);
    const fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    stubDialog(dialog);
    const trigger = fixture.nativeElement.querySelector('.mobile-trigger') as HTMLButtonElement;
    expect(dialog.open).toBe(false);
    trigger.focus();
    trigger.click();
    await fixture.whenStable();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    dialog.close(); // The browser closes on Escape, then emits this close event.
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    for (const url of ['/product', '/product']) {
      trigger.click();
      await fixture.whenStable();
      await TestBed.inject(Router).navigateByUrl(url);
      await fixture.whenStable();
      expect(dialog.open).toBe(false);
      expect(document.activeElement).toBe(trigger);
    }
  });

  it('closes the dialog on desktop resize, session loss and component removal', async () => {
    localStorage.setItem('authToken', token(['USER']));
    mobile.next(true);
    const fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    stubDialog(dialog);
    fixture.nativeElement.querySelector('.mobile-trigger').click();
    mobile.next(false);
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(fixture.nativeElement.querySelector('[aria-label="Collapse sidebar"]')).not.toBeNull();
    mobile.next(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.mobile-trigger').click();
    localStorage.removeItem('authToken');
    TestBed.inject(AuthService).getToken();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(fixture.nativeElement.hidden).toBe(true);
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    TestBed.inject(AuthService).acceptLogin({ hasAuthority: true, token: token(['USER']) });
    await TestBed.inject(Router).navigateByUrl('/account');
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.mobile-trigger').click();
    expect(dialog.open).toBe(true);
    fixture.destroy();
    expect(dialog.open).toBe(false);
  });

  it('hides itself on public routes even with an active session', async () => {
    localStorage.setItem('authToken', token(['USER']));
    const fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
    expect(fixture.nativeElement.hidden).toBe(false);
    await TestBed.inject(Router).navigateByUrl('/register');
    await fixture.whenStable();
    expect(fixture.nativeElement.hidden).toBe(true);
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });
});
