import { Component, Input, OnInit, OnChanges, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    CalendarModule,
    DropdownModule
  ],
  templateUrl: './change-info.component.html'
}) export class ChangeInfoComponent implements OnInit, OnChanges {
  @Input() currentUser: User | null = null;
  @Output() saved = new EventEmitter<User>();
  @Output() cancelled = new EventEmitter<void>();
  userForm!: FormGroup;
  genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
   
  ];
  maxDate: Date = new Date();
  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private userService: UserService,
    private authService: AuthService,
    private userContextService: UserContextService
  ) {
    this.initForm();
  }
  ngOnInit() {
    console.log('ChangeInfoComponent initialized with user:', this.currentUser);
    if (this.currentUser) {
      this.initForm();
    }
  }

  ngOnChanges() {
    console.log('ChangeInfoComponent received changes:', this.currentUser);
    if (this.currentUser) {
      if (!this.userForm) {
        this.initForm();
      } else {
        this.updateFormWithUserData();
      }
    }
  }

  private initForm() {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      gender: ['', Validators.required],
      dateOfBirth: [null, Validators.required],
      currentPosition: ['', Validators.required]
    });
    
    if (this.currentUser) {
      this.updateFormWithUserData();
    }
  }

  private updateFormWithUserData() {
    if (!this.userForm || !this.currentUser) return;
    
    const dateOfBirth = this.currentUser.dateOfBirth ? 
      new Date(this.currentUser.dateOfBirth) : null;

    this.userForm.patchValue({
      firstName: this.currentUser.firstName || '',
      lastName: this.currentUser.lastName || '',
      gender: this.currentUser.gender || '',
      dateOfBirth: dateOfBirth,
      currentPosition: this.currentUser.currentPosition || ''
    });
  }

  saveChanges() {
    if (this.userForm.invalid) {
      Object.keys(this.userForm.controls).forEach(key => {
        const control = this.userForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    if (!this.currentUser?.id) {
      this.currentUser = this.authService.getCurrentUser();
    }

    const updates = {
      ...this.userForm.value,
      dateOfBirth: this.userForm.value.dateOfBirth
        ? new Date(this.userForm.value.dateOfBirth).toISOString()
        : undefined
    };

    this.userService.updateUser(this.currentUser!.id, updates).subscribe({
      next: (response) => {
        const updatedUser = { ...this.currentUser!, ...response.user };
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