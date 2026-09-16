import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../../core/urls';
import { BookingReport } from '../models/booking-report';
import { ReportFilters } from '../models/report-filters';

@Injectable({ providedIn: 'root' })
export class BookingReportService {
  private readonly http = inject(HttpClient);

  getReport(filters: ReportFilters, options: {
    courtPublicId?: string; status?: string; bookingType?: string; search?: string;
    page?: number; pageSize?: number;
  } = {}) {
    const params: Record<string, string | number> = {
      from: filters.from, to: filters.to, page: options.page ?? 1, pageSize: options.pageSize ?? 20,
    };
    for (const key of ['branchPublicId', 'sportPublicId'] as const) {
      if (filters[key]) params[key] = filters[key];
    }
    for (const key of ['courtPublicId', 'status', 'bookingType', 'search'] as const) {
      const value = options[key]?.trim();
      if (value) params[key] = value;
    }
    return this.http.get<BookingReport>(`${API_BASE_URL}/staff/booking-report`, { params });
  }
}
