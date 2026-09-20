export type DatePreset = 'today' | 'week' | 'month' | 'custom';
export interface ReportFilters {
  from: string;
  to: string;
  branchPublicId: string;
  sportPublicId: string;
}
