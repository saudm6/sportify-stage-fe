import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'staff', loadChildren: () => import('./feature/staff/staff.routes').then(m => m.staffRoutes) },
  { path: '', loadChildren: () => import('./feature/user/user.routes').then(m => m.userRoutes) },
  { path: '', loadChildren: () => import('./feature/legacy/legacy.routes').then(m => m.legacyRoutes) },
  { path: '**', redirectTo: 'login' },
];
