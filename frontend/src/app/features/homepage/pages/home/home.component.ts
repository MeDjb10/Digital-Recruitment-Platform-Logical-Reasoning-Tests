import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutUsComponent } from '../../components/about-us/about-us.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { HeroSectionComponent } from '../../components/hero-section/hero-section.component';
import { ProcessusComponent } from '../../components/processus/processus.component';
import { AosService } from '../../../../core/services/aos.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeroSectionComponent,
    AboutUsComponent,
    ProcessusComponent,
    FooterComponent,
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
