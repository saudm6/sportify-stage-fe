import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { jwtDecode, JwtPayload } from 'jwt-decode';

const roleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

export function hasStaffAccess(token = localStorage.getItem('authToken')): boolean {
  if (!token) return false;
  try {
    const payload = jwtDecode<JwtPayload & { [roleClaim]?: string | string[] }>(token);
    const roles = payload[roleClaim];
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
      && (Array.isArray(roles) ? roles.includes('ADMIN') : roles === 'ADMIN');
  } catch {
    return false;
  }
}

// Client navigation only; the report endpoint must enforce staff authorization too.
export const staffGuard: CanActivateFn = () => hasStaffAccess() || inject(Router).parseUrl('/login');
