import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

// Auth Service
import { AuthService } from '../../../../core/auth/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { environment } from '../../../../../environments/environment';
import { UserService } from '../../../../core/services/user.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-homepage-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    RippleModule,
    TooltipModule,
    MenuModule,
    TranslateModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class HomepageNavbarComponent implements OnInit, OnDestroy {
  // User state
  currentUser: User | null = null;
  userFullName = '';
  userRole = '';
  avatarUrl = '';

  // Language state
  currentLang: string = 'en'; // Add this property

  // UI state
  isScrolled = false;
  isMobileMenuOpen = false;
  showUserDropdown = false;
  userMenuItems: MenuItem[] = [];

  private _fetchingProfile = false;

  // Subscription
  private userSub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const savedLang = localStorage.getItem('preferred-language');
    if (savedLang && ['en', 'fr'].includes(savedLang)) {
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    } else {
      this.currentLang = this.translate.currentLang || 'en';
    }
    // Subscribe to auth state changes
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;

      if (user) {
        this.userFullName = `${user.firstName} ${user.lastName}`;
        this.userRole = this.formatRole(user.role);

        // Set initial avatar using whatever is available
        this.updateAvatar(user);

        // Then fetch complete profile to get profile picture if available
        this.fetchUserProfile(user.id);

        this.setupUserMenu();
      } else {
        this.userFullName = '';
        this.userRole = '';
        this.avatarUrl = '';
      }
    });

    // Setup user menu if user is already authenticated
    if (this.currentUser) {
      this.setupUserMenu();
    }
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  private updateAvatar(user: User): void {
    if (user.profilePicture) {
      this.avatarUrl = this.getFullProfilePictureUrl(user.profilePicture);
      console.log('Using profile picture from user data:', this.avatarUrl);
    } else {
      this.generateFallbackAvatar(user);
    }
  }

  // Generate fallback avatar based on initials
  private generateFallbackAvatar(user: User): void {
    if (!user.firstName && !user.lastName) {
      this.avatarUrl =
        'https://ui-avatars.com/api/?name=U&background=3b82f6&color=fff&bold=true';
      return;
    }

    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      initials
    )}&background=3b82f6&color=fff&bold=true`;

    console.log('Generated fallback avatar:', this.avatarUrl);
  }

  // Helper method to convert relative URLs to full URLs
  private getFullProfilePictureUrl(url: string | undefined): string {
    if (!url) return '';

    // If it's already a complete URL, return it
    if (url.startsWith('http')) return url;

    // If it's a relative URL, prepend the API base URL
    if (url.startsWith('/uploads')) {
      const baseUrl = environment.apiUrl.split('/api')[0];
      return `${baseUrl}${url}`;
    }

    return url;
  }

  // Fetch user profile to get the profile picture
  private fetchUserProfile(userId: string): void {
    if (!userId || this._fetchingProfile) return;

    // Skip if we already have a profile picture
    if (this.currentUser?.profilePicture) {
      console.log('User already has profile picture, skipping fetch');
      return;
    }

    console.log('Fetching user profile to get profile picture');
    this._fetchingProfile = true;

    this.userService.getUserById(userId).subscribe({
      next: (response) => {
        this._fetchingProfile = false;

        if (response.success && response.user?.profilePicture) {
          console.log('Found profile picture in API response');
          this.avatarUrl = this.getFullProfilePictureUrl(
            response.user.profilePicture
          );

          // Update the user object's profilePicture field without triggering the subscription
          if (this.currentUser) {
            this.currentUser.profilePicture = response.user.profilePicture;
          }
        }
      },
      error: (error) => {
        this._fetchingProfile = false;
        console.error('Failed to fetch user profile:', error);
      },
    });
  }

  // Handle image error
  handleImageError(): void {
    console.log(
      'Profile image failed to load, falling back to generated avatar'
    );
    if (this.currentUser) {
      this.generateFallbackAvatar(this.currentUser);
    }
  }

  // Track scroll position for navbar styling
  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 20;
  }

  // Handle clicks outside dropdown
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.user-menu-container') &&
      !target.closest('.user-menu-button')
    ) {
      this.showUserDropdown = false;
    }
  }

  // Toggle mobile menu
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;

    // Close user dropdown when mobile menu is toggled
    if (this.isMobileMenuOpen) {
      this.showUserDropdown = false;
    }
  }

  // Toggle user dropdown
  toggleUserDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showUserDropdown = !this.showUserDropdown;
  }

  // Format role for display
  formatRole(role: string): string {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  // Generate avatar URL using user initials
  generateAvatar(user: User): void {
    this.updateAvatar(user);
  }

  // Setup user menu items
  setupUserMenu(): void {
    this.userMenuItems = [
      {
        label: this.translate.instant('USER.PROFILE'),
        icon: 'pi pi-user',
        command: () => {
          this.router.navigate(['/profile']);
          this.showUserDropdown = false;
        },
      },
      {
        label: this.translate.instant('USER.TESTS'),
        icon: 'pi pi-list',
        command: () => {
          this.router.navigate(['/tests/my-tests']);
          this.showUserDropdown = false;
        },
      },
      {
        separator: true,
      },
      {
        label: this.translate.instant('USER.DASHBOARD'),
        icon: 'pi pi-th-large',
        visible: this.isStaffMember(),
        command: () => {
          this.router.navigate(['/dashboard']);
          this.showUserDropdown = false;
        },
      },
      {
        separator: true,
        visible: this.isStaffMember(),
      },
      {
        label: this.translate.instant('BUTTONS.LOGOUT'),
        icon: 'pi pi-sign-out',
        command: () => {
          this.logout();
        },
        styleClass: 'text-red-600',
      },
    ];
  }

  // Check if user is staff member (admin, moderator, psychologist)
  isStaffMember(): boolean {
    if (!this.currentUser) return false;
    return ['admin', 'moderator', 'psychologist'].includes(
      this.currentUser.role
    );
  }

  // Navigate to login
  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // Navigate to register
  navigateToRegister(): void {
    this.router.navigate(['/auth/signup']);
  }

  // Logout user
  logout(): void {
    this.authService.logout();
    // The AuthService already handles navigation to login
  }

  switchLanguage(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);

    // Save language preference to localStorage
    localStorage.setItem('preferred-language', lang);

    // Update user menu translations if needed
    if (this.currentUser) {
      this.setupUserMenu();
    }
  }
}
