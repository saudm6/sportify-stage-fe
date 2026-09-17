import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../../core/urls';
import { BookingReport } from '../models/booking-report';
import { ReportFilters } from '../models/report-filters';

@Injectable({ providedIn: 'root' })
export class BookingReportService {
  private readonly http = inject(HttpClient);

  getReport(filters: ReportFilters) {
    const params: Record<string, string | number> = {
      from: filters.from, to: filters.to, page: 1, pageSize: 20,
    };
    for (const key of ['branchPublicId', 'sportPublicId'] as const) {
      if (filters[key]) params[key] = filters[key];
    }
    return this.http.get<BookingReport>(`${API_BASE_URL}/staff/booking-report`, { params });
  }
}
