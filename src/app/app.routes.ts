import { Routes } from '@angular/router';
import { staffGuard } from './core/staff-access';
import { AllUsersList } from './feature/user/containers/all-users-list/all-users-list';
import { RegisterUserList } from './feature/user/containers/register-user-list/register-user-list';
import { LoginUserList } from './feature/user/containers/login-user-list/login-user-list';
import { authGuard } from './shared/guard/auth.guard';
import { AddProductList } from './feature/product/containers/add-product-list/add-product-list';
import { ProductDisplayList } from './feature/product/containers/product-display-list/product-display-list';
import { DisplayOrderLineItemList } from './feature/order-line-item/containers/display-order-line-item-list/display-order-line-item-list';
import { DisplayOrderList } from './feature/order/containers/display-order-list/display-order-list';
export const routes: Routes = [
    {
        path: 'staff',
        canActivate: [staffGuard],
        canActivateChild: [staffGuard],
        loadComponent: () => import('./layouts/staff/staff-layout').then(m => m.StaffLayout),
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadChildren: () => import('./feature/staff/dashboard/dashboard.routes').then(m => m.dashboardRoutes) },
        ],
    },
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'users', component: AllUsersList, canActivate: [authGuard] },
    { path: 'users/register', component: RegisterUserList },
    { path: 'login', component: LoginUserList },
    { path: 'product', component: ProductDisplayList, canActivate: [authGuard]},
    { path: 'product/add', component: AddProductList, canActivate: [authGuard]},
    { path: 'order-line-item', component: DisplayOrderLineItemList, canActivate: [authGuard]},
    { path: 'order', component: DisplayOrderList, canActivate: [authGuard]},
    { path: '**', redirectTo: 'login' },
];
