import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RxState, rxState } from '@rx-angular/state';
import { finalize, Observable } from 'rxjs';
import { ProductService } from '../../service/product.service';
import { AddProductPage } from '../../components/add-product-page/add-product-page';
import { AsyncPipe } from '@angular/common';

interface ProductState {
  isSubmitting: boolean;
  errorMessage: string;
}

type ViewModel = ProductState;

@Component({
  selector: 'app-add-product-list',
  imports: [AddProductPage, AsyncPipe],
  providers: [RxState],
  templateUrl: './add-product-list.html',
  styleUrl: './add-product-list.css',
})

export class AddProductList {

  private readonly state = rxState<ProductState>();
  vm$: Observable<ViewModel>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    unitPrice: ['', [Validators.required]],
    availableStock: ['', [Validators.required]],
    reservedStock: ['', [Validators.required]],
  });

  constructor() {
    this.state.set({ isSubmitting: false, errorMessage: '' });

    this.vm$ = this.state.select();
  }

  addProduct(): void {
    if (this.productForm.invalid){
      this.productForm.markAllAsTouched();
      return;
    }

    if (this.state.get('isSubmitting')){
      return;
    }

    this.state.set({
      isSubmitting: true,
      errorMessage: '',
    });
    
    const formValues = this.productForm.getRawValue();

    const request = {
      name: formValues.name,
      unitPrice: Number(formValues.unitPrice),
      availableStock: Number(formValues.availableStock),
      reservedStock: Number(formValues.reservedStock),
    }

    this.productService.createProduct(request)
    .pipe(
      finalize(() => {
        this.state.set({ isSubmitting: false });
    }),
  )
  .subscribe({
    next: () => {
      this.router.navigate(['/product'])
    },
    error: (error) => {
      console.error('Unable to add product:', error);

      this.state.set({
        errorMessage: 'Unable to add product.'
      });
    },
  });
}

  cancel(): void {
    if (!this.state.get('isSubmitting')) {
      this.router.navigate(['/product']);
    }
  }
}
