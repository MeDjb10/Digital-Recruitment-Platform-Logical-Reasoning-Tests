import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  Output,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { User } from '../../../../core/models/user.model';

interface Notification {
  id: number;
  title: string;
  type: 'info' | 'success' | 'warning' | 'error';
  icon: string;
  time: Date;
  unread: boolean;
}

@Component({
  selector: 'app-navbar',
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
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebarEvent = new EventEmitter<void>();

  pageTitle = 'Dashboard';
  showNotifications = false;
  showUserDropdown = false;
  searchFocused = false;
  isBrowser: boolean;

  // User info
  currentUser: User | null = null;
  userFullName = 'User';
  userEmail = '';
  userRole = 'User';
  avatarUrl = '';

  // Subscriptions
  private userSub: Subscription | null = null;
  private routeSub: Subscription | null = null;

  notifications: Notification[] = [
    // Your existing notifications...
  ];

  // Computed property for unread notifications count
  get unreadNotifications(): number {
    return this.notifications.filter((n) => n.unread).length;
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Update page title based on current route
    this.routeSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updatePageTitle(event.urlAfterRedirects);
      });

    // Set initial page title
    this.updatePageTitle(this.router.url);

    // Get current user information
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;

      if (user) {
        this.userFullName = `${user.firstName} ${user.lastName}`;
        this.userEmail = user.email;
        this.userRole = this.formatRole(user.role);
        this.updateAvatarUrl(user);
      } else {
        // Reset user info if no user is logged in
        this.userFullName = 'User';
        this.userEmail = '';
        this.userRole = 'User';
        this.avatarUrl = '';

        // Redirect to login if not authenticated
        this.router.navigate(['/auth/login']);
      }
    });

    // Simulate keyboard shortcut for search - only in browser environment
    if (this.isBrowser) {
      window.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault();
          (
            document.querySelector('.search-input') as HTMLInputElement
          )?.focus();
        }
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.userSub) {
      this.userSub.unsubscribe();
    }

    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }

    // Remove event listener to prevent memory leaks
    if (this.isBrowser) {
      window.removeEventListener('keydown', (event) => {});
    }
  }

  // Update the avatar URL based on user info
  updateAvatarUrl(user: User): void {
    // Generate avatar URL based on user's name
    this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.firstName + ' ' + user.lastName
    )}&background=3b82f6&color=fff&bold=true`;
  }

  // Format role for display (capitalize first letter)
  formatRole(role: string): string {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  // Check if user has admin role
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // Check if user has moderator role
  isModerator(): boolean {
    return this.currentUser?.role === 'moderator';
  }

  // Check if user has psychologist role
  isPsychologist(): boolean {
    return this.currentUser?.role === 'psychologist';
  }

  // Check if user has any staff role
  isStaff(): boolean {
    return this.isAdmin() || this.isModerator() || this.isPsychologist();
  }

  // Handle clicks outside dropdowns
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close dropdowns when clicking outside
    const target = event.target as HTMLElement;
    if (
      !target.closest('.notification-dropdown') &&
      !target.closest('.notification-btn')
    ) {
      this.showNotifications = false;
    }

    if (
      !target.closest('.user-dropdown') &&
      !target.closest('.user-menu-button')
    ) {
      this.showUserDropdown = false;
    }
  }

  updatePageTitle(url: string): void {
    if (url.includes('/dashboard/info')) {
      this.pageTitle = 'Dashboard Overview';
    } else if (url.includes('/dashboard/users')) {
      this.pageTitle = 'User Management';
    } else if (url.includes('RaisonnementLogique/Statistique')) {
      this.pageTitle = 'Logical Reasoning Statistics';
    } else if (url.includes('RaisonnementLogique/Users')) {
      this.pageTitle = 'Logical Reasoning Users';
    } else if (url.includes('RaisonnementLogique/Tests')) {
      this.pageTitle = 'Logical Reasoning Tests';
    } else {
      this.pageTitle = 'Dashboard';
    }
  }

  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserDropdown = false;
  }

  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
    this.showNotifications = false;
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      unread: false,
    }));
  }

  // Mark a specific notification as read
  markAsRead(id: number): void {
    this.notifications = this.notifications.map((notification) =>
      notification.id === id ? { ...notification, unread: false } : notification
    );
  }

  // Navigate to profile page
  goToProfile(): void {
    this.router.navigate(['/dashboard/profile']);
    this.showUserDropdown = false;
  }

  // Navigate to settings page
  goToSettings(): void {
    this.router.navigate(['/dashboard/settings']);
    this.showUserDropdown = false;
  }

  // Logout function that calls the AuthService
  logout(): void {
    this.authService.logout();
    // The AuthService.logout already handles the navigation to login page
  }
}
