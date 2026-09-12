import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

// Client navigation only; the report endpoint must enforce staff authorization too.
export const roleGuard: CanActivateFn = route => {
  const auth = inject(AuthService);
  if (!auth.getToken()) return auth.destination();
  const policies = route.pathFromRoot.map(part => part.data['allowedRoles']).filter(roles => roles !== undefined);
  const allowed = policies.length > 0 && policies.every(roles =>
    Array.isArray(roles) && roles.every(role => typeof role === 'string') && auth.hasAnyRole(roles));
  return allowed || auth.destination();
};
