import { Pipe, PipeTransform } from '@angular/core';
import { NamedReference } from '../../shared/models/booking-report';

@Pipe({ name: 'referenceName' })
export class ReferenceNamePipe implements PipeTransform {
  transform(value: NamedReference): string {
    return value.nameEn?.trim() || value.nameAr?.trim() || 'Not recorded';
  }
}

@Pipe({ name: 'recordedValue' })
export class RecordedValuePipe implements PipeTransform {
  transform(value: string | null): string {
    return value?.trim() || 'Not recorded';
  }
}
