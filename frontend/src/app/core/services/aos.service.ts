import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AosService {
  private initialized = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  init() {
    if (isPlatformBrowser(this.platformId) && !this.initialized) {
      import('aos').then(aos => {
        aos.init({
          duration: 800,
          easing: 'ease-in-out',
          once: false,
          mirror: true,
          offset: 100
        });
        this.initialized = true;
      });
    }
  }
}