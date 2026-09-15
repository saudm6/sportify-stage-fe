import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AccountProfile } from '../../models/account-profile';

@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule],
  templateUrl: './account-page.html',
  styleUrl: './account-page.css',
})
export class AccountPage {
  readonly form = input.required<FormGroup>();
  readonly profile = input<AccountProfile | null>(null);
  readonly loading = input(false);
  readonly saving = input(false);
  readonly unavailable = input(false);
  readonly error = input('');
  readonly success = input('');
  readonly fieldErrors = input<Record<string, string>>({});
  readonly retried = output<void>();
  readonly submitted = output<void>();
  readonly cancelled = output<void>();
}
