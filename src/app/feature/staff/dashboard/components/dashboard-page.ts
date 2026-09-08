import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BookingReport } from '../models/booking-report';
import { DashboardFilters, DatePreset } from '../models/dashboard-filters';

@Component({
  selector: 'app-dashboard-page',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  readonly form = input.required<FormGroup<{ [K in keyof DashboardFilters]: FormControl<string> }>>();
  readonly applied = input.required<DashboardFilters>();
  readonly report = input<BookingReport | null>(null);
  readonly options = input.required<BookingReport['availableFilters']>();
  readonly loading = input(false);
  readonly error = input('');
  readonly validation = input('');
  readonly preset = input<DatePreset>('month');
  readonly applyFilters = output();
  readonly resetFilters = output();
  readonly choosePreset = output<DatePreset>();
  readonly retry = output();
  readonly presets: { value: DatePreset; label: string }[] = [
    { value: 'today', label: 'Today' }, { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' }, { value: 'custom', label: 'Custom' },
  ];
}
