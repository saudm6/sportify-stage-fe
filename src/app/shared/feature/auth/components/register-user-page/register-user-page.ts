import { Component, input, output } from '@angular/core';
import { Form, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-register-user-page',
  imports: [ReactiveFormsModule],
  templateUrl: './register-user-page.html',
  styleUrl: './register-user-page.css',
})
export class RegisterUserPage {
  readonly userForm = input.required<FormGroup>();
  readonly isSubmitting = input(false);
  readonly errorMessage = input('');

  readonly submitted = output<void>();
  readonly cancelled = output<void>();
}
