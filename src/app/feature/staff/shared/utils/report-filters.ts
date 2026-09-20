import { DatePreset, ReportFilters } from '../models/report-filters';

export function dateRange(preset: Exclude<DatePreset, 'custom'>, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Muscat',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => Number(parts.find((p) => p.type === name)!.value);
  const from = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
  const to = new Date(from);
  if (preset === 'week') {
    from.setUTCDate(from.getUTCDate() - ((from.getUTCDay() + 6) % 7));
    to.setTime(from.getTime());
    to.setUTCDate(to.getUTCDate() + 6);
  } else if (preset === 'month') {
    from.setUTCDate(1);
    to.setUTCMonth(to.getUTCMonth() + 1, 0);
  }
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function validId(value: string): boolean {
  return (
    !value ||
    (value !== '00000000-0000-0000-0000-000000000000' &&
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value))
  );
}

export function validFilters(filters: ReportFilters): boolean {
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '0001-01-01' &&
    value < '9999-12-31' &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  return (
    validDate(filters.from) &&
    validDate(filters.to) &&
    filters.from <= filters.to &&
    validId(filters.branchPublicId) &&
    validId(filters.sportPublicId)
  );
}
