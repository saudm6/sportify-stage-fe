import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../../../core/auth.service';
import { LoginUserList } from './login-user-list';

@Component({ template: '' })
class DestinationPage {}

describe('LoginUserList', () => {
  let fixture: ComponentFixture<LoginUserList>;
  let component: LoginUserList;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginUserList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'product', component: DestinationPage },
          { path: 'order', component: DestinationPage },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/order' }) },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginUserList);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    component.userForm.setValue({ email: 'user@example.com', password: 'password' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it.each([
    [{ hasAuthority: false, token: null }, 'Invalid email or password.'],
    [
      { hasAuthority: true, token: 'malformed' },
      'The sign-in service returned an invalid session. Please try again.',
    ],
  ])('shows rejected login responses', (response, message) => {
    component.loginUser();
    http.expectOne('http://localhost:5210/api/account/login').flush(response);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
  });

  it.each([
    [401, 'Invalid email or password.'],
    [503, 'The server is unavailable. Please try again.'],
  ])('maps HTTP status %i to a useful error', (status, message) => {
    component.loginUser();
    http
      .expectOne('http://localhost:5210/api/account/login')
      .flush({}, { status, statusText: 'Failed' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
  });

  it('maps a network failure to the unavailable message', () => {
    component.loginUser();
    http.expectOne('http://localhost:5210/api/account/login').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'The server is unavailable. Please try again.',
    );
  });

  it('prevents duplicate submissions while a request is active', () => {
    component.loginUser();
    component.loginUser();
    const requests = http.match('http://localhost:5210/api/account/login');
    expect(requests).toHaveLength(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('true');
    requests[0].flush({ hasAuthority: false, token: null });
  });

  it('opens the role home page even when an old returnUrl is supplied', async () => {
    component.loginUser();
    http.expectOne('http://localhost:5210/api/account/login').flush({
      hasAuthority: true,
      token: tokenFor('USER'),
    });
    await fixture.whenStable();
    expect(TestBed.inject(AuthService).getToken()).not.toBeNull();
    expect(TestBed.inject(Router).url).toBe('/product');
  });

  it('cancels the login request when destroyed', () => {
    component.loginUser();
    const request = http.expectOne('http://localhost:5210/api/account/login');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});

function tokenFor(role: string): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': role,
  };
  return `e30.${btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}.signature`;
}
