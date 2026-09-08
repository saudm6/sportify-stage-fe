import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guard/auth.guard';

export const legacyRoutes: Routes = [
  { path: 'product', canActivate: [authGuard], loadComponent: () => import('./product/containers/product-display-list/product-display-list').then(m => m.ProductDisplayList) },
  { path: 'product/add', canActivate: [authGuard], loadComponent: () => import('./product/containers/add-product-list/add-product-list').then(m => m.AddProductList) },
  { path: 'order-line-item', canActivate: [authGuard], loadComponent: () => import('./order-line-item/containers/display-order-line-item-list/display-order-line-item-list').then(m => m.DisplayOrderLineItemList) },
  { path: 'order', canActivate: [authGuard], loadComponent: () => import('./order/containers/display-order-list/display-order-list').then(m => m.DisplayOrderList) },
];
