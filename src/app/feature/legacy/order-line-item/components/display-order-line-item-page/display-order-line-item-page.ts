import { Component, inject, OnInit, signal, input, output } from '@angular/core';
import { OrderLineItemResponse } from '../../models/';
import { InputModalityDetector } from '@angular/cdk/a11y';

@Component({
  selector: 'app-display-order-line-item-page',
  imports: [],
  templateUrl: './display-order-line-item-page.html',
  styleUrl: './display-order-line-item-page.css',
})
export class DisplayOrderLineItemPage {
  readonly orderLineItemDisplay = input.required<readonly OrderLineItemResponse[]>();
  readonly isSubmitting = input(false);
  readonly errorMessage = input('');

  readonly displayedOrderLineItem = output<void>();
  readonly addOrder = output<void>();
}
