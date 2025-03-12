import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.signupForm = this.fb.group({
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
    }, {
      validators: this.passwordMatchValidator
    });

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
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.showVerificationDialog = true;
          this.startCooldown();
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

    return password && confirmPassword && password.value !== confirmPassword.value ? 
      { 'mismatch': true } : null;
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
      const input = document.getElementById(`digit-${index}`) as HTMLInputElement;
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

  resendCode() {
    if (this.cooldownTimeLeft > 0) return;
    
    this.isProcessing = true;
    setTimeout(() => {
      this.isProcessing = false;
      this.startCooldown();
      this.snackBar.open('New verification code sent!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }, 1000);
  }

  verifyCode() {
    this.isProcessing = true;
    this.codeSubmitted = true;
    
    const fullCode = this.verificationCode.join('');
    // Simulate API verification
    setTimeout(() => {
      this.isProcessing = false;
      this.showVerificationDialog = false;
      this.router.navigate(['/dashboard']);
    }, 1500);
  }

  ngOnDestroy() {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }
}
