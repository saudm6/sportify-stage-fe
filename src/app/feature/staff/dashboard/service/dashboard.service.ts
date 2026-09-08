import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BookingReport } from '../models/booking-report';
import { DashboardFilters } from '../models/dashboard-filters';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getReport(filters: DashboardFilters) {
    return this.http.get<BookingReport>('http://localhost:5210/api/staff/booking-report', {
      params: {
        from: filters.from, to: filters.to, page: 1, pageSize: 20,
        ...(filters.branchPublicId ? { branchPublicId: filters.branchPublicId } : {}),
        ...(filters.sportPublicId ? { sportPublicId: filters.sportPublicId } : {}),
      },
    });
  }
}
