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
        rolePublicId: new FormControl(''),
        companyPublicId: new FormControl(null),
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

  it('renders API choices with accessible native selects and emits retry', () => {
    const options = {
      roles: [{ publicId: 'role-from-api', name: 'Finance', requiresCompany: true }],
      companies: [{ publicId: 'company-from-api', nameEn: 'Company A', nameAr: 'Company A' }],
    };
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('requiresCompany', true);
    fixture.componentRef.setInput('fieldErrors', { companyPublicId: 'Select a company.' });
    fixture.detectChanges();
    const selects = [...fixture.nativeElement.querySelectorAll('select')];
    expect(selects).toHaveLength(2);
    for (const select of selects) {
      expect(fixture.nativeElement.querySelector(`label[for="${select.id}"]`)).not.toBeNull();
    }
    expect(selects[0].querySelector('option[value="role-from-api"]').textContent).toBe('Finance');
    expect(selects[1].querySelector('option[value="company-from-api"]').textContent.trim()).toBe(
      'Company A',
    );
    expect(selects[1].getAttribute('aria-invalid')).toBe('true');
    expect(
      fixture.nativeElement.querySelector(`#${selects[1].getAttribute('aria-describedby')}`)
        .textContent,
    ).toBe('Select a company.');
    fixture.componentRef.setInput('optionsLoading', true);
    fixture.detectChanges();
    expect(selects.every((select) => select.disabled)).toBe(true);
    fixture.componentRef.setInput('optionsLoading', false);
    fixture.componentRef.setInput('optionsError', 'Options unavailable.');
    let retried = false;
    fixture.componentInstance.optionsRetried.subscribe(() => (retried = true));
    fixture.detectChanges();
    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button) => button.textContent.trim() === 'Retry')
      .click();
    expect(retried).toBe(true);
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
