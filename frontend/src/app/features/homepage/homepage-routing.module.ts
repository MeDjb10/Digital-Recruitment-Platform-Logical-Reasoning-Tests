
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AccueilComponent } from './pages/accueil/accueil.component';
import { ProfileComponent } from '../profile/pages/profile/profile.component';
import { TestSelectComponent } from '../candidate/testForm/test-select/test-select.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent, // This wraps your navbar + router outlet
    children: [
      {
        path: '',
        component: AccueilComponent, // This loads when path is exactly '/'
      },
      {
        path: 'profile',
        component: ProfileComponent,
      },
      {
        path: 'select',
        component: TestSelectComponent,
      },
      {
        path: 'tests',
        loadChildren: () =>
          import('../candidate/DominoTest/domino-test.module').then(
            (m) => m.DominoTestModule
          ),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomepageRoutingModule {}
