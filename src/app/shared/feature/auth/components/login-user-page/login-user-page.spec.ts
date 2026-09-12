import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { LoginUserPage } from './login-user-page';

describe('LoginUserPage', () => {
  let fixture: ComponentFixture<LoginUserPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginUserPage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginUserPage);
    fixture.componentRef.setInput(
      'userForm',
      new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', Validators.required),
      }),
    );
    fixture.detectChanges();
  });

  it('toggles password visibility with accessible state', () => {
    const button = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    const input = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;
    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Hide password');
  });

  it('links registration to the public route', () => {
    const link = fixture.nativeElement.querySelector('.register-button') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/users/register');
  });

  it('associates visible validation errors with their inputs', () => {
    const form = fixture.componentRef.instance.userForm();
    form.markAllAsTouched();
    fixture.detectChanges();

    const email = fixture.nativeElement.querySelector('#login-email') as HTMLInputElement;
    const password = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;
    expect(email.getAttribute('aria-describedby')).toBe('login-email-error');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(password.getAttribute('aria-describedby')).toBe('login-password-error');
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('label[for="login-email"]')?.textContent).toContain(
      'Email address',
    );
    expect(
      fixture.nativeElement.querySelector('label[for="login-password"]')?.textContent,
    ).toContain('Password');
  });

  it('marks the form busy while submitting', () => {
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('true');
  });
});
