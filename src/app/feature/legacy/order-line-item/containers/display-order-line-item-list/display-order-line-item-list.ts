import { Component, computed, inject, OnInit, } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RxState, rxState } from '@rx-angular/state';
import { AsyncPipe } from '@angular/common';
import { finalize, Observable } from 'rxjs';
import { OrderLineItemService } from '../../../order-line-item/service/order-line-item.service';
import { DisplayOrderLineItemPage } from '../../components/display-order-line-item-page/display-order-line-item-page';
import { OrderLineItemResponse } from '../../models';
import { FormBuilder, Validators } from '@angular/forms';
import { OrderService } from '../../../order/service/order.service';

interface DisplayOrderLineItemState {
  orderLineItemsResponse: OrderLineItemResponse[];
  isSubmitting: boolean,
  errorMessage: string,
}

type ViewModel = DisplayOrderLineItemState;

@Component({
  selector: 'app-display-order-line-item-list',
  imports: [DisplayOrderLineItemPage, AsyncPipe],
  providers: [RxState],
  templateUrl: './display-order-line-item-list.html',
  styleUrl: './display-order-line-item-list.css',
})
export class DisplayOrderLineItemList {
  
  private readonly state = rxState<DisplayOrderLineItemState>();

  vm$: Observable<ViewModel>;

  readonly router = inject(Router);
  readonly orderLineItemService = inject(OrderLineItemService);
  readonly orderService = inject(OrderService)

  constructor() {
    this.state.set({
      orderLineItemsResponse: [],
      isSubmitting: false,
      errorMessage: '',
    });

    this.state.connect('orderLineItemsResponse', this.orderLineItemService.getOrderLineItem());

    this.vm$ = this.state.select();
  }

  addOrder() {
    if (this.state.get('isSubmitting')){
      return;
    }

    this.state.set({
      isSubmitting: true,
    })

    
    this.orderService.addOrder().pipe(
      finalize(() => {
        this.state.set({ isSubmitting: false });
      }),
    )
    .subscribe({
      next: () => {
        this.router.navigate(['order']);
      },
      error: (error) => {
        console.error('Unable to get Add Order Line Items to Orders', error)
        this.state.set({ errorMessage: 'Unable to get Add Order Line Items to Orders' });
      },
    });
  }
}
