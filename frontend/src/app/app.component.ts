import { CommonModule } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import AOS from 'aos';




@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TranslateModule],

  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'Cofat';
  currentLang: string;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private translate: TranslateService
  ) {
    // Initialize translate service
    this.translate.addLangs(['en', 'fr']);

    // Get browser language or use default
    const browserLang = this.translate.getBrowserLang();
    this.currentLang = browserLang?.match(/en|fr/) ? browserLang : 'en';
    this.translate.use(this.currentLang);
  }

  ngOnInit() {
    // Only initialize AOS in browser environment
    if (isPlatformBrowser(this.platformId)) {
      AOS.init({
        duration: 1000,
        once: true,
      });
    }
  }

  // Method to change the language
  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
  }
}
