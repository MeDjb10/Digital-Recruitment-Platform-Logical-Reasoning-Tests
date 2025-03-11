import { Component, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    MatStepperModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate(
          '500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          style({ opacity: 1, transform: 'scale(1)' })
        ),
      ]),
    ]),
  ],
})
export class ForgotPasswordComponent implements OnDestroy {
  @ViewChild('stepper') stepper!: MatStepper;

  emailFormGroup: FormGroup;
  codeFormGroup: FormGroup;
  passwordFormGroup: FormGroup;

  hidePassword = true;
  hideConfirmPassword = true;
  isProcessing = false;

  emailSubmitted = false;
  codeSubmitted = false;
  passwordSubmitted = false;

  cooldownTimeLeft = 0;
  passwordStrength = 0;
  passwordStrengthText = 'Password strength';
  loadingMessage: string = '';

  // Store email and reset token from API response
  private userEmail: string = '';
  private resetToken: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.emailFormGroup = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.codeFormGroup = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });

    this.passwordFormGroup = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordsMatchValidator }
    );

    // Listen for password changes to calculate strength
    this.passwordFormGroup.get('password')?.valueChanges.subscribe((value) => {
      this.calculatePasswordStrength(value);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  sendVerificationCode() {
    if (this.emailFormGroup.invalid) {
      this.emailSubmitted = true;
      return;
    }

    this.isProcessing = true;
    this.loadingMessage = 'Sending verification code...';

    const email = this.emailFormGroup.get('email')?.value;
    this.userEmail = email;

    this.authService.requestPasswordReset(email).subscribe({
      next: (response) => {
        this.isProcessing = false;
        // Store the reset token from response
        this.resetToken = response.resetToken;

        // Move to next step
        this.stepper.next();
        this.startCooldownTimer();

        this.snackBar.open('Verification code sent to your email', 'Close', {
          duration: 5000,
          panelClass: ['success-snackbar'],
        });
      },
      error: (error) => {
        this.isProcessing = false;
        this.snackBar.open(
          error.message || 'Failed to send verification code',
          'Close',
          {
            duration: 5000,
            panelClass: ['error-snackbar'],
          }
        );
      },
    });
  }

  verifyCode() {
    if (this.codeFormGroup.invalid) {
      this.codeSubmitted = true;
      return;
    }

    this.isProcessing = true;
    const otp = this.codeFormGroup.get('code')?.value;

    this.authService
      .verifyResetOTP(this.userEmail, otp, this.resetToken)
      .subscribe({
        next: (response) => {
          this.isProcessing = false;

          // Store the reset token (it might be updated)
          this.resetToken = response.resetToken;

          // Move to next step
          this.stepper.next();

          this.snackBar.open('Code verified successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
        },
        error: (error) => {
          this.isProcessing = false;
          this.snackBar.open(
            error.message || 'Invalid verification code',
            'Close',
            {
              duration: 5000,
              panelClass: ['error-snackbar'],
            }
          );
        },
      });
  }

  resetPassword() {
    if (this.passwordFormGroup.invalid) {
      this.passwordSubmitted = true;
      return;
    }

    this.isProcessing = true;
    const newPassword = this.passwordFormGroup.get('password')?.value;

    this.authService
      .resetPassword(this.userEmail, this.resetToken, newPassword)
      .subscribe({
        next: () => {
          this.isProcessing = false;

          // Move to success step
          this.stepper.next();

          this.snackBar.open('Password reset successful', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
        },
        error: (error) => {
          this.isProcessing = false;
          this.snackBar.open(
            error.message || 'Failed to reset password',
            'Close',
            {
              duration: 5000,
              panelClass: ['error-snackbar'],
            }
          );
        },
      });
  }

  resendCode() {
    if (this.cooldownTimeLeft > 0) return;

    this.isProcessing = true;

    this.authService.requestPasswordReset(this.userEmail).subscribe({
      next: (response) => {
        this.isProcessing = false;

        // Update the reset token
        this.resetToken = response.resetToken;

        // Start cooldown timer
        this.startCooldownTimer();

        this.snackBar.open(
          'New verification code sent to your email',
          'Close',
          {
            duration: 3000,
          }
        );
      },
      error: (error) => {
        this.isProcessing = false;
        this.snackBar.open(
          error.message || 'Failed to resend verification code',
          'Close',
          {
            duration: 5000,
            panelClass: ['error-snackbar'],
          }
        );
      },
    });
  }

  startCooldownTimer(seconds = 60) {
    this.cooldownTimeLeft = seconds;
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cooldownTimeLeft--;
        if (this.cooldownTimeLeft <= 0) {
          this.cooldownTimeLeft = 0;
        }
      });
  }

  onCodeDigitChange(event: any, index: number) {
    const input = event.target;
    const value = input.value;

    // Get all digit inputs
    const inputs = Array.from(
      document.querySelectorAll('.verification-digit')
    ) as HTMLInputElement[];

    if (value.length === 1) {
      // Move to next input if available
      if (index < 5) {
        inputs[index + 1].focus();
      }
    }

    // Combine all digits and update form control
    const code = inputs.map((input) => input.value).join('');
    this.codeFormGroup.get('code')?.setValue(code);
  }

  onCodePaste(event: ClipboardEvent) {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') || '';
    if (!pastedText.match(/^\d+$/)) return;

    const inputs = Array.from(
      document.querySelectorAll('.verification-digit')
    ) as HTMLInputElement[];
    const digits = pastedText.substring(0, 6).split('');

    digits.forEach((digit, i) => {
      if (i < inputs.length) {
        inputs[i].value = digit;
      }
    });

    // Combine all digits and update form control
    const code = inputs.map((input) => input.value).join('');
    this.codeFormGroup.get('code')?.setValue(code);

    // Focus the last filled input or the next empty one
    const lastIndex = Math.min(digits.length, inputs.length) - 1;
    if (lastIndex >= 0) {
      inputs[lastIndex].focus();
    }
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
}
