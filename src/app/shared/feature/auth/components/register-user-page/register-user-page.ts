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
  readonly fieldErrors = input<Record<string, string>>({});

  readonly submitted = output<void>();
  readonly cancelled = output<void>();
}
