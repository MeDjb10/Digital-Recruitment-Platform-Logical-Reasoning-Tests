import { Component, OnInit } from '@angular/core';
import { FooterComponent } from "../footer/footer.component";
import * as AOS from 'aos';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'app-a-propos',
  imports: [FooterComponent,TranslateModule],
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
