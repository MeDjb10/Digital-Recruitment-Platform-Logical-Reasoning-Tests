import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { DashboardGuard } from './core/guards/dashboard.guard';

import { DominoLayoutBuilderComponent } from './features/candidate/canvaTest/domino-layout-builder/domino-layout-builder.component';
import { LayoutPreviewComponent } from './features/candidate/canvaTest/test/layoutPreview.component';
import { SavedLayoutsComponent } from './features/candidate/canvaTest/test/savedLayout.component';
import { LayoutTestDemoComponent } from './features/candidate/canvaTest/test/layoutTestDemo.component';


import { TestsListComponent } from './features/candidate/DominoTest/pages/tests-list/tests-list.component';

import { TestCompleteComponent } from './features/candidate/DominoTest/pages/test-complete/test-complete.component';
import { TestCompletionComponent } from './features/candidate/DominoTest/pages/test-completion/test-completion.component';
import { DominoTestModernComponent } from './features/candidate/DominoTest/pages/domino-test-modern/domino-test-modern.component';
import { ApplicationFormComponent } from './features/candidate/testForm/application-form/application-form.component';
import { TestSelectComponent } from './features/candidate/testForm/test-select/test-select.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'home',
    title: 'Home - Digital Recruitment Platform',
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
    path: 'apply',
    component: ApplicationFormComponent,
    canActivate: [AuthGuard],
    title: 'Application Form - Digital Recruitment Platform',
  },

  {
    path:'select',
    component:TestSelectComponent
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

  // Test routes-------------------------------
  {
    path: 'tests',
    loadChildren: () =>
      import('./features/candidate/DominoTest/domino-test.module').then(
        (m) => m.DominoTestModule
      ),
  },

  {
    path: 'admin/layout-builder',
    component: DominoLayoutBuilderComponent,
  },
  {
    path: 'admin/saved-layouts',
    component: SavedLayoutsComponent,
  },

  {
    path: 'admin/layout-preview/:id',
    component: LayoutPreviewComponent,
  },

  {
    path: 'test/layout-demo',
    component: LayoutTestDemoComponent,
  },

  //----------------------------------------

  {
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
