import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function contains(pattern: RegExp, errorKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');

    if (!value) {
      return null;
    }

    return pattern.test(value)
      ? null
      : { [errorKey]: true };
  };
}

export const notBlank = contains(/\S/, 'blank');
