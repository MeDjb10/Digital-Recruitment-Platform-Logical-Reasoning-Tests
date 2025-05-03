import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AdditionalInfoComponent } from '../../components/additional-info/additional-info.component';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ChangeInfoComponent } from "../../components/change-info/change-info.component";
import { ChangePasswordComponent } from "../../components/change-password/change-password.component";
import { UserContextService } from '../../../../core/services/user-context.service';

import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    AdditionalInfoComponent,
    DialogModule,
    MenuModule,
    CommonModule,
    FormsModule,
    ToastModule,
    ButtonModule,
    TooltipModule,
    InputTextModule,
    PasswordModule,
    ChangeInfoComponent,
    ChangePasswordComponent
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  
  @ViewChild('fileInput') fileInput!: ElementRef;

  currentUser: User | null = null;
  userInitials: string = '';
  avatarUrl: string = '';
  hasFilledAdditionalInfo = false;

  // Dialog control
  showEditProfile = false;
  showChangePassword = false;

  // Edit profile data
  editedUser: Partial<User> = {};

  // Password change data
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // Password visibility toggles
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  // Password strength
  passwordStrength = 0;
  passwordStrengthText = 'Password strength';
  isChangingPassword = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private messageService: MessageService,
    private userContextService: UserContextService
  ) { }

  ngOnInit() {
    this.loadUserProfile();
  }

  private loadUserProfile() {
    this.currentUser = this.authService.getCurrentUser();
    this.userContextService.userProfile$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.userInitials = this.getInitials(user.firstName, user.lastName);
        this.updateAvatar(user);
        this.hasFilledAdditionalInfo = this.checkAdditionalInfo(user);
      }
    });

    // Force an initial load of the profile
    this.userContextService.loadUserProfile().subscribe({
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load profile information'
        });
      }
    });
  }

  private checkAdditionalInfo(user: User): boolean {
    return !!(user.educationLevel && user.currentPosition);
  }

  private getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  private updateAvatar(user: User): void {
    if (user.profilePicture) {
      this.avatarUrl = this.getFullProfilePictureUrl(user.profilePicture);
    } else {
      this.generateFallbackAvatar(user);
    }
  }

  private generateFallbackAvatar(user: User): void {
    if (!user.firstName && !user.lastName) {
      this.avatarUrl = 'https://ui-avatars.com/api/?name=U&background=3b82f6&color=fff&bold=true';
      return;
    }

    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    this.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      initials
    )}&background=3b82f6&color=fff&bold=true`;
  }

  private getFullProfilePictureUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) {
      const baseUrl = environment.apiUrl.split('/api')[0];
      return `${baseUrl}${url}`;
    }
    return url;
  }

  formatRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  handleImageError() {
    if (this.currentUser) {
      this.generateFallbackAvatar(this.currentUser);
    }
  }

  triggerProfilePictureUpload() {
    const fileInput = document.querySelector('#fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
  
  onDialogHide() {
    this.showEditProfile = false;
  }
  showChangePasswordD() {
    this.showChangePassword = true;
  }
  onProfilePictureSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const formData = new FormData();
      formData.append('profilePicture', file);

      this.userContextService.updateUserProfile({ profilePicture: file.name }).subscribe({
        next: (user) => {
          this.updateAvatar(user);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile picture updated successfully'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update profile picture'
          });
        }
      });
    }
  }
  
  handleProfileUpdate(updatedUser: User) {
    this.currentUser = updatedUser;
    this.showEditProfile = false;
  }

  showEditInfo() {
    if (!this.currentUser?.id) {
      // Try to get user from auth service as fallback
      const authUser = this.authService.getCurrentUser();
      if (authUser?.id) {
          this.currentUser = authUser;
      } else {
          this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Please login again to continue'
          });
          return;
      }
  }
  this.showEditProfile = true;
}

// Update your user loading logic

  // saveProfileChanges() {
  //   if (!this.editedUser) return;

  //   this.userService.updateProfile(this.editedUser).subscribe({
  //     next: (updatedUser) => {
  //       this.currentUser = updatedUser;
  //       this.showEditProfile = false;
  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Success',
  //         detail: 'Profile updated successfully'
  //       });
  //     },
  //     error: (error) => {
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Error',
  //         detail: 'Failed to update profile'
  //       });
  //     }
  //   });
  // }

}