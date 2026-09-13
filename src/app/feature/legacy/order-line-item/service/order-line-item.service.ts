import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../../../../core/urls';
import {
  OrderLineItemRequest,
  OrderLineItemResponse
} from '../models/';

@Injectable({
  providedIn: 'root',
})
export class OrderLineItemService {
  protected httpClient = inject(HttpClient);
  protected apiOrderLineItemUrl = `${API_BASE_URL}/order_line_item`;

  addOrderLineItem(request: OrderLineItemRequest) : Observable<void> {
    return this.httpClient.post<void>(`${this.apiOrderLineItemUrl}`, request);
  }

  getOrderLineItem() : Observable<OrderLineItemResponse[]>{
    return this.httpClient.get<OrderLineItemResponse[]>(`${this.apiOrderLineItemUrl}`)
  }


//   createProduct(request: CreateProduct): Observable<ProductDisplay>{
//     return this.httpClient.post<ProductDisplay>(`${this.apiProductUrl}`, request);
//   }

//   getAllProducts(): Observable<ProductDisplay[]>{
//     return this.httpClient.get<ProductDisplay[]>(`${this.apiProductUrl}`);
//   }

//   getProductById(productId: string): Observable<ProductDisplay>{
//     return this.httpClient.get<ProductDisplay>(`${this.apiProductUrl}/${productId}`).pipe(
//       map((response) => {
//         const productData: ProductDisplay = {
//           id: response.id,
//           name: response.name,
//           unitPrice: response.unitPrice,
//           availableStock: response.availableStock,
//           reservedStock: response.reservedStock
//         };
//         return productData;
//       }),
//     );
//   }

//   updateProductDataById(productId: string, productUpdateData: ProductDataUpdate): Observable<ProductDataUpdate>{
//     return this.httpClient.patch<ProductDataUpdate>(`${this.apiProductUrl}/${productId}`, productUpdateData)
//   }

}
