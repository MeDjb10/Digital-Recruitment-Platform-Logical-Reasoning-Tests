import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutUsComponent } from '../../components/about-us/about-us.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { ProcessusComponent } from '../../components/processus/processus.component';
import { AosService } from '../../../../core/services/aos.service';
import { HomepageNavbarComponent } from '../../components/navbar/navbar.component';
import { NumbersComponent } from "../../components/numbers/numbers.component";
import { AboutUs2Component } from "../../components/about-us2/about-us2.component";
import { AboutUs3Component } from "../../components/about-us3/about-us3.component";
import { MapSectionComponent } from "../../components/map-section/map-section.component";
import { EmailerComponent } from "../../components/emailer/emailer.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeroSectionComponent,
    AboutUsComponent,
    ProcessusComponent,
    FooterComponent,
    HomepageNavbarComponent,
    NumbersComponent,
    AboutUs2Component,
    AboutUs3Component,
    MapSectionComponent,
    EmailerComponent
],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  constructor(private aosService: AosService) {}

  ngOnInit() {
    this.aosService.init();
  }
}
