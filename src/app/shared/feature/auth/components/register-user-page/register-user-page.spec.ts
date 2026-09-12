import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { RegisterUserPage } from './register-user-page';

describe('RegisterUserPage', () => {
  let fixture: ComponentFixture<RegisterUserPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RegisterUserPage] }).compileComponents();
    fixture = TestBed.createComponent(RegisterUserPage);
    fixture.componentRef.setInput(
      'userForm',
      new FormGroup({
        fullName: new FormControl(''),
        email: new FormControl(''),
        password: new FormControl(''),
      }),
    );
    fixture.detectChanges();
  });

  it('renders the preserved registration fields', () => {
    expect(fixture.nativeElement.querySelectorAll('input')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Register user');
  });
});
