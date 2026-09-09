import { Component, computed, inject, OnInit, } from '@angular/core';
// import { UserService } from '../../service';
// import { Router } from '@angular/router';
// import { UserData } from '../../models/user-data';
// import { AllUsersPage } from '../../components/page/all-users-page/all-users-page';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
// import { EditUsersDialog } from '../../components/dialog/edit-users-dialog/edit-users-dialog';
// import { DeleteUserDialog } from '../../components/dialog/delete-user-dialog/delete-user-dialog';
import { Router } from '@angular/router';
import { RxState, rxState } from '@rx-angular/state';
import { AsyncPipe } from '@angular/common';
import { finalize, Observable } from 'rxjs';
import { ProductService } from '../../service/product.service';
import { ProductDisplay } from '../../models';
import { ProductDisplayPage } from '../../components/product-display-page/product-display-page';
import { AddProductList } from '../add-product-list/add-product-list';
import { OrderLineItemService } from '../../../order-line-item/service/order-line-item.service';

interface ProductDisplayState {
  products: ProductDisplay[];
  isSubmitting: boolean;
  errorMessage: string;
}

type ViewModel = ProductDisplayState;

@Component({
  selector: 'app-product-display-list',
  imports: [ProductDisplayPage, AsyncPipe],
  providers: [RxState],
  templateUrl: './product-display-list.html',
  styleUrl: './product-display-list.css',
})
export class ProductDisplayList {

  private readonly state = rxState<ProductDisplayState>();
  
  vm$: Observable<ViewModel>;

  private readonly router = inject(Router);
  private readonly orderLineItemService = inject(OrderLineItemService);

  constructor () {
    const productService = inject(ProductService);

    this.state.set({
      products: [],
      isSubmitting: false,
      errorMessage: '',
    });

    this.state.connect(
      'products',
      productService.getAllProducts()
    );

    this.vm$ = this.state.select();
  }

  goToAddProduct(): void {
    this.router.navigate(['/product/add']);
  }

  addOrderLineItem(items: {
    productId: string;
    quantity: number;
  }): void {

    if (this.state.get('isSubmitting')) {
      return
    }

    if (!Number.isInteger(items.quantity) || items.quantity < 1){
      this.state.set({ errorMessage: 'Quantity must be at least 1' });
      return;
    }

    this.state.set({
      isSubmitting: true,
      errorMessage: '',
    });

    const request = {
      productId: items.productId,
      quantity: items.quantity,
    }

    this.orderLineItemService.addOrderLineItem(request).pipe(
      finalize(() => {
        this.state.set({ isSubmitting: false});
      })
    )
    .subscribe({
      next: () => {
        this.state.set({ errorMessage: '' });
      },
      error: (error) => {
        console.log('Unable to add OrderLineItem', error);

        this.state.set({ errorMessage: 'Unable to add OrderLineItem' });
      },
    });
  }
}
