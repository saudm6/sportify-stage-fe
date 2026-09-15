export interface RegistrationResponse {
  publicId: string;
  name: string;
  contactNumber: string;
  email: string;
  roles: { roleId: number; roleName: string; isActive: boolean }[];
}
