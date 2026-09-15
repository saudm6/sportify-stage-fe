import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize, merge } from 'rxjs';
import { notBlank } from '../../../../functions';
import { AccountPage } from '../../components/account-page/account-page';
import { AccountProfile } from '../../models/account-profile';
import { AccountApiService } from '../../service/account-api.service';

@Component({
  selector: 'app-account',
  imports: [AccountPage],
  template: `<app-account-page [form]="form" [profile]="profile()"
    [loading]="loading()" [saving]="saving()" [unavailable]="unavailable()"
    [error]="error()" [success]="success()" [fieldErrors]="fieldErrors()"
    (retried)="load()" (submitted)="save()" (cancelled)="cancel()" />`,
})
export class Account {
  private readonly api = inject(AccountApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly profile = signal<AccountProfile | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly unavailable = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    contactNumber: ['', [Validators.required, notBlank, Validators.maxLength(30)]],
  });
  private readonly formEvents = toSignal(merge(
    this.form.events, ...Object.values(this.form.controls).map(control => control.events),
  ));
  readonly fieldErrors = computed(() => {
    this.formEvents();
    return {
      name: this.fieldError('name', 'Name'),
      email: this.fieldError('email', 'Email address'),
      contactNumber: this.fieldError('contactNumber', 'Contact number'),
    };
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.success.set(''));
    this.load();
  }

  load(): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    this.error.set('');
    this.unavailable.set(false);
    this.api.load().pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: profile => this.acceptProfile(profile),
      error: error => this.showError(error, false),
    });
  }

  save(): void {
    if (this.loading() || this.saving() || !this.profile() || this.unavailable()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    const { name, contactNumber, email } = this.form.getRawValue();
    this.api.save({ name: name.trim(), contactNumber: contactNumber.trim(), email: email.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: profile => {
          this.acceptProfile(profile);
          if (profile) this.success.set('Account updated successfully.');
        },
        error: error => this.showError(error, true),
      });
  }

  cancel(): void {
    const profile = this.profile();
    if (!profile || this.loading() || this.saving()) return;
    this.restore(profile);
    if (!this.unavailable()) this.error.set('');
    this.success.set('');
  }

  private acceptProfile(profile: AccountProfile | null): void {
    if (!profile) {
      this.error.set('Your profile could not be found.');
      this.unavailable.set(true);
      return;
    }
    this.profile.set(profile);
    this.restore(profile);
  }

  private restore({ name, contactNumber, email }: AccountProfile): void {
    this.form.reset({ name, contactNumber, email });
  }

  private fieldError(field: keyof typeof this.form.controls, label: string): string {
    const control = this.form.controls[field];
    if (!control.touched) return '';
    if (control.hasError('server')) return control.getError('server');
    if (control.hasError('required') || control.hasError('blank')) return `${label} is required.`;
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('maxlength'))
      return `${label} must contain no more than ${control.getError('maxlength').requiredLength} characters.`;
    return '';
  }

  private showError(error: unknown, saving: boolean): void {
    const fallback = saving
      ? 'Unable to save your account. Please try again.'
      : 'Unable to load your account. Please try again.';
    this.error.set(fallback);
    if (!(error instanceof HttpErrorResponse)) return;
    if ([401, 403, 404].includes(error.status)) {
      this.unavailable.set(true);
      this.error.set(error.status === 401 ? 'Your session has expired. Please sign in again.'
        : error.status === 403 ? 'You do not have access to this profile.'
        : 'Your profile could not be found.');
      return;
    }
    if (!saving) return;
    if (error.status === 400) {
      const errors: unknown = error.error?.errors;
      const fields = new Map<string, keyof typeof this.form.controls>([
        ['Name', 'name'], ['Email', 'email'], ['ContactNumber', 'contactNumber'],
      ]);
      let applied = false;
      let unrecognized = false;
      if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
        for (const [key, messages] of Object.entries(errors)) {
          const field = fields.get(key);
          if (field && Array.isArray(messages) && messages.length
            && messages.every(message => typeof message === 'string' && message.trim())) {
            this.form.controls[field].setErrors({ server: messages.join(' ') });
            this.form.controls[field].markAsTouched();
            applied = true;
          } else unrecognized = true;
        }
      }
      if (applied && !unrecognized) this.error.set('');
    } else if (error.status === 409) {
      const detail: unknown = error.error?.detail;
      const field = detail === 'A user with this email already exists.' ? 'email'
        : detail === 'A user with this contact number already exists.' ? 'contactNumber' : null;
      if (field) {
        this.form.controls[field].setErrors({ server: detail });
        this.form.controls[field].markAsTouched();
        this.error.set('');
      } else this.error.set('An account with this email or contact number already exists.');
    }
  }
}
