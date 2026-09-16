import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../../core/urls';
import { BookingType } from '../../shared/models/booking-report';
import { BookingDetails } from '../models/bookings';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private readonly http = inject(HttpClient);
  getDetails(bookingType: BookingType, publicId: string) {
    return this.http.get<BookingDetails>(
      `${API_BASE_URL}/staff/bookings/${bookingType}/${encodeURIComponent(publicId)}`,
    );
  }
}
