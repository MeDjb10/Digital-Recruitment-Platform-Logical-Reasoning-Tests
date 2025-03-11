import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { GeneralStatsComponent } from './components/general-stats/general-stats.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { StatsRLComponent } from './components/stats-rl/stats-rl.component';
import { UsersListRLComponent } from './components/users-list-rl/users-list-rl.component';
import { TestsListRLComponent } from './components/tests-list-rl/tests-list-rl.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: 'info',
        component: GeneralStatsComponent,
        title: 'Dashboard Overview', // Added route title for better SEO and browser tab
      },
      {
        path: 'users',
        component: UsersListComponent,
        title: 'User Management',
      },
      {
        path: 'RaisonnementLogique',
        children: [
          {
            path: 'Statistique',
            component: StatsRLComponent,
            title: 'Logical Reasoning Statistics',
          },
          {
            path: 'Users',
            component: UsersListRLComponent,
            title: 'Logical Reasoning Users',
          },
          {
            path: 'Tests',
            component: TestsListRLComponent,
            title: 'Logical Reasoning Tests',
          },
          { path: '', redirectTo: 'Statistique', pathMatch: 'full' },
        ],
      },
      { path: '', redirectTo: 'info', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
