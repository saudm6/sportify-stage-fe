import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, catchError, of, switchMap } from 'rxjs';
import { CourtsPage } from '../components/courts-page';
import { CourtPopup } from '../components/courtpopup';
import { CourtFilters, CourtList, CourtOptions } from '../models/courts';
import { popup } from '../../../../shared/functions/popup';
import { CourtsApi } from '../service/courts-api';

const emptyFilters: CourtFilters = {
  branchPublicId: '',
  sportPublicId: '',
  isIndoor: '',
  isActive: '',
};

@Component({
  selector: 'app-courts',
  imports: [CourtsPage],
  template: `<app-courts-page
    [form]="form"
    [result]="result()"
    [options]="options()"
    [loading]="loading()"
    [error]="error()"
    [success]="success()"
    [optionsLoaded]="optionsLoaded()"
    (applyFilters)="apply()"
    (resetFilters)="reset()"
    (addCourt)="open()"
    (editCourt)="open($event)"
  />`,
})
export class Courts {
  private readonly api = inject(CourtsApi);
  private readonly openPopup = popup();
  private readonly destroyRef = inject(DestroyRef);
  private readonly page = viewChild.required(CourtsPage);
  private readonly query = new BehaviorSubject<CourtFilters>(emptyFilters);
  readonly form = inject(FormBuilder).nonNullable.group(emptyFilters);
  readonly result = signal<CourtList | null>(null);
  readonly options = signal<CourtOptions>({ branches: [], sports: [] });
  readonly optionsLoaded = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  constructor() {
    this.query
      .pipe(
        switchMap((filters) => {
          this.loading.set(true);
          this.error.set('');
          this.result.set(null);
          return this.api.list(filters).pipe(
            catchError((error) => {
              this.error.set(
                error.status === 403
                  ? 'You do not have permission to manage courts.'
                  : 'Courts could not be loaded. Apply filters to try again.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.result.set(result);
        if (result) {
          this.options.set(result.availableFilters);
          this.optionsLoaded.set(true);
        }
      });
  }

  apply() {
    this.success.set('');
    this.query.next(this.form.getRawValue());
  }

  reset() {
    this.form.setValue(emptyFilters);
    this.apply();
  }

  open(publicId?: string) {
    this.openPopup(CourtPopup, { publicId, options: this.options() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved) {
          this.success.set(publicId ? 'Court updated.' : 'Court added.');
          this.page().focusAddCourt();
          this.query.next(this.query.value);
        }
      });
  }
}
