export interface NamedReference {
  publicId: string;
  nameEn: string;
  nameAr: string;
}

export interface BookingSummary {
  totalBookings: number;
  totalBookingRevenue: number;
  averageBookingValue: number;
}

export interface BookingBreakdown extends NamedReference, BookingSummary {}

export interface BookingReport {
  from: string;
  to: string;
  summary: BookingSummary;
  byBranch: BookingBreakdown[];
  bySport: BookingBreakdown[];
  availableFilters: { branches: NamedReference[]; sports: NamedReference[] };
}
