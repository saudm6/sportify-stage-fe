import { Component, computed, inject, OnInit, } from '@angular/core';
import { OrderStatusRequest, OrderResponse } from '../../models';
import { rxState, RxState } from '@rx-angular/state';
import { finalize, Observable } from 'rxjs';
import { OrderService } from '../../service/order.service';
import { Router } from '@angular/router';
import { DisplayOrderPage } from '../../components/display-order-page/display-order-page';
import { AsyncPipe } from '@angular/common';


interface DisplayOrderListState {
  orderListResponse: OrderResponse[];
  isSubmitting: boolean;
  errorMessage: string;
}

type ViewModel = DisplayOrderListState;

@Component({
  selector: 'app-display-order-list',
  imports: [DisplayOrderPage, AsyncPipe],
  providers: [RxState],
  templateUrl: './display-order-list.html',
  styleUrl: './display-order-list.css',
})
export class DisplayOrderList {

  private readonly state = rxState<DisplayOrderListState>();

  vm$: Observable<ViewModel>;

  readonly router = inject(Router);
  readonly orderService = inject(OrderService)

  constructor() {
    this.state.set({ 
      orderListResponse: [],
      isSubmitting: false,
      errorMessage: '',
    });

    this.state.connect('orderListResponse', this.orderService.getOrder());

    this.vm$ = this.state.select();
  }

  updateOrderStatus(order : OrderStatusRequest) : void {

    this.state.set({ isSubmitting: true });

    this.orderService.updateOrderStatus(order).pipe(
      finalize(() => {
        this.state.set({ isSubmitting: false });
      }),
    )
    .subscribe({
      next: () => {
        this.state.set({ errorMessage: '' });
        this.refreshPage();
      },
      error: (error) => {
        console.log('Unable to update order status', error);
        this.state.set({ errorMessage: 'Unable to update order status' });
      }
    });
  }

  refreshPage(): void {
    window.location.reload();
  }
}
