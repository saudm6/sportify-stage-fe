import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginUserPage } from '../../components/login-user-page/login-user-page';
import { AuthService } from '../../../../../core/auth.service';
import { LOGIN_URL } from '../../../../../core/urls';
import { AuthApiService } from '../../service/auth-api.service';
import { rxState, RxState } from '@rx-angular/state';
import { finalize, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';

interface LoginUserState {
  isSubmitting: boolean;
  errorMessage: string;
}

type ViewModel = LoginUserState;

@Component({
  selector: 'app-login-user-list',
  imports: [LoginUserPage, AsyncPipe],
  providers: [RxState],
  templateUrl: './login-user-list.html',
  styleUrl: './login-user-list.css',
})
export class LoginUserList {
  private readonly state = rxState<LoginUserState>();

  vm$: Observable<ViewModel>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly registrationMessage =
    inject(ActivatedRoute).snapshot.queryParamMap.get('registered') === '1'
      ? 'Account created successfully. Sign in with your email and password.'
      : '';

  readonly userForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  constructor() {
    this.state.set({
      isSubmitting: false,
      errorMessage: '',
    });

    this.vm$ = this.state.select();
    if (this.auth.getToken()) {
      void this.router.navigateByUrl(this.auth.destination());
    }
  }

  loginUser(): void {
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

    this.authApi
      .loginUser(this.userForm.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.state.set({ isSubmitting: false });
        }),
      )
      .subscribe({
        next: (response) => {
          const errorMessage = this.auth.acceptLogin(response);
          if (errorMessage) {
            this.state.set({ errorMessage });
            return;
          }

          void this.router.navigateByUrl(this.auth.destination());
        },
        error: (error: unknown) => {
          const status = error instanceof HttpErrorResponse ? error.status : undefined;
          this.state.set({
            errorMessage:
              status === 401 || status === 403
                ? 'Invalid email or password.'
                : status === 0 || (status !== undefined && status >= 500)
                  ? 'The server is unavailable. Please try again.'
                  : 'Unable to sign in. Please try again.',
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
