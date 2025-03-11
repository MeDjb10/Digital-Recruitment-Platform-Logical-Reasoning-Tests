import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './features/auth/components/auth-layout/auth-layout.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { SignupComponent } from './features/auth/pages/signup/signup.component';

import { HomeComponent } from './features/homepage/components/home/home.component';
import { DashboardComponent } from './features/dashboard/pages/dashboard/dashboard.component';
import { GeneralStatsComponent } from './features/dashboard/components/general-stats/general-stats.component';
import { UsersListComponent } from './features/dashboard/components/users-list/users-list.component';
import { StatsRLComponent } from './features/dashboard/components/stats-rl/stats-rl.component';
import { UsersListRLComponent } from './features/dashboard/components/users-list-rl/users-list-rl.component';
import { TestsListRLComponent } from './features/dashboard/components/tests-list-rl/tests-list-rl.component';


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
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(
        (m) => m.DashboardModule
      ),
    title: 'Dashboard - Digital Recruitment Platform',
  },
];
