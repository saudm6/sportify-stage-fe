import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../../../../core/urls';
import {
  CreateProduct, ProductDataUpdate
} from '../models/index';
import { ProductDisplay } from '../models/product-display';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  protected httpClient = inject(HttpClient);
  protected apiProductUrl = `${API_BASE_URL}/product`;


  createProduct(request: CreateProduct): Observable<ProductDisplay>{
    return this.httpClient.post<ProductDisplay>(`${this.apiProductUrl}`, request);
  }

  getAllProducts(): Observable<ProductDisplay[]>{
    return this.httpClient.get<ProductDisplay[]>(`${this.apiProductUrl}`);
  }

  getProductById(productId: string): Observable<ProductDisplay>{
    return this.httpClient.get<ProductDisplay>(`${this.apiProductUrl}/${productId}`).pipe(
      map((response) => {
        const productData: ProductDisplay = {
          id: response.id,
          name: response.name,
          unitPrice: response.unitPrice,
          availableStock: response.availableStock,
          reservedStock: response.reservedStock
        };
        return productData;
      }),
    );
  }

  updateProductDataById(productId: string, productUpdateData: ProductDataUpdate): Observable<ProductDataUpdate>{
    return this.httpClient.patch<ProductDataUpdate>(`${this.apiProductUrl}/${productId}`, productUpdateData)
  }

}
