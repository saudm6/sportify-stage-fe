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
    [loading]="loading()" [saving]="saving()"
    [success]="success()" [fieldErrors]="fieldErrors()"
    (retried)="load()" (submitted)="save()" (cancelled)="cancel()" />`,
})
export class Account {
  private readonly api = inject(AccountApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly profile = signal<AccountProfile | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
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
    this.api.load().pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: profile => this.acceptProfile(profile),
      error: error => console.error('Unable to load account.', error),
    });
  }

  save(): void {
    if (this.loading() || this.saving() || !this.profile()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.success.set('');
    const { name, contactNumber, email } = this.form.getRawValue();
    this.api.save({ name: name.trim(), contactNumber: contactNumber.trim(), email: email.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: profile => {
          this.acceptProfile(profile);
          if (profile) this.success.set('Account updated successfully.');
        },
        error: error => console.error('Unable to save account.', error),
      });
  }

  cancel(): void {
    const profile = this.profile();
    if (!profile || this.loading() || this.saving()) return;
    this.restore(profile);
    this.success.set('');
  }

  private acceptProfile(profile: AccountProfile | null): void {
    if (!profile) {
      console.error('Account response was empty.');
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
    if (control.hasError('required') || control.hasError('blank')) return `${label} is required.`;
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('maxlength'))
      return `${label} must contain no more than ${control.getError('maxlength').requiredLength} characters.`;
    return '';
  }
}
