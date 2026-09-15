export interface RegisterUserRequest {
  contactNumber: string;
  name: string;
  email: string;
  password: string;
  rolePublicId: string;
  companyPublicId: string | null;
}
