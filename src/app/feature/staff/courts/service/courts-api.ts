import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../../../core/urls';
import { CourtDetails, CourtFilters, CourtList, CreateCourt, UpdateCourt } from '../models/courts';

@Injectable({ providedIn: 'root' })
export class CourtsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/staff/courts`;

  list(filters: CourtFilters) {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    return this.http.get<CourtList>(this.url, { params });
  }

  details(publicId: string) {
    return this.http.get<CourtDetails>(`${this.url}/${encodeURIComponent(publicId)}`);
  }

  create(request: CreateCourt) {
    return this.http.post<CourtDetails>(this.url, request);
  }

  update(publicId: string, request: UpdateCourt) {
    return this.http.put<CourtDetails>(`${this.url}/${encodeURIComponent(publicId)}`, request);
  }
}
