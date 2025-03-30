import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { filter } from 'rxjs';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatIcon,RouterLink],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {
  currentYear: number = new Date().getFullYear();
  currentRoute: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Track route changes for analytics or custom behavior
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects;
      });
  }

  // Helper method to check current route
  isLoginRoute(): boolean {
    return this.currentRoute.includes('/auth/login');
  }

  isSignupRoute(): boolean {
    return this.currentRoute.includes('/auth/signup');
  }
}
