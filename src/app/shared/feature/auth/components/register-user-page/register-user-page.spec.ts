import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RegisterUserPage } from './register-user-page';

describe('RegisterUserPage', () => {
  let fixture: ComponentFixture<RegisterUserPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterUserPage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterUserPage);
    fixture.componentRef.setInput(
      'userForm',
      new FormGroup({
        name: new FormControl(''),
        contactNumber: new FormControl(''),
        email: new FormControl(''),
        password: new FormControl(''),
        confirmPassword: new FormControl(''),
      }),
    );
    fixture.detectChanges();
  });

  it('renders five labeled fields with autocomplete and a Login link', () => {
    const inputs = [...fixture.nativeElement.querySelectorAll('input')];
    expect(inputs).toHaveLength(5);
    for (const input of inputs) {
      expect(fixture.nativeElement.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
      expect(input.autocomplete).toBeTruthy();
    }
    expect(fixture.nativeElement.querySelector('#register-contactNumber').type).toBe('tel');
    expect(fixture.nativeElement.querySelector('#register-password').autocomplete).toBe(
      'new-password',
    );
    expect(fixture.nativeElement.querySelector('#register-confirmPassword').autocomplete).toBe(
      'new-password',
    );
    expect(fixture.nativeElement.querySelector('.back-button').getAttribute('href')).toBe('/login');
    expect(fixture.nativeElement.textContent).toContain('Create account');
  });

  it('renders error messages supplied by the container without inspecting validation', () => {
    fixture.componentRef.setInput('fieldErrors', {
      name: 'Enter your name.',
      confirmPassword: 'Passwords do not match.',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#register-name-error')?.textContent).toBe(
      'Enter your name.',
    );
    expect(
      fixture.nativeElement
        .querySelector('#register-confirmPassword')
        ?.getAttribute('aria-invalid'),
    ).toBe('true');
    fixture.componentRef.setInput('fieldErrors', {});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#register-name-error')).toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('#register-confirmPassword')
        ?.getAttribute('aria-invalid'),
    ).toBe('false');
  });
});
