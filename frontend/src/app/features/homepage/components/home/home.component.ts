import { Component, OnInit } from '@angular/core';
import AOS from 'aos';
import { HeroSectionComponent } from "../hero-section/hero-section.component";
import { AboutUsComponent } from "../about-us/about-us.component";
import { ProcessusComponent } from "../processus/processus.component";
import { FooterComponent } from "../footer/footer.component";
@Component({
  selector: 'app-home',
  imports: [HeroSectionComponent, AboutUsComponent, ProcessusComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  constructor() {}
  ngOnInit() {
    AOS.init({
      duration: 1000,  // Animation duration (in ms)
      once: true,       // Run animation only once
    });
  }

}
