import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AUTH_API_URLS } from '../../../../core/urls';
import { LoginUserRequest } from '../models/login-user-request';
import { LoginUserResponse } from '../models/login-user-response';
import { RegisterUserRequest } from '../models/register-user-request';
import { RegistrationResponse } from '../models/registration-response';

// USER mapping verified in the project development database on 2026-09-13.
// The API independently rejects every role other than USER.
const customerRoleId = 1;

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly httpClient = inject(HttpClient);

  loginUser(request: LoginUserRequest): Observable<LoginUserResponse> {
    return this.httpClient.post<LoginUserResponse>(AUTH_API_URLS.login, request);
  }

  registerUser(request: Omit<RegisterUserRequest, 'roleId'>): Observable<RegistrationResponse> {
    const { contactNumber, name, email, password } = request;
    return this.httpClient.post<RegistrationResponse>(AUTH_API_URLS.register, {
      contactNumber,
      name,
      email,
      password,
      roleId: customerRoleId,
    });
  }
}
