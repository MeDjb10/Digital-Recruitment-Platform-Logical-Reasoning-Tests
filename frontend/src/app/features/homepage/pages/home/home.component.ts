import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AosService } from '../../../../core/services/aos.service';
import { HomepageNavbarComponent } from '../../components/navbar/navbar.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HomepageNavbarComponent,
    RouterModule
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
