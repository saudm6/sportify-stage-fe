import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { LOGIN_URL, PAGE_PATHS } from './urls';

const roleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const supportedRoles = ['ADMIN', 'USER'];

interface Session {
  token: string;
  roles: string[];
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly currentSession = signal<Session | null>(null);
  readonly session = this.currentSession.asReadonly();
  private expiryTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.getToken();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
  }

  getToken(): string | null {
    const token = localStorage.getItem('authToken');
    const session = this.readSession(token);
    if (!session || !session.roles.some(role => supportedRoles.includes(role))) {
      const hadSession = this.session() !== null;
      this.clearSession();
      if (hadSession) void this.router.navigateByUrl(LOGIN_URL);
      return null;
    }
    if (this.session()?.token !== token) this.setSession(session);
    return token;
  }

  acceptLogin(response: { hasAuthority: boolean; token: string | null } | null): string | null {
    this.clearSession();
    if (response?.hasAuthority !== true) return 'Invalid email or password.';
    const session = this.readSession(response.token);
    if (!session) return 'The sign-in service returned an invalid session. Please try again.';
    if (!session.roles.some(role => supportedRoles.includes(role))) {
      return '404 Not Found';
    }
    localStorage.setItem('authToken', session.token);
    this.setSession(session);
    return null;
  }

  hasAnyRole(roles: readonly string[]): boolean {
    if (!this.getToken()) return false;
    const currentRoles = this.session()?.roles ?? [];
    return roles.some(role => currentRoles.includes(role));
  }

  destination(): UrlTree {
    if (!this.getToken()) return this.router.parseUrl(LOGIN_URL);
    return this.router.createUrlTree(this.session()?.roles.includes('ADMIN')
      ? ['/', PAGE_PATHS.staff, PAGE_PATHS.dashboard]
      : [`/${PAGE_PATHS.products}`]);
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl(LOGIN_URL);
  }

  private readSession(token: string | null): Session | null {
    if (typeof token !== 'string' || token.split('.').length !== 3) return null;
    try {
      // Decoding controls client navigation; the API verifies signatures and authorization.
      const payload = jwtDecode<JwtPayload & { [roleClaim]?: unknown }>(token);
      const claim = payload[roleClaim];
      const roles = typeof claim === 'string' ? [claim] : claim;
      if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp * 1000)
        || payload.exp * 1000 <= Date.now() || !Array.isArray(roles)
        || !roles.length || !roles.every(role => typeof role === 'string' && role.length > 0)) return null;
      return { token, roles, expiresAt: payload.exp * 1000 };
    } catch {
      return null;
    }
  }

  private setSession(session: Session): void {
    clearTimeout(this.expiryTimer);
    this.currentSession.set(session);
    this.expiryTimer = setTimeout(() => {
      if (this.getToken()) this.setSession(this.session()!);
    }, Math.min(session.expiresAt - Date.now(), 2_147_483_647));
  }

  private clearSession(): void {
    clearTimeout(this.expiryTimer);
    localStorage.removeItem('authToken');
    this.currentSession.set(null);
  }
}
