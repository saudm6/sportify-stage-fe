import { Routes } from '@angular/router';
import { roleGuard } from '../../core/role.guard';
import { PAGE_PATHS } from '../../core/urls';

export const staffRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    canActivateChild: [roleGuard],
    data: { allowedRoles: ['ADMIN', 'FINANCE', 'SUPERVISOR'] },
    loadComponent: () => import('../../layouts/staff/staff-layout').then(m => m.StaffLayout),
    children: [
      { path: '', redirectTo: PAGE_PATHS.dashboard, pathMatch: 'full' },
      { path: PAGE_PATHS.dashboard, loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.dashboardRoutes) },
    ],
  },
];
