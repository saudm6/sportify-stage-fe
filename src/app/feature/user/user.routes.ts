import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guard/auth.guard';

export const userRoutes: Routes = [
  { path: 'users', canActivate: [authGuard], loadComponent: () => import('./containers/all-users-list/all-users-list').then(m => m.AllUsersList) },
  { path: 'users/register', loadComponent: () => import('./containers/register-user-list/register-user-list').then(m => m.RegisterUserList) },
  { path: 'login', loadComponent: () => import('./containers/login-user-list/login-user-list').then(m => m.LoginUserList) },
];
