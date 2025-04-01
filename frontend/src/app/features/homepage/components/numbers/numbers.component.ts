import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import * as AOS from 'aos';

@Component({
  selector: 'app-numbers',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './numbers.component.html',
  styleUrl: './numbers.component.css'
})
export class NumbersComponent implements OnInit {
  ngOnInit() {
    AOS.init({
      duration: 1000,
      once: true,
      mirror: false
    });
  }
}
