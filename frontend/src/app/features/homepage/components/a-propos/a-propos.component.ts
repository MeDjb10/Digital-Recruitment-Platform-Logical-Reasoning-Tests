import { Component, OnInit } from '@angular/core';
import { FooterComponent } from "../footer/footer.component";
import * as AOS from 'aos';

@Component({
  selector: 'app-a-propos',
  imports: [FooterComponent],
  templateUrl: './a-propos.component.html',
  styleUrl: './a-propos.component.css'
})
export class AProposComponent implements OnInit {
  ngOnInit() {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100
    });
  }
}
