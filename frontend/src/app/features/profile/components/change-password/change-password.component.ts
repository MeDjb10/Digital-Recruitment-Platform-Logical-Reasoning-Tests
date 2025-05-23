import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
  ],
  templateUrl: 'change-password.component.html',
  styleUrls: ['change-password.component.css'],
})
export class ChangePasswordComponent {
  @Input() currentUser: User | null = null;
  visible = false;
  step: 'request' | 'verify' | 'reset' = 'request';
  isProcessing = false;
  otp = '';
  email = '';

  passwordData = {
    newPassword: '',
    confirmPassword: '',
  };

  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  passwordStrength = 0;
  passwordStrengthText = 'Password strength';

  constructor(
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.email = this.authService.getCurrentUser()?.email || '';
  }

  showDialog() {
    this.resetForm();
    this.visible = true;
  }

  hideDialog() {
    this.visible = false;
    this.resetForm();
  }

  resetForm() {
    this.passwordData = {
      newPassword: '',
      confirmPassword: '',
    };
    this.step = 'request';
    this.otp = '';
  }

  calculatePasswordStrength(password: string) {
    if (!password) {
      this.passwordStrength = 0;
      this.passwordStrengthText = 'Password strength';
      return;
    }

    let strength = 0;

    // Length check
    if (password.length >= 8) strength++;

    // Complexity checks
    if (/[A-Z]/.test(password)) strength++; // Has uppercase
    if (/[0-9]/.test(password)) strength++; // Has number
    if (/[^A-Za-z0-9]/.test(password)) strength++; // Has special char

    this.passwordStrength = strength;

    // Set text based on strength
    switch (strength) {
      case 0:
      case 1:
        this.passwordStrengthText = 'Very weak';
        break;
      case 2:
        this.passwordStrengthText = 'Weak';
        break;
      case 3:
        this.passwordStrengthText = 'Good';
        break;
      case 4:
        this.passwordStrengthText = 'Strong';
        break;
    }
  }

  requestPasswordReset() {
    this.isProcessing = true;
    this.authService.requestPasswordReset(this.email).subscribe({
      next: (response) => {
        // No longer storing resetToken
        this.step = 'verify';
        this.messageService.add({
          severity: 'info',
          summary: 'OTP Sent',
          detail: 'Please check your email for the verification code',
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message,
        });
      },
      complete: () => {
        this.isProcessing = false;
      },
    });
  }

  verifyOTP() {
    this.isProcessing = true;
    // Updated to match the forgot password component pattern
    this.authService.verifyResetOTP(this.email, this.otp).subscribe({
      next: () => {
        this.step = 'reset';
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'OTP verified successfully',
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Invalid OTP. Please try again.',
        });
      },
      complete: () => {
        this.isProcessing = false;
      },
    });
  }

  changePassword() {
    if (!this.isPasswordValid()) return;

    this.isProcessing = true;
    // Updated to match the forgot password component pattern - no resetToken needed
    this.authService
      .resetPassword(this.email, this.passwordData.newPassword)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Password changed successfully',
          });
          this.hideDialog();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message,
          });
        },
        complete: () => {
          this.isProcessing = false;
        },
      });
  }

  isPasswordValid(): boolean {
    return (
      !!this.passwordData.newPassword &&
      this.passwordData.newPassword === this.passwordData.confirmPassword &&
      this.passwordStrength >= 3
    );
  }
}
