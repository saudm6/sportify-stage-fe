import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LOGIN_URL } from '../../../../../core/urls';
import { RegisterUserPage } from '../../components/register-user-page/register-user-page';
import { AuthApiService } from '../../service/auth-api.service';
import { rxState, RxState } from '@rx-angular/state';
import { finalize, Observable } from 'rxjs';
import { contains } from '../../../../functions/index';
import { AsyncPipe } from '@angular/common';

interface RegisterUserState {
  isSubmitting: boolean;
  errorMessage: string;
}

type ViewModel = RegisterUserState;

@Component({
  selector: 'app-register-user-list',
  imports: [RegisterUserPage, AsyncPipe],
  providers: [RxState],
  templateUrl: './register-user-list.html',
  styleUrl: './register-user-list.css',
})
export class RegisterUserList {
  private readonly state = rxState<RegisterUserState>();

  vm$: Observable<ViewModel>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly userForm = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(150), contains(/\S/, 'blank')]],
      contactNumber: ['', [Validators.required, Validators.maxLength(30), contains(/\S/, 'blank')]],
      email: ['', [Validators.email, Validators.required, Validators.maxLength(255)]],
      password: [
        '',
        [
          Validators.minLength(8),
          Validators.required,
          contains(/[A-Z]/, 'uppercase'),
          contains(/[a-z]/, 'lowercase'),
          contains(/[0-9]/, 'number'),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    {
      validators: (form) =>
        form.get('password')?.value === form.get('confirmPassword')?.value
          ? null
          : { passwordMismatch: true },
    },
  );

  constructor() {
    this.state.set({
      isSubmitting: false,
      errorMessage: '',
    });

    this.vm$ = this.state.select();
  }

  registerUser(): void {
    if (this.state.get('isSubmitting')) {
      return;
    }
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.state.set({
      isSubmitting: true,
      errorMessage: '',
    });

    const { name, contactNumber, email, password } = this.userForm.getRawValue();
    this.authService
      .registerUser({ name: name.trim(), contactNumber: contactNumber.trim(), email, password })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.state.set({ isSubmitting: false });
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate([LOGIN_URL], { queryParams: { registered: '1' } });
        },
        error: (error: unknown) => this.showRegistrationError(error),
      });
  }

  private showRegistrationError(error: unknown): void {
    const fallback = 'Unable to create your account. Please try again.';
    if (!(error instanceof HttpErrorResponse)) {
      this.state.set({ errorMessage: fallback });
      return;
    }

    if (error.status === 400) {
      const errors: unknown = error.error?.errors;
      const fields = new Map([
        ['Name', 'name'],
        ['ContactNumber', 'contactNumber'],
        ['Email', 'email'],
        ['Password', 'password'],
      ]);
      let unrecognized = false;
      let applied = false;
      if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
        for (const [key, messages] of Object.entries(errors)) {
          const field = fields.get(key);
          if (
            field &&
            Array.isArray(messages) &&
            messages.length &&
            messages.every((message) => typeof message === 'string' && message.trim())
          ) {
            const control = this.userForm.get(field)!;
            control.setErrors({ ...control.errors, server: messages.join(' ') });
            control.markAsTouched();
            applied = true;
          } else {
            unrecognized = true;
          }
        }
      }
      this.state.set({ errorMessage: applied && !unrecognized ? '' : fallback });
      return;
    }

    if (error.status === 409) {
      const detail: unknown = error.error?.detail;
      const field =
        detail === 'A user with this email already exists.'
          ? 'email'
          : detail === 'A user with this contact number already exists.'
            ? 'contactNumber'
            : null;
      if (field) {
        const control = this.userForm.controls[field];
        control.setErrors({ ...control.errors, server: detail });
        control.markAsTouched();
      } else {
        this.state.set({
          errorMessage: 'An account with this email or contact number already exists.',
        });
      }
      return;
    }

    this.state.set({
      errorMessage:
        error.status === 403
          ? 'Registration is unavailable. Please contact support.'
          : error.status === 0 || error.status >= 500
            ? 'The server is unavailable. Please try again.'
            : fallback,
    });
  }
  cancel(): void {
    if (!this.state.get('isSubmitting')) {
      this.router.navigate([LOGIN_URL]);
    }
  }
}
