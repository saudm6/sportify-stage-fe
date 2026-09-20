import { ReportFilters } from '../models/report-filters';
import { validDate } from './dates';

export function validId(value: string): boolean {
  return (
    !value ||
    (value !== '00000000-0000-0000-0000-000000000000' &&
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value))
  );
}

export function validFilters(filters: ReportFilters): boolean {
  return (
    validDate(filters.from) &&
    validDate(filters.to) &&
    filters.from <= filters.to &&
    validId(filters.branchPublicId) &&
    validId(filters.sportPublicId)
  );
}
