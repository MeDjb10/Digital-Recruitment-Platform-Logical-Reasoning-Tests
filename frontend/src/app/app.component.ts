import { CommonModule } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
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
    private translate: TranslateService,
    private router: Router
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
        // Core settings
        duration: 800, // Slightly faster than default (1000ms) for better responsiveness
        easing: 'ease-out', // Smoother, more natural easing
        once: true, // Animations occur only once - better for performance
        mirror: false, // No "reverse" animations when scrolling back up

        // Performance optimizations
        throttleDelay: 99, // Throttle events for better performance
        offset: 120, // Trigger animations a bit earlier for a more natural feel
        delay: 0, // No default delay

        // Responsive behavior
        disable: false, // Enable on all devices
        startEvent: 'DOMContentLoaded', // Trigger on DOM load rather than window load

        // Advanced settings
        anchorPlacement: 'top-bottom', // Trigger when top of element reaches bottom of viewport
        disableMutationObserver: false, // Keep mutation observer for dynamic content
      });

      // Refresh AOS on route changes for single-page applications
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          setTimeout(() => {
            AOS.refresh();
          }, 100);
        }
      });

      // Add window resize handler to ensure animations stay aligned
      window.addEventListener(
        'resize',
        () => {
          AOS.refresh();
        },
        { passive: true }
      );
    }
  }

  // Method to change the language
  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
  }
}
