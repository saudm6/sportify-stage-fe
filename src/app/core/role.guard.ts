import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { jwtDecode, JwtPayload } from 'jwt-decode';

const roleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

export function hasAnyRole(allowedRoles: readonly string[], token = localStorage.getItem('authToken')): boolean {
  if (!token) return false;
  try {
    const payload = jwtDecode<JwtPayload & { [roleClaim]?: string | string[] }>(token);
    const roles = payload[roleClaim];
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
      && allowedRoles.some(role => Array.isArray(roles) ? roles.includes(role) : roles === role);
  } catch {
    return false;
  }
}

// Client navigation only; the report endpoint must enforce staff authorization too.
export const roleGuard: CanActivateFn = route => {
  const policies = route.pathFromRoot.map(part => part.data['allowedRoles']).filter(roles => roles !== undefined);
  const allowed = policies.length > 0 && policies.every(roles =>
    Array.isArray(roles) && roles.every(role => typeof role === 'string') && hasAnyRole(roles));
  return allowed || inject(Router).parseUrl('/login');
};
