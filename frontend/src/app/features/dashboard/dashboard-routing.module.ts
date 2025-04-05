import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { GeneralStatsComponent } from './components/general-stats/general-stats.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { StatsRLComponent } from './components/stats-rl/stats-rl.component';
import { UsersListRLComponent } from './components/users-list-rl/users-list-rl.component';

import { CreateTestComponent } from './components/Raisonnement logic/create-test/create-test.component';
import { EditQuestionComponent } from './components/Raisonnement logic/edit-question/edit-question.component';
import { TestDetailsComponent } from './components/Raisonnement logic/test-details/test-details.component';
import { TestsListRLComponent } from './components/Raisonnement logic/tests-list-rl/tests-list-rl.component';
import { CreateQuestionComponent } from './components/Raisonnement logic/create-question/create-question.component';
import { CompletedUsersComponent } from './components/userDialogue/completed-users/completed-users.component';

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
          // Default route redirects to Tests
          { path: '', redirectTo: 'Tests', pathMatch: 'full' },

          // Tests routes
          {
            path: 'Tests',
            component: TestsListRLComponent,
            title: 'Logical Reasoning Tests',
          },
          {
            path: 'Tests/create',
            component: CreateTestComponent,
            title: 'Create New Test',
          },
          {
            path: 'Tests/:testId',
            children: [
              {
                path: '',
                component: TestDetailsComponent,
                title: 'Test Details',
              },
              {
                path: 'questions/create',
                component: CreateQuestionComponent,
                title: 'Create Question',
              },
              {
                path: 'questions/:questionId/edit',
                component: EditQuestionComponent,
                title: 'Edit Question',
              },
            ],
          },

          // Statistics route
          {
            path: 'Statistiques',
            component: StatsRLComponent,
            title: 'Test Statistics',
          },

          // Users route
          {
            path: 'Users',
            component: UsersListRLComponent,
            title: 'Test Users',
          },

          // Completed Users route
          {
            path: 'Users/completed/:id',
            component: CompletedUsersComponent,
            title: 'Test Results',
          },
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
