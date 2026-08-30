export interface LoginUserResponse {
  userId: string;
  hasAuthority: boolean;
  token: string | null;
  roles: string[];
}
