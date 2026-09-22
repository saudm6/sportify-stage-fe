import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../../core/urls';
import { BookingFilterOptions, BookingList, BookingReport, BookingType } from '../models/booking-report';
import { ReportFilters } from '../models/report-filters';
import { BookingDetails, BookingsQuery } from '../../bookings/models/bookings';

@Injectable({ providedIn: 'root' })
export class StaffBookingsApi {
  private readonly http = inject(HttpClient);

  getFilters() {
    return this.http.get<BookingFilterOptions>(`${API_BASE_URL}/staff/booking-filters`);
  }

  getReport(filters: ReportFilters) {
    const params: Record<string, string | number> = {
      from: filters.from,
      to: filters.to,
    };
    for (const key of ['branchPublicId', 'sportPublicId'] as const) {
      if (filters[key]) params[key] = filters[key];
    }
    return this.http.get<BookingReport>(`${API_BASE_URL}/staff/booking-report`, { params });
  }

  getList(query: BookingsQuery) {
    const params: Record<string, string | number> = {
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    };
    for (const key of [
      'branchPublicId',
      'sportPublicId',
      'courtPublicId',
      'status',
      'bookingType',
      'search',
    ] as const) {
      const value = query[key].trim();
      if (value) params[key] = value;
    }
    return this.http.get<BookingList>(`${API_BASE_URL}/staff/bookings`, { params });
  }
  getDetails(bookingType: BookingType, publicId: string) {
    return this.http.get<BookingDetails>(
      `${API_BASE_URL}/staff/bookings/${bookingType}/${encodeURIComponent(publicId)}`,
    );
  }
}
