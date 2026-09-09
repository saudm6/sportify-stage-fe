import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  { path: '', loadComponent: () => import('./containers/dashboard').then(m => m.Dashboard) },
];
