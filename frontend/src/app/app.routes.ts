import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { DashboardGuard } from './core/guards/dashboard.guard';

import { DominoLayoutBuilderComponent } from './features/candidate/canvaTest/domino-layout-builder/domino-layout-builder.component';


import { ApplicationFormComponent } from './features/candidate/testForm/application-form/application-form.component';
import { TestSelectComponent } from './features/candidate/testForm/test-select/test-select.component';
import { ProfileComponent } from './features/profile/pages/profile/profile.component';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/homepage/homepage.module').then((m) => m.HomepageModule),
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
        path: 'tests',
        loadChildren: () =>
          import('./features/candidate/DominoTest/domino-test.module').then(
            (m) => m.DominoTestModule
          ),
  },
  {
    path: 'apply',
    component: ApplicationFormComponent,
  },
  {
    path: 'admin/layout-builder',
    component: DominoLayoutBuilderComponent,
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
