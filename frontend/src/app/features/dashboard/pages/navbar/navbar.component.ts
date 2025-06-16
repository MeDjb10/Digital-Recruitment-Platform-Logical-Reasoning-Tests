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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RealtimeSecurityAlertService, SecurityAlert } from '../../../candidate/DominoTest/services/realtime-security-alert.service';

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
    TranslateModule,
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

  // Security alerts
  showSecurityAlerts = false;
  securityAlerts: SecurityAlert[] = [];
  unreadSecurityAlerts = 0;
  isSecurityConnected = false;

  // Language state
  currentLang: string = 'en';
  showLanguageDropdown = false;

  // User info
  currentUser: User | null = null;
  userFullName = 'User';
  userEmail = '';
  userRole = 'User';
  avatarUrl = '';
  // Subscriptions
  private userSub: Subscription | null = null;
  private routeSub: Subscription | null = null;
  private securityAlertSub: Subscription | null = null;
  private securityConnectionSub: Subscription | null = null;

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
    private userService: UserService,
    private messageService: MessageService,
    private translate: TranslateService,
    private securityAlertService: RealtimeSecurityAlertService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Update the ngOnInit method to include proper profile picture loading:
  ngOnInit(): void {
    // Set up translation
    const savedLang = localStorage.getItem('preferred-language');
    if (savedLang && ['en', 'fr'].includes(savedLang)) {
      this.currentLang = savedLang;
      this.translate.use(savedLang);
    } else {
      this.currentLang = this.translate.currentLang || 'en';
    }

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
      // Check if this is just a profile picture update
      const isJustProfileUpdate =
        this.currentUser &&
        user &&
        this.currentUser.id === user.id &&
        this.currentUser.profilePicture !== user.profilePicture;

      // Update the current user reference
      this.currentUser = user;

      if (user) {
        this.userFullName = `${user.firstName} ${user.lastName}`;
        this.userEmail = user.email;
        this.userRole = this.formatRole(user.role);

        // Update avatar from current user data
        this.updateAvatarUrl(user);

        // Only fetch the full profile if:
        // 1. We don't already have a profile picture OR
        // 2. This isn't just an update triggered by our own profilePicture change
        if (!user.profilePicture && !isJustProfileUpdate) {
          console.log('No profile picture in current user, fetching profile');
          this.fetchCurrentUserProfile(user.id);
        }
      } else {
        // Reset user info if no user is logged in
        this.userFullName = 'User';
        this.userEmail = '';
        this.userRole = 'User';
        this.avatarUrl = '';

        // Redirect to login if not authenticated
        this.router.navigate(['/auth/login']);
      }    });

    // Initialize security alerts monitoring
    this.initializeSecurityAlerts();

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

  // Switch language method
  switchLanguage(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);

    // Save language preference to localStorage
    localStorage.setItem('preferred-language', lang);

    // Close the language dropdown if it's open
    this.showLanguageDropdown = false;
  }
  // Toggle language dropdown
  toggleLanguageDropdown(): void {
    this.showLanguageDropdown = !this.showLanguageDropdown;
    // Close other dropdowns
    this.showNotifications = false;
    this.showUserDropdown = false;
    this.showSecurityAlerts = false;
  }

  fetchCurrentUserProfile(userId: string): void {
    if (!userId) return;

    // Skip fetching if we already have a profile picture
    // This prevents the recursive loop
    if (this.currentUser?.profilePicture) {
      console.log('Profile picture already exists, skipping fetch');
      this.avatarUrl = this.getFullProfilePictureUrl(
        this.currentUser.profilePicture
      );
      return;
    }

    // Add a flag to prevent multiple simultaneous requests
    if (this._fetchingProfile) {
      console.log('Already fetching profile, skipping duplicate request');
      return;
    }

    this._fetchingProfile = true;

    this.userService.getUserById(userId).subscribe({
      next: (response) => {
        this._fetchingProfile = false;
        if (response.success && response.user) {
          // IMPORTANT: Only update fields that we need, not the entire user
          // This prevents triggering the auth service subscription again
          if (
            response.user.profilePicture &&
            (!this.currentUser?.profilePicture ||
              this.currentUser.profilePicture !== response.user.profilePicture)
          ) {
            console.log(
              'Found profile picture in API response, updating avatar'
            );
            this.avatarUrl = this.getFullProfilePictureUrl(
              response.user.profilePicture
            );

            // Only update the profilePicture field in the current user
            if (this.currentUser) {
              this.currentUser.profilePicture = response.user.profilePicture;
            }
          }
        }
      },
      error: (error) => {
        this._fetchingProfile = false;
        console.error('Failed to fetch current user profile:', error);
      },
    });
  }

  // Add this property to the class
  private _fetchingProfile = false;
  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.securityAlertSub) {
      this.securityAlertSub.unsubscribe();
    }
    if (this.securityConnectionSub) {
      this.securityConnectionSub.unsubscribe();
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
    const uploadUrl = `${environment.apiUrl}/users/${this.currentUser.id}/picture`;
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

    if (
      !target.closest('.language-dropdown') &&
      !target.closest('.language-selector')
    ) {
      this.showLanguageDropdown = false;
    }

    if (
      !target.closest('.security-alerts-dropdown') &&
      !target.closest('.security-alerts-btn')
    ) {
      this.showSecurityAlerts = false;
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
    this.showSecurityAlerts = false;
  }

  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
    this.showNotifications = false;
    this.showSecurityAlerts = false;
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
  // Logout user
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout successful');
        // Navigation is already handled in the AuthService.clearAuthData method
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even on error, the AuthService.clearAuthData method will handle navigation
      },
    });
  }

  // Security Alert Methods
  
  /**
   * Initialize security alerts monitoring
   */
  initializeSecurityAlerts(): void {
    // Subscribe to real-time security alerts
    this.securityAlertSub = this.securityAlertService.getSecurityAlerts().subscribe({
      next: (alert) => {
        this.addSecurityAlert(alert);
        this.playSecurityAlertSound(alert.severity);
        this.showSecurityNotification(alert);
      },
      error: (error) => {
        console.error('Error receiving security alerts:', error);
      }
    });

    // Monitor connection status
    this.securityConnectionSub = this.securityAlertService.getConnectionStatus().subscribe({
      next: (connected) => {
        this.isSecurityConnected = connected;
        if (connected) {
          this.loadActiveSecurityAlerts();
        }
      }
    });
  }
  /**
   * Load active security alerts
   */
  loadActiveSecurityAlerts(): void {
    this.securityAlertService.getActiveAlerts().subscribe({
      next: (alerts) => {
        console.log('Loaded active security alerts:', alerts); // Debug log
        this.securityAlerts = alerts.slice(0, 10); // Show only latest 10
        this.unreadSecurityAlerts = alerts.length; // All are considered unread until acknowledged
      },
      error: (error) => {
        console.error('Error loading security alerts:', error);
      }
    });
  }
  /**
   * Add new security alert to the list
   */
  addSecurityAlert(alert: SecurityAlert): void {
    console.log('Received security alert:', alert); // Debug log
    
    // Add to beginning of list
    this.securityAlerts.unshift(alert);
    
    // Keep only latest 10 alerts
    this.securityAlerts = this.securityAlerts.slice(0, 10);
    
    // Update unread count
    this.unreadSecurityAlerts++;
  }
  /**
   * Toggle security alerts dropdown
   */
  toggleSecurityAlerts(): void {
    this.showSecurityAlerts = !this.showSecurityAlerts;
    // Close other dropdowns
    this.showNotifications = false;
    this.showUserDropdown = false;
    this.showLanguageDropdown = false;
  }

  /**
   * Acknowledge security alert
   */
  acknowledgeAlert(alert: SecurityAlert): void {
    if (!alert.id) return;
    
    const psychologistId = this.currentUser?.id || 'unknown';
    this.securityAlertService.acknowledgeAlert(alert.id, psychologistId).subscribe({
      next: () => {
        // Remove from alerts list
        this.securityAlerts = this.securityAlerts.filter(a => a.id !== alert.id);
        this.unreadSecurityAlerts = Math.max(0, this.unreadSecurityAlerts - 1);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Alert Acknowledged',
          detail: 'Security alert has been acknowledged.'
        });
      },
      error: (error) => {
        console.error('Error acknowledging alert:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to acknowledge alert.'
        });
      }
    });
  }

  /**
   * Request intervention for security alert
   */
  requestIntervention(alert: SecurityAlert): void {
    const reason = prompt('Please provide a reason for intervention:');
    if (!reason) return;

    const psychologistId = this.currentUser?.id || 'unknown';
    this.securityAlertService.requestIntervention(alert.attemptId, reason, psychologistId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Intervention Requested',
          detail: 'Intervention request has been sent successfully.'
        });
        
        // Update alert to show intervention requested
        const alertIndex = this.securityAlerts.findIndex(a => a.id === alert.id);
        if (alertIndex !== -1) {
          this.securityAlerts[alertIndex].additionalData = {
            ...this.securityAlerts[alertIndex].additionalData,
            interventionRequested: true
          };
        }
      },
      error: (error) => {
        console.error('Error requesting intervention:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to send intervention request.'
        });
      }
    });
  }

  /**
   * Play sound for security alerts
   */
  playSecurityAlertSound(severity: SecurityAlert['severity']): void {
    try {
      const audio = new Audio();
      
      switch (severity) {
        case 'CRITICAL':
          // Use browser notification sound or create beep
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LNeSMFJHfH8N2QQAoUXrTp65hVFApGn+DyvmwhCyqJ0fPSlEgODl24'; // Critical alert sound
          break;
        case 'HIGH':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LNeSMFJHfH8N2QQAoUXrTp65hVFApGn+DyvmwhCyqJ0fPSlEgODl24'; // High alert sound
          break;
        default:
          return; // No sound for medium/low alerts
      }

      audio.volume = 0.3;
      audio.play().catch(console.log);
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  }

  /**
   * Show browser notification for critical alerts
   */
  showSecurityNotification(alert: SecurityAlert): void {
    if (alert.severity === 'CRITICAL' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🚨 Critical Security Alert', {
          body: `${alert.candidateName}: ${alert.description}`,
          icon: '/assets/icons/security-alert.png',
          tag: alert.id
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }  /**
   * Format alert type for display
   */
  formatAlertType(alertType: SecurityAlert['alertType'] | string | undefined): string {
    if (!alertType) return 'Security Alert';
    
    if (typeof alertType !== 'string') return 'Security Alert';
    
    return alertType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get severity icon
   */
  getSecuritySeverityIcon(severity: SecurityAlert['severity']): string {
    switch (severity) {
      case 'CRITICAL': return 'pi-exclamation-triangle';
      case 'HIGH': return 'pi-exclamation-circle';
      case 'MEDIUM': return 'pi-info-circle';
      case 'LOW': return 'pi-info';
      default: return 'pi-info';
    }
  }
  /**
   * Get time elapsed since alert
   */
  getTimeElapsed(timestamp: string | undefined): string {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const alertTime = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(alertTime.getTime())) return 'Invalid date';
    
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return alertTime.toLocaleDateString();
  }

  /**
   * Clear all security alerts
   */
  clearAllSecurityAlerts(): void {
    if (confirm('Are you sure you want to clear all security alerts?')) {
      this.securityAlerts = [];
      this.unreadSecurityAlerts = 0;
      this.showSecurityAlerts = false;
    }
  }
  /**
   * Navigate to full security monitor
   */
  openSecurityMonitor(): void {
    this.router.navigate(['/dashboard/security-monitor']);
    this.showSecurityAlerts = false;
  }

  /**
   * Check if question index is valid
   */
  isValidQuestionIndex(questionIndex: number | undefined): boolean {
    return questionIndex !== undefined && questionIndex !== null && 
           typeof questionIndex === 'number' && !isNaN(questionIndex) && questionIndex >= 0;
  }

  /**
   * Track by function for security alerts ngFor
   */
  trackByAlertId(index: number, alert: SecurityAlert): string {
    return alert.id || index.toString();
  }
}
