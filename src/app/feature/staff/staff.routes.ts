import { Routes } from '@angular/router';
import { roleGuard } from '../../core/role.guard';
import { PAGE_PATHS } from '../../core/urls';

export const staffRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    canActivateChild: [roleGuard],
    data: { allowedRoles: ['ADMIN', 'FINANCE', 'SUPERVISOR'] },
    children: [
      { path: '', redirectTo: PAGE_PATHS.dashboard, pathMatch: 'full' },
      { path: PAGE_PATHS.dashboard, loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.dashboardRoutes) },
      { path: PAGE_PATHS.bookings, loadComponent: () => import('./bookings/containers/bookings').then(m => m.Bookings) },
    ],
  },
];
