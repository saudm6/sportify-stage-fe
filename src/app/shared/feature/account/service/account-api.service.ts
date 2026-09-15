import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../../../../core/urls';
import { AccountProfile, UpdateAccountRequest } from '../models/account-profile';

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/users/me`;

  load() {
    return this.http.get<AccountProfile | null>(this.url);
  }

  save({ name, contactNumber, email }: UpdateAccountRequest) {
    return this.http.patch<AccountProfile | null>(this.url, { name, contactNumber, email });
  }
}
