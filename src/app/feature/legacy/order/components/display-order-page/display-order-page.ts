import { Component, inject, OnInit, signal, input, output } from '@angular/core';
import { OrderResponse, OrderStatusRequest } from '../../models/';

@Component({
  selector: 'app-display-order-page',
  imports: [],
  templateUrl: './display-order-page.html',
  styleUrl: './display-order-page.css',
})
export class DisplayOrderPage {
  readonly orderDisplay = input.required<readonly OrderResponse[]>();
  readonly errorMessage = input('');
  readonly isSubmitting = input(false);
  
  readonly displayOrder = output<void>();
  readonly statusChange = output<OrderStatusRequest>();
}
