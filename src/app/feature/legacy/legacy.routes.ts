import { Routes } from '@angular/router';
import { roleGuard } from '../../core/role.guard';
import { PAGE_PATHS } from '../../core/urls';

export const legacyRoutes: Routes = [
  { path: PAGE_PATHS.products, canActivate: [roleGuard], data: { allowedRoles: ['USER'] }, loadComponent: () => import('./product/containers/product-display-list/product-display-list').then(m => m.ProductDisplayList) },
  { path: PAGE_PATHS.addProduct, canActivate: [roleGuard], data: { allowedRoles: ['USER'] }, loadComponent: () => import('./product/containers/add-product-list/add-product-list').then(m => m.AddProductList) },
  { path: PAGE_PATHS.orderLineItems, canActivate: [roleGuard], data: { allowedRoles: ['USER'] }, loadComponent: () => import('./order-line-item/containers/display-order-line-item-list/display-order-line-item-list').then(m => m.DisplayOrderLineItemList) },
  { path: PAGE_PATHS.orders, canActivate: [roleGuard], data: { allowedRoles: ['USER'] }, loadComponent: () => import('./order/containers/display-order-list/display-order-list').then(m => m.DisplayOrderList) },
];
