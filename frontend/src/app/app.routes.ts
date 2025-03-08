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
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'signup', component: SignupComponent },
    ],
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: 'info', component: GeneralStatsComponent },
      { path: 'users', component: UsersListComponent },
      {
        path: 'RaisonnementLogique', children: [
          { path: 'Statistique', component: StatsRLComponent },
          { path: 'Users', component: UsersListRLComponent },
          { path: 'Tests', component: TestsListRLComponent },
          { path: '',redirectTo:'Staistique',pathMatch:'full' },
        ]
      },
      { path: '',redirectTo:'info',pathMatch:'full' },
    ]
  }
];
