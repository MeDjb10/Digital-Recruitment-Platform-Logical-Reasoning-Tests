import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { environment } from '../../../../../environments/environment';
import { UserService } from '../../../../core/services/user.service';

interface TestSection {
  name: string;
  route: string;
  expanded: boolean;
  icon: string;
  subsections: {
    name: string;
    route: string;
  }[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    TooltipModule,
    RippleModule,
    ButtonModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  tests: TestSection[] = [
    {
      name: 'Raisonnement Logique',
      route: 'RaisonnementLogique',
      expanded: false,
      icon: 'pi-chart-line', // Changed from pi-brain which doesn't exist
      subsections: [
        { name: 'Liste des Tests', route: 'Tests' },
        { name: 'Statistiques', route: 'Statistique' },
        { name: 'Utilisateurs', route: 'Users' },
      ],
    },
    {
      name: 'Verbal Reasoning',
      route: 'VerbalReasoning',
      expanded: false,
      icon: 'pi-comments', // Changed from pi-comment
      subsections: [
        { name: 'Statistics', route: 'Statistics' },
        { name: 'Users', route: 'Users' },
        { name: 'Tests', route: 'Tests' },
      ],
    },
  ];

  menuItems = [
    { label: 'Dashboard', icon: 'pi-chart-bar', route: '/dashboard/info' },
    { label: 'Users', icon: 'pi-users', route: '/dashboard/users' },
    { label: 'Settings', icon: 'pi-cog', route: '/dashboard/settings' },
  ];

  // User properties
  userName = '';
  userRole = '';
  userInitials = '';
  avatarUrl = '';
  currentUser: User | null = null;
  currentRoute = '';

  // Subscription
  private userSub: Subscription | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {
    console.log('[Sidebar] ngOnInit called');

    // Track current route to highlight active menu items
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects;
        console.log('[Sidebar] Route changed to:', this.currentRoute);

        // Auto-expand parent when child route is active
        this.tests.forEach((test) => {
          if (this.currentRoute.includes(test.route)) {
            test.expanded = true;
          }
        });
      });

    // Subscribe to current user changes
    console.log('[Sidebar] Subscribing to currentUser$');
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      console.log(
        '[Sidebar] Received user data:',
        user ? 'User exists' : 'No user'
      );

      if (user) {
        this.currentUser = user;
        this.userName = `${user.firstName} ${user.lastName}`;
        this.userRole = this.formatRole(user.role);
        this.userInitials = this.getInitials(user.firstName, user.lastName);

        console.log('[Sidebar] User data set:', {
          name: this.userName,
          role: this.userRole,
          initials: this.userInitials,
          hasProfilePicture: !!user.profilePicture,
        });

        // Set avatar URL from current data (may be missing profile picture)
        this.updateAvatarUrl(user);

        // Now do a direct fetch to get complete user data including profile picture
        this.fetchUserProfile(user.id);
      } else {
        console.log('[Sidebar] No user data received');
      }
    });
  }

  // Add this new method to fetch the complete user profile
  private fetchUserProfile(userId: string): void {
    console.log('[Sidebar] Fetching complete user profile for:', userId);

    this.userService.getUserById(userId).subscribe({
      next: (response) => {
        if (response.success && response.user && response.user.profilePicture) {
          console.log(
            '[Sidebar] Received profile from user service with picture:',
            response.user.profilePicture
          );

          // Update avatar without updating the entire user object in auth service
          // This prevents infinite loops by not triggering another currentUser$ update
          this.avatarUrl = this.getFullProfilePictureUrl(
            response.user.profilePicture
          );
        } else {
          console.log('[Sidebar] User service response had no profile picture');
        }
      },
      error: (error) => {
        console.error('[Sidebar] Failed to fetch user profile:', error);
      },
    });
  }

  ngOnDestroy() {
    console.log('[Sidebar] ngOnDestroy called');
    // Clean up the subscription
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  // Format role for display (capitalize first letter)
  formatRole(role: string): string {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  // Get initials from name
  getInitials(firstName: string, lastName: string): string {
    const initials = (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
    console.log(
      `[Sidebar] Generated initials: "${initials}" from "${firstName} ${lastName}"`
    );
    return initials;
  }

  // Update avatar URL
  updateAvatarUrl(user: User): void {
    console.log('[Sidebar] updateAvatarUrl called with user:', {
      id: user.id,
      hasProfilePicture: !!user.profilePicture,
      profilePicturePath: user.profilePicture,
    });

    if (user && user.profilePicture) {
      // Use the profile picture from the user
      this.avatarUrl = this.getFullProfilePictureUrl(user.profilePicture);
      console.log('[Sidebar] Using profile picture URL:', this.avatarUrl);
    } else {
      // Generate avatar URL based on user's name
      this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.firstName + ' ' + user.lastName
      )}&background=3b82f6&color=fff&bold=true`;
      console.log('[Sidebar] Using generated avatar URL:', this.avatarUrl);
    }
  }

  // Helper method to ensure full URL
  private getFullProfilePictureUrl(url: string | undefined): string {
    console.log('[Sidebar] getFullProfilePictureUrl called with:', url);

    if (!url) {
      console.log('[Sidebar] URL is empty, returning empty string');
      return '';
    }

    // If it's already a complete URL, return it
    if (url.startsWith('http')) {
      console.log('[Sidebar] URL already complete');
      return url;
    }

    // If it's a relative URL, prepend the API base URL
    if (url.startsWith('/uploads')) {
      const baseUrl = environment.apiUrl.split('/api')[0];
      const fullUrl = `${baseUrl}${url}`;
      console.log('[Sidebar] Created full URL:', fullUrl);
      return fullUrl;
    }

    console.log('[Sidebar] Returning original URL');
    return url;
  }

  // Handle image error
  handleImageError(): void {
    console.log(
      '[Sidebar] Image error occurred, falling back to generated avatar'
    );

    if (this.currentUser) {
      this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        this.currentUser.firstName + ' ' + this.currentUser.lastName
      )}&background=3b82f6&color=fff&bold=true`;
      console.log('[Sidebar] Fallback avatar URL:', this.avatarUrl);
    }
  }
  toggleSidebar() {
    this.toggleCollapse.emit();
  }

  toggleTest(test: TestSection) {
    if (this.collapsed) {
      test.expanded = !test.expanded;
    } else {
      this.tests.forEach((t) => {
        if (t === test) {
          t.expanded = !t.expanded;
        } else {
          // Close other expanded items (accordion style)
          t.expanded = false;
        }
      });
    }
  }

  isChildActive(test: TestSection): boolean {
    return this.currentRoute.includes(test.route);
  }

  isRouteActive(route: string): boolean {
    return this.currentRoute === route;
  }
}
