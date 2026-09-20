import { afterRenderEffect, Directive, ElementRef, inject, input, output } from '@angular/core';
import { BookingIdentity } from '../models/bookings';

@Directive({
  selector: '[bookingDetailFocus]',
  host: {
    '(click)': 'rememberTrigger($event)',
    '(keydown.escape)': 'escape()',
  },
})
export class BookingDetailFocus {
  readonly bookingDetailFocus = input<BookingIdentity | null>(null);
  readonly dismissDetails = output();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private trigger: HTMLElement | null = null;
  private focusedIdentity = '';

  constructor() {
    afterRenderEffect(() => {
      const row = this.bookingDetailFocus();
      const key = row ? `${row.bookingType}:${row.bookingPublicId}` : '';
      if (key === this.focusedIdentity) return;
      if (key) this.element.querySelector<HTMLElement>('#detail-heading')?.focus();
      else if (this.focusedIdentity)
        (this.trigger?.isConnected
          ? this.trigger
          : this.element.querySelector<HTMLElement>('#list-heading')
        )?.focus();
      this.focusedIdentity = key;
    });
  }

  rememberTrigger(event: Event): void {
    const trigger =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('button[aria-controls="booking-detail"]')
        : null;
    if (trigger) this.trigger = trigger;
  }

  escape(): void {
    if (this.bookingDetailFocus()) this.dismissDetails.emit();
  }
}
