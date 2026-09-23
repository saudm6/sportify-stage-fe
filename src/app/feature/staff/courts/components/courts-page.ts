import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CourtFilterForm, CourtList, CourtOptions } from '../models/courts';

@Component({
  selector: 'app-courts-page',
  imports: [ReactiveFormsModule],
  templateUrl: './courts-page.html',
  styleUrl: './courts-page.css',
})
export class CourtsPage {
  private readonly addButton = viewChild.required<ElementRef<HTMLButtonElement>>('addButton');
  readonly form = input.required<CourtFilterForm>();
  readonly result = input<CourtList | null>(null);
  readonly options = input.required<CourtOptions>();
  readonly optionsLoaded = input(false);
  readonly loading = input(false);
  readonly error = input('');
  readonly success = input('');
  readonly applyFilters = output();
  readonly resetFilters = output();
  readonly addCourt = output();
  readonly editCourt = output<string>();

  focusAddCourt() {
    this.addButton().nativeElement.focus();
  }
}
