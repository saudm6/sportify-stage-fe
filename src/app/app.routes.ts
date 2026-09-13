import { Routes } from '@angular/router';
import { PAGE_PATHS } from './core/urls';

export const routes: Routes = [
  { path: '', redirectTo: PAGE_PATHS.login, pathMatch: 'full' },
  { path: '', loadChildren: () => import('./shared/feature/auth/auth.routes').then(m => m.authRoutes) },
  { path: PAGE_PATHS.staff, loadChildren: () => import('./feature/staff/staff.routes').then(m => m.staffRoutes) },
  { path: '', loadChildren: () => import('./feature/user/user.routes').then(m => m.userRoutes) },
  { path: '', loadChildren: () => import('./feature/legacy/legacy.routes').then(m => m.legacyRoutes) },
  { path: '**', redirectTo: PAGE_PATHS.login },
];
