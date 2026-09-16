import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PAGE_PATHS } from '../../../../core/urls';
import { BookingReport } from '../../shared/models/booking-report';
import { ReportFilters, DatePreset } from '../../shared/models/report-filters';

@Component({
  selector: 'app-dashboard-page',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  readonly paths = PAGE_PATHS;
  readonly form = input.required<FormGroup<{ [K in keyof ReportFilters]: FormControl<string> }>>();
  readonly applied = input.required<ReportFilters>();
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
