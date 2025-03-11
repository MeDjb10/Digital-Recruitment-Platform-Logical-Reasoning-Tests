import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { AboutUsComponent } from './components/about-us/about-us.component';
import { ProcessusComponent } from './components/processus/processus.component';
import { FooterComponent } from './components/footer/footer.component';

// Define routes for the home feature
const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    HomeComponent,
    HeroSectionComponent,
    AboutUsComponent,
    ProcessusComponent,
    FooterComponent,
  ],
})
export class HomepageModule {}
