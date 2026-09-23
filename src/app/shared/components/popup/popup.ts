import { Component, effect, inject, input, output } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-popup',
  imports: [MatDialogModule],
  templateUrl: './popup.html',
  styleUrl: './popup.css',
})
export class Popup {
  private readonly ref = inject(MatDialogRef);
  readonly formId = `${this.ref.id}-form`;
  readonly title = input.required<string>();
  readonly submitLabel = input('Save changes');
  readonly loadingLabel = input('Loading…');
  readonly loading = input(false);
  readonly saving = input(false);
  readonly ready = input(true);
  readonly error = input('');
  readonly submitted = output();

  constructor() {
    effect(() => {
      this.ref.disableClose = this.saving();
    });
  }

  submit(event: Event) {
    event.preventDefault();
    if (this.ready() && !this.loading() && !this.saving()) this.submitted.emit();
  }

  cancel() {
    if (!this.saving()) this.ref.close();
  }
}
