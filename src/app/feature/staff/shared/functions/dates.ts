import { DatePreset } from '../models/report-filters';

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

export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '0001-01-01' &&
    value < '9999-12-31' &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
