import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { DashboardGuard } from './core/guards/dashboard.guard';
import { TestCompleteComponent } from './features/candidate/pages/test-complete/test-complete.component';
import { TestCompletionComponent } from './features/candidate/pages/test-completion/test-completion.component';
import { InteractiveDominoTestComponent } from './features/candidate/pages/interactive-domino-test/interactive-domino-test.component';
import { DominoTestComponent } from './features/candidate/pages/domino-test/domino-test.component';
import { TestResultsComponent } from './features/candidate/pages/test-results/test-results.component';

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

  // Test routes
  {
    path: 'tests/:id',
    component: DominoTestComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'tests/:id/results',
    component: TestResultsComponent,
    canActivate: [AuthGuard],
  },

  { path: 'test-completion', component: TestCompletionComponent },

  {
    path: 'interactive-domino-test',
    component: InteractiveDominoTestComponent,
  },

  // Legacy routes - keep for backward compatibility
  { path: 'test-complete', component: TestCompleteComponent },

  {
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
