import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the route outlet without protected navigation when signed out', async () => {
    localStorage.removeItem('authToken');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('nav')).toBeNull();
    expect(compiled.querySelector('app-nav-bar')).toBeNull();
  });
});
describe('Shared application routing', () => {
  beforeEach(() => {
    localStorage.setItem('authToken', `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 300,
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['ADMIN', 'USER'] }))}.signature`);
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => localStorage.clear());

  it('keeps one sidebar and its collapsed state across staff, account and every legacy page', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/staff/dashboard');
    await fixture.whenStable();
    const shell = fixture.nativeElement as HTMLElement;
    const sidebar = shell.querySelector('app-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar!.querySelector('router-outlet')).toBeNull();
    expect(shell.querySelectorAll('aside').length).toBe(1);
    shell.querySelector<HTMLButtonElement>('[aria-label="Collapse sidebar"]')!.click();
    fixture.detectChanges();
    for (const path of ['/account', '/product', '/product/add', '/users', '/order-line-item', '/order', '/staff/bookings']) {
      await router.navigateByUrl(path);
      await fixture.whenStable();
      expect(shell.querySelector('app-sidebar')).toBe(sidebar);
      expect(shell.querySelectorAll('aside').length).toBe(1);
      expect(shell.querySelector('[aria-label="Expand sidebar"]')).not.toBeNull();
    }
  });

  it('keeps account edits and the URL intact when toggling the sidebar', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/account?publicId=ignored');
    TestBed.inject(HttpTestingController).expectOne(req => req.url.endsWith('/users/me')).flush({
      publicId: 'me', name: 'Original', email: 'user@example.com', contactNumber: '', roles: [],
    });
    fixture.detectChanges();
    const shell = fixture.nativeElement as HTMLElement;
    const input = shell.querySelector<HTMLInputElement>('input')!;
    input.value = 'Unsaved name';
    input.dispatchEvent(new Event('input'));
    shell.querySelector<HTMLButtonElement>('[aria-label="Collapse sidebar"]')!.click();
    fixture.detectChanges();
    shell.querySelector<HTMLButtonElement>('[aria-label="Expand sidebar"]')!.click();
    fixture.detectChanges();
    expect(shell.querySelector('input')).toBe(input);
    expect(input.value).toBe('Unsaved name');
    expect(TestBed.inject(Router).url).toBe('/account?publicId=ignored');
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps login, registration and redirects outside the authenticated shell', async () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    for (const path of ['/login', '/register', '/users/register', '/', '/missing']) {
      await TestBed.inject(Router).navigateByUrl(path);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('aside')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-sidebar').hidden).toBe(true);
    }
  });

  it('renders protected pages when the sidebar element is removed from the root template', async () => {
    TestBed.overrideComponent(App, { set: { template: '<div class="content"><router-outlet /></div>' } });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/account');
    TestBed.inject(HttpTestingController).expectOne(req => req.url.endsWith('/users/me')).flush({
      publicId: 'me', name: 'Original', email: 'user@example.com', contactNumber: '', roles: [],
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('My Account');
    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    expect(fixture.nativeElement.querySelector('.content').inert).not.toBe(true);
    TestBed.inject(HttpTestingController).verify();
  });
});
