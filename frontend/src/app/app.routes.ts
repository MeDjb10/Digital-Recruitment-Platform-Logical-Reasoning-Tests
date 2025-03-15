import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { DashboardGuard } from './core/guards/dashboard.guard';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'home',

    loadChildren: () =>
      import('./features/homepage/homepage.module').then(
        (m) => m.HomepageModule
      ),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'dashboard',
    canActivate: [DashboardGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(
        (m) => m.DashboardModule
      ),
    title: 'Dashboard - Digital Recruitment Platform',
  },
  {
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
