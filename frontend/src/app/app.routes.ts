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
    component: TestsListComponent,
    // canActivate: [AuthGuard],
  },
  {
    path: 'tests/:id',
    component: DominoTestModernComponent,
    // canActivate: [AuthGuard],
  },
  // Add a direct route to test the D70 test with enhanced UI
  {
    path: 'd70-enhanced',
    component: DominoTestModernComponent,
    data: { testId: 'd70' },
  },

  { 
    path: 'd70-modern', 
    component: DominoTestModernComponent
  },
  

  { path: 'test-completion', component: TestCompletionComponent },

  
  // Legacy routes - keep for backward compatibility
  { path: 'test-complete', component: TestCompleteComponent },



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
