import { Routes } from '@angular/router';
import { roleGuard } from '../../core/role.guard';
import { PAGE_PATHS } from '../../core/urls';

export const userRoutes: Routes = [
  { path: PAGE_PATHS.users, canActivate: [roleGuard], data: { allowedRoles: ['USER'] }, loadComponent: () => import('./containers/all-users-list/all-users-list').then(m => m.AllUsersList) },
];
