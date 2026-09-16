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
  entries: BookingReportEntry[];
  pagination: Pagination;
  availableFilters: {
    branches: NamedReference[]; sports: NamedReference[];
    courts: (NamedReference & { branchPublicId: string; sportPublicId: string })[];
    statuses: string[];
  };
}

export type BookingType = 'CUSTOMER' | 'EXTERNAL';
export interface BookingReportEntry {
  bookingPublicId: string;
  bookingType: BookingType;
  transactionReference: string | null;
  bookingStart: string;
  recordedAt: string;
  customerName: string;
  branch: NamedReference;
  court: NamedReference;
  sport: NamedReference;
  status: string;
  amount: number;
}
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
