import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AboutUsComponent } from '../../components/about-us/about-us.component';
import { AboutUs2Component } from '../../components/about-us2/about-us2.component';
import { AboutUs3Component } from '../../components/about-us3/about-us3.component';
import { EmailerComponent } from '../../components/emailer/emailer.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { MapSectionComponent } from '../../components/map-section/map-section.component';
import { NumbersComponent } from '../../components/numbers/numbers.component';
import { ProcessusComponent } from '../../components/processus/processus.component';

@Component({
  selector: 'app-accueil',
  imports: [
      CommonModule,
      HeroSectionComponent,
      AboutUsComponent,
      ProcessusComponent,
      FooterComponent,
      NumbersComponent,
      AboutUs2Component,
      AboutUs3Component,
      MapSectionComponent,
      EmailerComponent
  ],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.css'
})
export class AccueilComponent {

}
