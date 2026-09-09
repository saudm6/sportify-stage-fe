import { Routes } from '@angular/router';
import { roleGuard } from '../../core/role.guard';

export const staffRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    canActivateChild: [roleGuard],
    data: { allowedRoles: ['ADMIN'] },
    loadComponent: () => import('../../layouts/staff/staff-layout').then(m => m.StaffLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.dashboardRoutes) },
    ],
  },
];
