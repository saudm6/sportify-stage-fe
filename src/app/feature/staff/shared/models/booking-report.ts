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

export interface BookingReport extends BookingList {
  summary: BookingSummary;
  byBranch: BookingBreakdown[];
  bySport: BookingBreakdown[];
}

export interface BookingList {
  from: string;
  to: string;
  entries: BookingReportEntry[];
  pagination: Pagination;
  availableFilters: {
    branches: NamedReference[]; sports: NamedReference[];
    courts: (NamedReference & { branchPublicId: string; sportPublicId: string })[];
    statuses: BookingStatus[];
  };
}

export type BookingType = 'INTERNAL' | 'EXTERNAL';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
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
  status: BookingStatus;
  amount: number;
}
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
