export interface RegistrationOptions {
  roles: { publicId: string; name: string; requiresCompany: boolean }[];
  companies: { publicId: string; nameEn: string; nameAr: string }[];
}
