import { Component, OnInit } from '@angular/core';
import * as AOS from 'aos';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-map-section',
  imports: [CommonModule, TranslateModule],
  templateUrl: './map-section.component.html',
  styleUrls: [] 
})
export class MapSectionComponent implements OnInit {
  ngOnInit(): void {
    AOS.init();
  }
}
