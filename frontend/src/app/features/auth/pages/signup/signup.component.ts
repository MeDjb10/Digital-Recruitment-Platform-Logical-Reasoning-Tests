import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';

// Import Material modules
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogModule } from 'primeng/dialog';
import { finalize, Subject } from 'rxjs';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    DialogModule,
    FormsModule,
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm!: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  isLoading = false;
  signupError: string | null = null;
  passwordStrength = 0;
  passwordStrengthText = 'Password strength';
  showVerificationDialog = false;
  verificationCode: string[] = new Array(6).fill('');
  cooldownTimeLeft = 0;
  isProcessing = false;
  codeSubmitted = false;
  cooldownInterval: any;

  // Email verification properties

  verificationError: string | null = null;

  // Store registration response data
  registeredEmail: string = '';
  activationToken: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.signupForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            // Additional complex validation handled separately for better UX
          ],
        ],
        confirmPassword: ['', [Validators.required]],
        acceptTerms: [false, [Validators.requiredTrue]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

    // Check password strength on input
    this.signupForm.get('password')?.valueChanges.subscribe((password) => {
      this.calculatePasswordStrength(password);
    });
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      // Mark all fields as touched to trigger validation visuals
      Object.keys(this.signupForm.controls).forEach((key) => {
        this.signupForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.signupError = null;

    const { firstName, lastName, email, password } = this.signupForm.value;

    this.authService
      .register({ firstName, lastName, email, password })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.registeredEmail = response.email;
          this.activationToken = response.activationToken;

          this.isLoading = false;
          this.showVerificationDialog = true;
          this.startCooldown();

          this.snackBar.open(
            'Registration initiated! Please check your email for verification code.',
            'Close',
            { duration: 5000, panelClass: ['success-snackbar'] }
          );
        },
        error: (error) => {
          this.isLoading = false;
          this.signupError =
            error.message || 'Registration failed. Please try again.';
          this.snackBar.open(this.signupError || 'An error occurred', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }

  calculatePasswordStrength(password: string): void {
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

  getPasswordError(): string {
    const passwordControl = this.signupForm.get('password');

    if (passwordControl?.hasError('required')) {
      return 'Password is required';
    }

    if (passwordControl?.hasError('minlength')) {
      return 'Password must be at least 8 characters';
    }

    // Custom password strength messages
    if (this.passwordStrength < 3 && passwordControl?.touched) {
      return 'Password should include uppercase, lowercase, numbers, and special characters';
    }

    return '';
  }

  // Add password match validator
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password?.pristine || confirmPassword?.pristine) {
      return null;
    }

    return password &&
      confirmPassword &&
      password.value !== confirmPassword.value
      ? { mismatch: true }
      : null;
  }

  // Helper for form validation display
  hasError(controlName: string, errorName: string): boolean {
    const control = this.signupForm.get(controlName);
    return !!(control && control.hasError(errorName) && control.touched);
  }

  onCodeDigitChange(event: any, index: number) {
    const input = event.target;
    const value = input.value;

    // Update the code array
    this.verificationCode[index] = value;

    // Auto-focus next input
    if (value.length === 1 && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  }

  onCodePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const digits = pastedText.replace(/\D/g, '').split('').slice(0, 6);

    this.verificationCode = [...digits, ...new Array(6)].slice(0, 6);

    // Update input fields
    digits.forEach((digit, index) => {
      const input = document.getElementById(
        `digit-${index}`
      ) as HTMLInputElement;
      if (input) input.value = digit;
    });
  }

  startCooldown() {
    this.cooldownTimeLeft = 60;
    this.cooldownInterval = setInterval(() => {
      if (this.cooldownTimeLeft > 0) {
        this.cooldownTimeLeft--;
      } else {
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }

  resendCode(): void {
    if (this.cooldownTimeLeft > 0 || this.isProcessing) return;

    this.isProcessing = true;
    this.verificationError = null;

    this.authService
      .resendVerificationCode(this.registeredEmail, this.activationToken)
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          // Update activation token if it changed
          this.activationToken = response.activationToken;

          this.startCooldown();
          this.snackBar.open(
            'New verification code sent to your email',
            'Close',
            { duration: 3000, panelClass: ['success-snackbar'] }
          );
        },
        error: (error) => {
          this.verificationError = error.message || 'Failed to resend code';

          this.snackBar.open(
            this.verificationError || 'An error occurred',
            'Close',
            {
              duration: 5000,
              panelClass: ['error-snackbar'],
            }
          );
        },
      });
  }

  // Update your verifyCode method
  verifyCode(): void {
    const fullCode = this.verificationCode.join('');

    if (fullCode.length !== 6) {
      this.verificationError = 'Please enter the 6-digit code';
      return;
    }

    this.isProcessing = true;
    this.codeSubmitted = true;
    this.verificationError = null;

    this.authService
      .verifyEmail(this.registeredEmail, fullCode, this.activationToken)
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          this.showVerificationDialog = false;

          this.snackBar.open(
            'Email verified! You are now logged in.',
            'Close',
            { duration: 3000, panelClass: ['success-snackbar'] }
          );

          // Navigate to dashboard after successful verification
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.verificationError = error.message || 'Verification failed';

          this.snackBar.open(
            this.verificationError || 'An error occurred',
            'Close',
            {
              duration: 5000,
              panelClass: ['error-snackbar'],
            }
          );
        },
      });
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
