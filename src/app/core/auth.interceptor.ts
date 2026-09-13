import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL, AUTH_API_URLS } from './urls';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const url = new URL(req.url, window.location.origin);
  const requestUrl = url.origin + url.pathname.replace(/\/$/, '');
  const isNonAuthApi = requestUrl.startsWith(`${API_BASE_URL}/`)
    && !Object.values(AUTH_API_URLS).includes(requestUrl);
  const token = auth.getToken();
  if (!isNonAuthApi || !token) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.getToken() === token) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
