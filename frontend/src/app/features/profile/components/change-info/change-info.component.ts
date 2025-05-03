import { Component, Input, OnInit, OnChanges, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { User } from '../../../../core/models/user.model';
import { MessageService } from 'primeng/api';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { UserContextService } from '../../../../core/services/user-context.service';

@Component({
  selector: 'app-change-info',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    CalendarModule,
    DropdownModule
  ],
  templateUrl: './change-info.component.html'
}) export class ChangeInfoComponent {
  @Input() currentUser: User | null = null;
  @Output() saved = new EventEmitter<User>();
  @Output() cancelled = new EventEmitter<void>();
  constructor(
    private messageService: MessageService,
    private userService: UserService,
    private authService: AuthService,
    private userContextService: UserContextService
  ) { }
  maxDate: Date = new Date();
  editedUser: Partial<User> = {};
  genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' }
  ];

  ngOnChanges() {
    console.log('Input changes detected:', this.currentUser);
    if (this.currentUser) {
        this.editedUser = {
            firstName: this.currentUser.firstName || '',
            lastName: this.currentUser.lastName || '',
            gender: this.currentUser.gender || '',
            dateOfBirth: this.currentUser.dateOfBirth 
                ? new Date(this.currentUser.dateOfBirth) 
                : undefined,
            currentPosition: this.currentUser.currentPosition || ''
        };
        console.log('Initialized editedUser:', this.editedUser);
    } else {
        console.warn('currentUser is null during initialization');
    }
}

  private initializeForm() {
    if (this.currentUser) {
      this.editedUser = {
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName,
        gender: this.currentUser.gender || '',
        dateOfBirth: this.currentUser.dateOfBirth ? new Date(this.currentUser.dateOfBirth) : undefined,
        currentPosition: this.currentUser.currentPosition || ''
      };
    }
  }

  saveChanges() {
    // First try to get user from auth service if not available
    if (!this.currentUser?.id) {
        this.currentUser = this.authService.getCurrentUser();
    }

    if (!this.currentUser?.id) {
        console.error('User session missing:', {
            componentUser: this.currentUser,
            authUser: this.authService.getCurrentUser()
        });
        this.messageService.add({
            severity: 'error',
            summary: 'Session Expired',
            detail: 'Please login again to continue',
            life: 5000
        });
        this.cancelled.emit();
        return;
    }

    // Rest of your save logic remains the same...
    const updates = {
        firstName: this.editedUser.firstName,
        lastName: this.editedUser.lastName,
        gender: this.editedUser.gender,
        dateOfBirth: this.editedUser.dateOfBirth 
            ? new Date(this.editedUser.dateOfBirth).toISOString()
            : undefined,
        currentPosition: this.editedUser.currentPosition
    };

    this.userService.updateUser(this.currentUser.id, updates).subscribe({
        next: (response) => {
            const updatedUser = { ...this.currentUser!, ...response.user };
            
            // Update both services
            this.authService.updateCurrentUser(updatedUser);
            this.userContextService.updateUserProfile(updatedUser);
            
            this.saved.emit(updatedUser);
        },
        error: (error) => {
            console.error('Update error:', error);
            this.handleUpdateError(error);
        }
    });
}

private handleUpdateError(error: any) {
    if (error.status === 401) {
        this.messageService.add({
            severity: 'error',
            summary: 'Session Expired',
            detail: 'Please login again',
            life: 5000
        });
        this.cancelled.emit();
    } else {
        this.messageService.add({
            severity: 'error',
            summary: 'Update Failed',
            detail: error.message || 'Failed to update profile',
            life: 5000
        });
    }
}

  cancel() {
    this.cancelled.emit();
  }
}