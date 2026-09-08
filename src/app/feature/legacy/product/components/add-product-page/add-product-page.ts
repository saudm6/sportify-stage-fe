import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-add-product-page',
  imports: [ReactiveFormsModule],
  templateUrl: './add-product-page.html',
  styleUrl: './add-product-page.css',
})
export class AddProductPage {
  readonly productForm = input.required<FormGroup>();
  readonly isSubmitting = input(false);
  readonly errorMessage = input('');

  readonly submitted = output<void>();
  readonly cancelled = output<void>();
}
