import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AUTH_API_URLS } from '../../../../core/urls';
import { LoginUserRequest } from '../models/login-user-request';
import { LoginUserResponse } from '../models/login-user-response';
import { RegisterUserRequest } from '../models/register-user-request';
import { RegistrationResponse } from '../models/registration-response';
import { RegistrationOptions } from '../models/registration-options';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly httpClient = inject(HttpClient);

  loginUser(request: LoginUserRequest): Observable<LoginUserResponse> {
    return this.httpClient.post<LoginUserResponse>(AUTH_API_URLS.login, request);
  }

  getRegistrationOptions(): Observable<RegistrationOptions> {
    return this.httpClient.get<RegistrationOptions>(AUTH_API_URLS.registrationOptions);
  }

  registerUser(request: RegisterUserRequest): Observable<RegistrationResponse> {
    const { contactNumber, name, email, password, rolePublicId, companyPublicId } = request;
    return this.httpClient.post<RegistrationResponse>(AUTH_API_URLS.register, {
      contactNumber,
      name,
      email,
      password,
      rolePublicId,
      companyPublicId,
    });
  }
}
