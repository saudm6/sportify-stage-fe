import { hasStaffAccess } from './staff-access';

describe('Staff access', () => {
  const token = (roles: unknown, exp = Date.now() / 1000 + 300) =>
    `e30.${btoa(JSON.stringify({ exp, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': roles }))}.signature`;
  it('accepts the backend ADMIN role as a string or multi-role array', () => {
    expect(hasStaffAccess(token('ADMIN'))).toBe(true);
    expect(hasStaffAccess(token(['USER', 'ADMIN']))).toBe(true);
  });
  it('rejects customers, unknown roles, missing roles, expired and malformed tokens', () => {
    for (const value of [null, 'invalid', token('USER'), token('STAFF'), token(undefined), token('ADMIN', 1)]) {
      expect(hasStaffAccess(value)).toBe(false);
    }
  });
});
