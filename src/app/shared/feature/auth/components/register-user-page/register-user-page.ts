import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PAGE_PATHS } from '../../../../../core/urls';

@Component({
  selector: 'app-register-user-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-user-page.html',
  styleUrl: './register-user-page.css',
})
export class RegisterUserPage {
  readonly paths = PAGE_PATHS;
  readonly userForm = input.required<FormGroup>();
  readonly isSubmitting = input(false);
  readonly errorMessage = input('');

  readonly submitted = output<void>();
  readonly cancelled = output<void>();

  fieldError(field: string, label: string): string {
    const control = this.userForm().get(field);
    if (!control?.touched) return '';
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required') || control.hasError('blank')) return `${label} is required.`;
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('maxlength'))
      return `${label} must contain no more than ${control.getError('maxlength').requiredLength} characters.`;
    if (control.hasError('minlength')) return 'Password must contain at least 8 characters.';
    if (control.hasError('uppercase'))
      return 'Password must contain at least one uppercase letter.';
    if (control.hasError('lowercase'))
      return 'Password must contain at least one lowercase letter.';
    if (control.hasError('number')) return 'Password must contain at least one number.';
    return field === 'confirmPassword' && this.userForm().hasError('passwordMismatch')
      ? 'Passwords do not match.'
      : '';
  }
}
