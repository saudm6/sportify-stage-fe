import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { notBlank } from '../../../../shared/functions';
import { CourtDetails, CourtDialogData } from '../models/courts';
import { CourtsApi } from '../service/courts-api';

@Component({
  selector: 'app-court-dialog',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './court-dialog.html',
  styleUrl: './court-dialog.css',
})
export class CourtDialog {
  readonly data = inject<CourtDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CourtDialog, boolean>);
  private readonly api = inject(CourtsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly durations = [60, 90, 120];
  readonly detail = signal<CourtDetails | null>(null);
  readonly loading = signal(!!this.data.publicId);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    courtNameEn: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    courtNameAr: ['', [Validators.required, notBlank, Validators.maxLength(150)]],
    branchPublicId: ['', Validators.required],
    sportPublicId: ['', Validators.required],
    isIndoor: [true],
    isActive: [true],
    prices: this.fb.array(
      this.durations.map(() =>
        this.fb.control<number | null>(null, [
          Validators.required,
          Validators.min(0),
          Validators.max(9999999.999),
          Validators.pattern(/^\d+(\.\d{1,3})?$/),
        ]),
      ),
    ),
  });

  constructor() {
    if (this.data.publicId) {
      this.form.controls.branchPublicId.disable();
      this.api
        .details(this.data.publicId)
        .pipe(
          takeUntilDestroyed(),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (court) => {
            this.detail.set(court);
            this.form.patchValue({
              courtNameEn: court.courtNameEn,
              courtNameAr: court.courtNameAr,
              branchPublicId: court.branch.publicId,
              sportPublicId: court.sport.publicId,
              isIndoor: court.isIndoor,
              isActive: court.isActive,
              prices: this.durations.map(
                (duration) =>
                  court.prices.find((price) => price.durationMins === duration)?.price ?? null,
              ),
            });
          },
          error: (error) =>
            this.error.set(
              error.status === 404
                ? 'This court is no longer available. Close this dialog and refresh the list.'
                : error.status === 403
                  ? 'You do not have permission to manage this court.'
                  : 'Court details could not be loaded. Close this dialog and open the court again.',
            ),
        });
    }
  }

  save() {
    if (this.saving() || this.loading() || (this.data.publicId && !this.detail())) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    const fields = {
      courtNameEn: values.courtNameEn.trim(),
      courtNameAr: values.courtNameAr.trim(),
      sportPublicId: values.sportPublicId,
      isIndoor: values.isIndoor,
      prices: this.durations.map((durationMins, index) => ({
        durationMins,
        price: values.prices[index]!,
      })),
    };
    const request = this.data.publicId
      ? this.api.update(this.data.publicId, { ...fields, isActive: values.isActive })
      : this.api.create({ ...fields, branchPublicId: values.branchPublicId });
    this.saving.set(true);
    this.ref.disableClose = true;
    this.error.set('');
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: () => this.ref.close(true),
        error: (error) => {
          const messages =
            error.status === 400 && error.error?.errors && typeof error.error.errors === 'object'
              ? Object.values(error.error.errors)
                  .flat()
                  .filter((message): message is string => typeof message === 'string')
              : [];
          const detail = typeof error.error?.detail === 'string' ? error.error.detail : '';
          switch (error.status) {
            case 400:
              this.error.set(
                messages.join(' ') ||
                  'Check the court fields and all three prices, then save again.',
              );
              break;
            case 404:
              this.error.set(
                'The court, branch or sport is no longer available. Your edits are still here.',
              );
              break;
            case 409:
              this.error.set(
                detail ||
                  'This change conflicts with existing data. A court with bookings cannot change sport.',
              );
              break;
            case 403:
              this.error.set('You do not have permission to save this court.');
              break;
            default:
              this.error.set(
                'The save could not be confirmed. Your edits are still here. Check your connection and the court list before trying again.',
              );
          }
        },
      });
  }

  cancel() {
    if (!this.saving()) this.ref.close(false);
  }
}
