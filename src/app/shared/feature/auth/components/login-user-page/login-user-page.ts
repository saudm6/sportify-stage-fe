import { Component, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PAGE_PATHS } from '../../../../../core/urls';

@Component({
  selector: 'app-login-user-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-user-page.html',
  styleUrl: './login-user-page.css',
})
export class LoginUserPage {
  readonly paths = PAGE_PATHS;
  readonly userForm = input.required<FormGroup>();
  readonly isSubmitting = input(false);
  readonly errorMessage = input('');
  readonly successMessage = input('');

  readonly submitted = output<void>();
  readonly cancelled = output<void>();
  readonly passwordVisible = signal(false);
}
