import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../../../../core/urls';
import { OrderStatusRequest, OrderResponse } from '../models/';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  protected httpClient = inject(HttpClient);
  protected apiOrderUrl = `${API_BASE_URL}/order`;

  addOrder() : Observable<void> {
    return this.httpClient.post<void>(`${this.apiOrderUrl}`, null);
  }

  getOrder() : Observable<OrderResponse[]>{
    return this.httpClient.get<OrderResponse[]>(`${this.apiOrderUrl}`)
  }

  updateOrderStatus(request: OrderStatusRequest) : Observable<void> {
    return this.httpClient.post<void>(`${this.apiOrderUrl}/update-status`, request)
  }

}
