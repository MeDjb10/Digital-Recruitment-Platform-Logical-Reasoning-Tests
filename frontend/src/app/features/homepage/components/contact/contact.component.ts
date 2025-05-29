import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as AOS from 'aos';
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-contact',
  imports: [FooterComponent],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit, AfterViewInit {
  isLoading = true;

  constructor() {}

  ngOnInit() {
    // Initialize loading state
    this.isLoading = true;
  }

  ngAfterViewInit() {
    // Initialize AOS with a slight delay to ensure DOM is ready
    setTimeout(() => {
      AOS.init({
        duration: 800,
        once: true,
        offset: 50,
        delay: 50
      });
      this.isLoading = false;
    }, 100);
  }
}
