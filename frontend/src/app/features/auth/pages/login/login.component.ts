import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  hidePassword = true;
  isLoading = false;

  loginError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false],
    });

    // Pre-fill email if coming from verification
    const verified = this.route.snapshot.queryParams['verified'];
    const email = this.route.snapshot.queryParams['email'];
    
    if (verified === 'true' && email) {
      this.loginForm.get('email')?.setValue(email);
      this.snackBar.open('Email verified successfully! You can now log in.', 'Close', {
        duration: 5000,
        panelClass: ['success-snackbar']
      });
    }

    // Show message if there was an auth error
    const authError = this.route.snapshot.queryParams['authError'];
    if (authError === 'session-expired') {
      this.snackBar.open(
        'Your session has expired. Please log in again.',
        'Close',
        {
          duration: 5000,
        }
      );
    }

    // Check if user is already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.loginError = null;

      const { email, password, rememberMe } = this.loginForm.value;

      this.authService.login(email, password, rememberMe).subscribe({
        next: () => {
          this.isLoading = false;

          // Navigate to return URL or dashboard
     
        },
        error: (error) => {
          this.isLoading = false;
          this.loginError =
            error.message || 'Login failed. Please check your credentials.';

          this.snackBar.open(this.loginError || 'An unknown error occurred', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        },
      });
    } else {
      // Mark all fields as touched to trigger validation
      this.loginForm.markAllAsTouched();
    }
  }

  
}
