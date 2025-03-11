import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  Output,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';

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
export class NavbarComponent implements OnInit {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebarEvent = new EventEmitter<void>();

  pageTitle = 'Dashboard';
  showNotifications = false;
  showUserDropdown = false;
  searchFocused = false;
  isBrowser: boolean;

  // User info
  userFullName = 'Admin User';
  userEmail = 'admin@example.com';
  userRole = 'Administrator';

  notifications: Notification[] = [
    {
      id: 1,
      title: 'New candidate applied for position',
      type: 'info',
      icon: 'pi-user-plus',
      time: new Date(),
      unread: true,
    },
    {
      id: 2,
      title: 'Test results submitted by John Doe',
      type: 'success',
      icon: 'pi-check-circle',
      time: new Date(Date.now() - 3600000),
      unread: true,
    },
    {
      id: 3,
      title: 'License expires in 5 days',
      type: 'warning',
      icon: 'pi-exclamation-circle',
      time: new Date(Date.now() - 86400000),
      unread: true,
    },
    {
      id: 4,
      title: 'Weekly statistics report available',
      type: 'info',
      icon: 'pi-chart-bar',
      time: new Date(Date.now() - 172800000),
      unread: false,
    },
  ];

  // Computed property for unread notifications count
  get unreadNotifications(): number {
    return this.notifications.filter((n) => n.unread).length;
  }

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Update page title based on current route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updatePageTitle(event.urlAfterRedirects);
      });

    // Set initial page title
    this.updatePageTitle(this.router.url);

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
}
