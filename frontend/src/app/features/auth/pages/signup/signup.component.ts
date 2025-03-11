import { Component, OnInit } from '@angular/core';
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
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  hidePassword = true;
  isLoading = false;
  signupError: string | null = null;
  passwordStrength = 0;
  passwordStrengthText = 'Password strength';

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
      acceptTerms: [false, [Validators.requiredTrue]],
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
          this.snackBar.open(
            'Account created successfully! Please check your email.',
            'Close',
            {
              duration: 5000,
              panelClass: ['success-snackbar'],
            }
          );

          // Auto-login after successful registration
          this.authService.login(email, password, true).subscribe({
            next: () => {
              this.router.navigate(['/dashboard']);
            },
            error: (error) => {
              // If auto-login fails, still redirect to login
              this.router.navigate(['/auth/login'], {
                queryParams: { registered: 'success' },
              });
            },
          });
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

  // Helper for form validation display
  hasError(controlName: string, errorName: string): boolean {
    const control = this.signupForm.get(controlName);
    return !!(control && control.hasError(errorName) && control.touched);
  }
}
