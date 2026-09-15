export interface UpdateAccountRequest {
  name: string;
  contactNumber: string;
  email: string;
}

export interface AccountProfile extends UpdateAccountRequest {
  publicId: string;
  roles: { roleName: string; isActive: boolean }[];
}
