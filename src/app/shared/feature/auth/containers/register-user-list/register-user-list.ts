import { Component, inject } from '@angular/core';
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

  readonly userForm = this.formBuilder.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.email, Validators.required]],
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
  });

  constructor() {
    this.state.set({ 
      isSubmitting: false,
      errorMessage: '',
    });

    this.vm$ = this.state.select();
  }

  registerUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    if (this.state.get('isSubmitting')) {
      return;
    }

    this.state.set({
      isSubmitting: true,
      errorMessage: '',
    });

    this.authService
      .registerUser(this.userForm.getRawValue())
      .pipe(
        finalize(() => {
          this.state.set({ isSubmitting: false });
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate([LOGIN_URL]);
        },
        error: (error) => {
          
          const validationErrors = error.error?.errors;

          console.error('Unable to register user: ', error);
          
          const messages = validationErrors ? Object.values(validationErrors).flat() : [];

          this.state.set({
            errorMessage: messages.join(' ') || 'Unable to register user',
          });
        },
      });
  }
  cancel(): void {
    if (!this.state.get('isSubmitting')) {
      this.router.navigate([LOGIN_URL]);
    }
  }
}
