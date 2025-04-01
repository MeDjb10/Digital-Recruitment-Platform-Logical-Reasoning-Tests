import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import * as AOS from 'aos';

@Component({
  selector: 'app-about-us2',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './about-us2.component.html',
  styleUrl: './about-us2.component.css'
})
export class AboutUs2Component implements OnInit {
  ngOnInit() {
    AOS.init({
      duration: 1000,
      once: true
    });
  }
}
