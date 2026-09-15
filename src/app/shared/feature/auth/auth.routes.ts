import { Routes } from '@angular/router';
import { PAGE_PATHS } from '../../../core/urls';

export const authRoutes: Routes = [
  {
    path: PAGE_PATHS.login,
    loadComponent: () =>
      import('./containers/login-user-list/login-user-list').then((m) => m.LoginUserList),
  },
  {
    path: PAGE_PATHS.register,
    loadComponent: () =>
      import('./containers/register-user-list/register-user-list').then((m) => m.RegisterUserList),
  },
  { path: 'users/register', redirectTo: PAGE_PATHS.register, pathMatch: 'full' },
];
