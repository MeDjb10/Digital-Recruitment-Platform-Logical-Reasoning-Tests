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

  // UI state
  isScrolled = false;
  isMobileMenuOpen = false;
  showUserDropdown = false;
  userMenuItems: MenuItem[] = [];

  // Subscription
  private userSub: Subscription | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;

      if (user) {
        this.userFullName = `${user.firstName} ${user.lastName}`;
        this.userRole = this.formatRole(user.role);
        this.generateAvatar(user);
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
    if (!user.firstName && !user.lastName) {
      this.avatarUrl =
        'https://ui-avatars.com/api/?name=U&background=3b82f6&color=fff&bold=true';
      return;
    }

    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      initials
    )}&background=3b82f6&color=fff&bold=true`;
  }

  // Setup user menu items
  setupUserMenu(): void {
    this.userMenuItems = [
      {
        label: 'Mon Profil',
        icon: 'pi pi-user',
        command: () => {
          this.router.navigate(['/profile']);
          this.showUserDropdown = false;
        },
      },
      {
        label: 'Mes Tests',
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
        label: 'Tableau de bord',
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
        label: 'Déconnexion',
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
}
