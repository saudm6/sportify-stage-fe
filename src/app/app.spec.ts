import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
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
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the route outlet without protected navigation when signed out', async () => {
    localStorage.removeItem('authToken');
    const fixture = TestBed.createComponent(App);
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
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => localStorage.clear());

  it('keeps one sidebar and its collapsed state across staff, account and every legacy page', async () => {
    const harness = await RouterTestingHarness.create('/staff/dashboard');
    const shell = harness.routeNativeElement!;
    expect(shell.tagName.toLowerCase()).toBe('app-layout');
    expect(shell.querySelectorAll('aside').length).toBe(1);
    shell.querySelector<HTMLButtonElement>('[aria-label="Collapse sidebar"]')!.click();
    harness.detectChanges();
    for (const path of ['/account', '/product', '/product/add', '/users', '/order-line-item', '/order', '/staff/bookings']) {
      await harness.navigateByUrl(path);
      expect(harness.routeNativeElement).toBe(shell);
      expect(shell.querySelectorAll('aside').length).toBe(1);
      expect(shell.querySelector('[aria-label="Expand sidebar"]')).not.toBeNull();
    }
  });

  it('keeps account edits and the URL intact when toggling the sidebar', async () => {
    const harness = await RouterTestingHarness.create('/account?publicId=ignored');
    TestBed.inject(HttpTestingController).expectOne(req => req.url.endsWith('/users/me')).flush({
      publicId: 'me', name: 'Original', email: 'user@example.com', contactNumber: '', roles: [],
    });
    harness.detectChanges();
    const shell = harness.routeNativeElement!;
    const input = shell.querySelector<HTMLInputElement>('input')!;
    input.value = 'Unsaved name';
    input.dispatchEvent(new Event('input'));
    shell.querySelector<HTMLButtonElement>('[aria-label="Collapse sidebar"]')!.click();
    harness.detectChanges();
    shell.querySelector<HTMLButtonElement>('[aria-label="Expand sidebar"]')!.click();
    harness.detectChanges();
    expect(shell.querySelector('input')).toBe(input);
    expect(input.value).toBe('Unsaved name');
    expect(TestBed.inject(Router).url).toBe('/account?publicId=ignored');
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps login, registration and redirects outside the authenticated shell', async () => {
    localStorage.clear();
    const harness = await RouterTestingHarness.create();
    for (const path of ['/login', '/register', '/users/register', '/', '/missing']) {
      await harness.navigateByUrl(path);
      expect(harness.routeNativeElement?.tagName.toLowerCase()).not.toBe('app-layout');
      expect(harness.routeNativeElement?.querySelector('aside')).toBeNull();
    }
  });
});
