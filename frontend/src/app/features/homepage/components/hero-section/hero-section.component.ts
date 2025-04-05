import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [RouterLink, TranslateModule, CommonModule],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css',
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  // To track animation states
  isContentVisible = true;
  private langChangeSubscription: Subscription | null = null;

  constructor(private translateService: TranslateService) {}

  ngOnInit() {
    console.log('Hero section initialized');

    // Subscribe to language changes
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(
      (event) => {
        console.log('Language changed to:', event.lang);

        // Trigger fade out animation
        this.isContentVisible = false;
        console.log('Content visibility set to:', this.isContentVisible);

        // After a brief delay, make content visible again
        setTimeout(() => {
          this.isContentVisible = true;
          console.log('Content visibility restored to:', this.isContentVisible);
        }, 300);
      }
    );
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }
}
