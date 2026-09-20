import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'bookingDate' })
export class BookingDatePipe implements PipeTransform {
  private readonly dateFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Muscat',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  private readonly timeFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Muscat',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  transform(value: string | null, format: 'date' | 'time' | 'dateTime' = 'dateTime'): string {
    if (!value) return format === 'time' ? '' : 'Not recorded';
    // Timestamps without an offset are local booking times in Oman.
    const timestamp = new Date(
      /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}+04:00`,
    );
    const valid = !Number.isNaN(timestamp.getTime());
    const date = valid ? this.dateFormat.format(timestamp) : 'Not recorded';
    const time = valid ? this.timeFormat.format(timestamp) : '';
    if (format === 'date') return date;
    if (format === 'time') return time;
    return `${date} · ${time}`;
  }
}
