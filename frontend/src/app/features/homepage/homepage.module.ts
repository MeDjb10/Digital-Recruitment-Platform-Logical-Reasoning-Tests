import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomepageRoutingModule } from './homepage-routing.module';

import { HomeComponent } from './pages/home/home.component';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { AboutUsComponent } from './components/about-us/about-us.component';
import { ProcessusComponent } from './components/processus/processus.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomepageNavbarComponent } from './components/navbar/navbar.component';
import { AccueilComponent } from './pages/accueil/accueil.component';

@NgModule({
  imports: [
    CommonModule,
    HomepageRoutingModule,
    HomeComponent,
    HeroSectionComponent,
    AboutUsComponent,
    ProcessusComponent,
    FooterComponent,
    HomepageNavbarComponent,
    AccueilComponent
  ],
})
export class HomepageModule {}
