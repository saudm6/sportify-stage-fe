import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../../core/urls';
import { BookingList, BookingType } from '../../shared/models/booking-report';
import { BookingDetails, BookingsQuery } from '../models/bookings';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly http = inject(HttpClient);
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
