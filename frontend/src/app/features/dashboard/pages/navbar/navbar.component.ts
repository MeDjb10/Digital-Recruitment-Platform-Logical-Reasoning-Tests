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
  ViewChild,
  ElementRef,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '../../../../../environments/environment';
import { UserService } from '../../../../core/services/user.service';

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
    ToastModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  providers: [MessageService],
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

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Add properties for image upload
  isUploading = false;
  maxFileSize = 5 * 1024 * 1024; // 5MB

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
    private userService: UserService, // Add this
    private messageService: MessageService, // Add this
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

  // Update the avatar URL method
  updateAvatarUrl(user: User): void {
    if (user && user.profilePicture) {
      // Use the profile picture from the user
      this.avatarUrl = this.getFullProfilePictureUrl(user.profilePicture);
      console.log('Using profile picture URL:', this.avatarUrl);
    } else {
      // Generate avatar URL based on user's name
      this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.firstName + ' ' + user.lastName
      )}&background=3b82f6&color=fff&bold=true`;
      console.log('Using generated avatar URL:', this.avatarUrl);
    }
  }

  // Helper method to ensure full URL
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

  // Handle image loading error
  handleImageError(): void {
    console.log('Image loading error, falling back to default avatar');
    if (this.currentUser) {
      this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        this.currentUser.firstName + ' ' + this.currentUser.lastName
      )}&background=3b82f6&color=fff&bold=true`;
    }
  }

  // Trigger file input click
  triggerProfilePictureUpload(): void {
    this.fileInput.nativeElement.click();
    this.showUserDropdown = false; // Close dropdown
  }

  // Handle file selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validate file type
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/jpg',
    ];
    if (!validTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'Please select a valid image file (JPEG, PNG, GIF, WEBP)',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > this.maxFileSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'File Too Large',
        detail: 'Please select an image under 5MB',
      });
      return;
    }

    // Upload the file
    this.uploadProfilePicture(file);

    // Clear the input value to allow re-uploading the same file
    input.value = '';
  }

  // Update the uploadProfilePicture method:
  uploadProfilePicture(file: File): void {
    if (!this.currentUser?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User information not available',
      });
      return;
    }

    // Input validation
    if (!file) {
      console.error('No file provided');
      return;
    }

    console.log('Uploading profile picture:', {
      userId: this.currentUser.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    this.isUploading = true;

    // Create FormData manually to ensure it's done correctly
    const formData = new FormData();
    formData.append('profilePicture', file, file.name);

    // Log all FormData entries to verify
    console.log('FormData entries:');
    // @ts-ignore: FormData forEach exists but TypeScript may not recognize it
    formData.forEach((value, key) => {
      console.log(`${key}: ${value instanceof File ? value.name : value}`);
    });

    // Use HttpClient directly to have more control
    const uploadUrl = `${environment.apiUrl}/users/${this.currentUser.id}/profile-picture`;
    console.log('Upload URL:', uploadUrl);

    // Use XMLHttpRequest for more debugging visibility
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);

    // Add authorization header
    const token =
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    } else {
      console.error('No authentication token available');
      this.isUploading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Authentication Error',
        detail: 'Your session may have expired. Please login again.',
      });
      return;
    }

    xhr.onload = () => {
      this.isUploading = false;

      if (xhr.status >= 200 && xhr.status < 300) {
        // Success
        console.log('Upload successful');

        try {
          const response = JSON.parse(xhr.responseText);

          if (response.success && response.user) {
            // Update current user in auth service with new profile picture
            this.authService.updateCurrentUser(response.user);

            // Update avatar URL
            if (response.user.profilePicture) {
              this.avatarUrl = this.getFullProfilePictureUrl(
                response.user.profilePicture
              );
            }

            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Profile picture updated',
            });
          }
        } catch (e) {
          console.error('Error parsing response:', e);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error updating profile picture',
          });
        }
      } else {
        // Error
        console.error(
          'Upload failed:',
          xhr.status,
          xhr.statusText,
          xhr.responseText
        );
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Update',
          detail: `Error: ${xhr.status} ${xhr.statusText}`,
        });
      }
    };

    xhr.onerror = () => {
      this.isUploading = false;
      console.error('Network error during upload');
      this.messageService.add({
        severity: 'error',
        summary: 'Network Error',
        detail: 'Could not connect to the server',
      });
    };

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        console.log(`Upload progress: ${percentComplete}%`);
      }
    };

    // Send the FormData
    xhr.send(formData);
  }
  // Delete profile picture
  deleteProfilePicture(): void {
    if (!this.currentUser?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User information not available',
      });
      return;
    }

    this.isUploading = true;

    this.userService.deleteProfilePicture(this.currentUser.id).subscribe({
      next: (response) => {
        this.isUploading = false;

        if (response.success) {
          // Clear profile picture from current user
          if (this.currentUser) {
            this.currentUser.profilePicture = undefined;
          }

          // Update auth service
          this.authService.updateCurrentUser({
            ...this.currentUser!,
            profilePicture: undefined,
          });

          // Reset avatar URL to generated one
          if (this.currentUser) {
            this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              this.currentUser.firstName + ' ' + this.currentUser.lastName
            )}&background=3b82f6&color=fff&bold=true`;
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile picture removed',
          });
        }
      },
      error: (error) => {
        this.isUploading = false;
        console.error('Profile picture deletion failed:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Delete',
          detail: 'Could not delete profile picture. Please try again.',
        });
      },
    });
  }

  // URI encoding helper for template
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
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
