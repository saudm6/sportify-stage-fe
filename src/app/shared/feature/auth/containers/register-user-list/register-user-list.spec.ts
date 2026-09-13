import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormGroup } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { AUTH_API_URLS } from '../../../../../core/urls';
import { RegisterUserList } from './register-user-list';

@Component({ template: '' })
class LoginDestination {}

describe('RegisterUserList', () => {
  let fixture: ComponentFixture<RegisterUserList>;
  let component: RegisterUserList;
  let http: HttpTestingController;
  let form: FormGroup;
  const values = {
    name: ' Test Customer ',
    contactNumber: ' +96800123456 ',
    email: 'test@example.com',
    password: 'Password123',
    confirmPassword: 'Password123',
  };
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RegisterUserList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: LoginDestination }]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterUserList);
    component = fixture.componentInstance;
    form = component.userForm;
    http = TestBed.inject(HttpTestingController);
    form.patchValue(values);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('updates supplied errors when each field is touched or corrected', () => {
    const name = form.get('name')!;
    const email = form.get('email')!;
    name.setValue('');
    email.setValue('invalid');
    name.markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#register-name-error')?.textContent).toContain(
      'required',
    );
    expect(fixture.nativeElement.querySelector('#register-email-error')).toBeNull();
    email.markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#register-email-error')?.textContent).toContain(
      'valid email',
    );
    email.setValue('correct@example.com');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#register-email-error')).toBeNull();
  });

  it('posts the exact customer payload once and returns to Login without a session', async () => {
    component.registerUser();
    component.registerUser();
    const request = http.expectOne(AUTH_API_URLS.register);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Test Customer',
      contactNumber: '+96800123456',
      email: values.email,
      password: values.password,
      roleId: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('true');
    expect(
      [...fixture.nativeElement.querySelectorAll('input')].every((input) => input.readOnly),
    ).toBe(true);
    request.flush(
      {
        publicId: '1e4c0542-6301-41b3-9113-6648342c70f7',
        name: 'Test Customer',
        contactNumber: '+96800123456',
        email: values.email,
        roles: [{ roleId: 1, roleName: 'USER', isActive: true }],
      },
      { status: 201, statusText: 'Created' },
    );
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login?registered=1');
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('rechecks confirmation when either password changes', () => {
    form.get('confirmPassword')?.setValue('Different123');
    component.registerUser();
    expect(form.hasError('passwordMismatch')).toBe(true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('#register-confirmPassword')
        ?.getAttribute('aria-invalid'),
    ).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Passwords do not match.');
    form.get('confirmPassword')?.setValue(values.password);
    expect(form.hasError('passwordMismatch')).toBe(false);
    form.get('password')?.setValue('Changed123');
    component.registerUser();
    expect(form.hasError('passwordMismatch')).toBe(true);
    http.expectNone(AUTH_API_URLS.register);
  });

  it.each([
    ['name', ' ', 'blank'],
    ['contactNumber', ' ', 'blank'],
    ['contactNumber', '0'.repeat(31), 'maxlength'],
    ['password', 'short', 'minlength'],
    ['password', 'password123', 'uppercase'],
    ['password', 'PASSWORD123', 'lowercase'],
    ['password', 'PasswordOnly', 'number'],
    ['confirmPassword', '', 'required'],
  ])('rejects invalid %s input', (field, value, error) => {
    form.get(field)?.setValue(value);
    component.registerUser();
    expect(form.get(field)?.hasError(error)).toBe(true);
    http.expectNone(AUTH_API_URLS.register);
  });

  it('leaves the name length limit to the API and displays its response', () => {
    const name = 'a'.repeat(151);
    form.get('name')?.setValue(name);
    component.registerUser();
    const request = http.expectOne(AUTH_API_URLS.register);
    expect(request.request.body.name).toBe(name);
    request.flush(
      { errors: { Name: ['Name must contain no more than 150 characters.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#register-name-error').textContent).toContain(
      '150 characters',
    );
    expect(form.get('name')?.value).toBe(name);
  });

  it('keeps email format validation without a separate maximum-length rule', () => {
    form.get('email')?.setValue(`${'a'.repeat(250)}@x.com`);
    expect(form.get('email')?.hasError('maxlength')).toBe(false);
    expect(form.get('email')?.hasError('email')).toBe(true);
  });

  it.each([
    [400, { errors: { Email: ['Email is invalid.'] } }, 'email', 'Email is invalid.'],
    [
      409,
      { detail: 'A user with this email already exists.' },
      'email',
      'A user with this email already exists.',
    ],
    [
      409,
      { detail: 'A user with this contact number already exists.' },
      'contactNumber',
      'A user with this contact number already exists.',
    ],
  ])(
    'preserves all values for HTTP %i field errors and allows correction',
    (status, body, field, message) => {
      component.registerUser();
      http.expectOne(AUTH_API_URLS.register).flush(body, { status, statusText: 'Failed' });
      fixture.detectChanges();
      expect(form.getRawValue()).toEqual(values);
      expect(form.get(field)?.getError('server')).toBe(message);
      const input = fixture.nativeElement.querySelector(`#register-${field}`);
      expect(
        fixture.nativeElement.querySelector(`#${input.getAttribute('aria-describedby')}`)
          .textContent,
      ).toContain(message);
      form.get(field)?.setValue(field === 'email' ? 'other@example.com' : '+96800987654');
      expect(form.get(field)?.hasError('server')).toBe(false);
      component.registerUser();
      http.expectOne(AUTH_API_URLS.register).flush({}, { status: 503, statusText: 'Unavailable' });
    },
  );

  it.each([
    [400, { errors: { RoleId: ['Invalid.'] } }, 'Unable to create your account. Please try again.'],
    [400, { errors: { Name: [7] } }, 'Unable to create your account. Please try again.'],
    [400, { errors: { Email: [] } }, 'Unable to create your account. Please try again.'],
    [400, { errors: null }, 'Unable to create your account. Please try again.'],
    [403, {}, 'Registration is unavailable. Please contact support.'],
    [409, {}, 'An account with this email or contact number already exists.'],
    [503, {}, 'The server is unavailable. Please try again.'],
  ])('shows a useful banner for HTTP %i without discarding fields', (status, body, message) => {
    component.registerUser();
    http.expectOne(AUTH_API_URLS.register).flush(body, { status, statusText: 'Failed' });
    fixture.detectChanges();
    expect(form.getRawValue()).toEqual(values);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(message);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('shows known field errors alongside an unknown-field banner', () => {
    component.registerUser();
    http
      .expectOne(AUTH_API_URLS.register)
      .flush(
        { errors: { Name: ['Invalid name.'], RoleId: ['Invalid.'] } },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();
    expect(form.get('name')?.getError('server')).toBe('Invalid name.');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Unable to create',
    );
  });

  it('allows retry after a network failure and cancels when leaving the page', () => {
    component.registerUser();
    http.expectOne(AUTH_API_URLS.register).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'The server is unavailable. Please try again.',
    );
    expect(form.getRawValue()).toEqual(values);
    component.registerUser();
    const retry = http.expectOne(AUTH_API_URLS.register);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    fixture.destroy();
    expect(retry.cancelled).toBe(true);
  });
});
