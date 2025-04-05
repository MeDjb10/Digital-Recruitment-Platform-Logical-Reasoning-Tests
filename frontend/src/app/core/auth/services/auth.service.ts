import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models/user.model';


export interface AuthResponse {
  message?: string;
  accessToken: string;
  refreshToken: string;
  user?: User;
}

export interface RegistrationResponse {
  message: string;
  email: string;
  activationToken: string;
}

export interface EmailVerificationResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface PasswordResetResponse {
  message: string;
  resetToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenExpiryTimer: any;

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromTokens();
  }

  // Load user details from stored tokens
  private loadUserFromTokens(): void {
    const token = this.getToken();
    if (token) {
      try {
        // Parse the JWT token to get user data
        const payload = JSON.parse(atob(token.split('.')[1]));

        if (payload.exp * 1000 < Date.now()) {
          // Token expired, log out user
          this.logout();
          return;
        }

        // Set auto logout timer
        this.setAutoLogout(payload.exp * 1000 - Date.now());

        // Create user object from token payload
        const user: User = {
          id: payload.id,
          firstName: payload.firstName || '',
          lastName: payload.lastName || '',
          email: payload.email || '',
          role: payload.role || 'candidate',
        };

        this.currentUserSubject.next(user);
      } catch (e) {
        console.error('Error parsing auth token', e);
        this.logout();
      }
    }
  }

  register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Observable<RegistrationResponse> {
    return this.http
      .post<RegistrationResponse>(`${this.apiUrl}/register`, userData)
      .pipe(
        catchError((error) => {
          const errorMessage = error.error?.message || 'Registration failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  getUserRole(): string {
    return this.currentUserSubject.value?.role || 'candidate';
  }

  // Verify email with OTP after registration
  verifyEmail(
    email: string,
    otp: string,
    activationToken: string
  ): Observable<EmailVerificationResponse> {
    return this.http
      .post<EmailVerificationResponse>(`${this.apiUrl}/verify-email`, {
        email,
        otp,
        activationToken,
      })
      .pipe(
        tap((response) => {
          // Store tokens on successful verification
          if (response.accessToken && response.refreshToken) {
            this.storeTokens(response.accessToken, response.refreshToken, true);

            // Parse the token for user info
            this.loadUserFromTokens();
          }
        }),
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'Email verification failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Resend verification code
  resendVerificationCode(
    email: string,
    activationToken: string
  ): Observable<RegistrationResponse> {
    return this.http
      .post<RegistrationResponse>(`${this.apiUrl}/resend-verification`, {
        email,
        activationToken,
      })
      .pipe(
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'Failed to resend verification code';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Login user with email and password
  login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Observable<any> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((response) => {
          // Store tokens
          this.storeTokens(
            response.accessToken,
            response.refreshToken,
            rememberMe
          );

          // Parse the token for user info
          this.loadUserFromTokens();

          // Route the user based on their role (moved from AuthGuard)
          const userRole = this.getCurrentUser()?.role;

          if (userRole === 'candidate') {
            this.router.navigate(['/home']);
          } else if (
            ['admin', 'moderator', 'psychologist'].includes(userRole || '')
          ) {
            this.router.navigate(['/dashboard']);
          } else {
            // Default fallback
            this.router.navigate(['/home']);
          }
        }),
        catchError((error) => {
          const errorMessage = error.error?.message || 'Login failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Request password reset (sends OTP)
  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.apiUrl}/request-password-reset`, {
        email,
      })
      .pipe(
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'Password reset request failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Verify OTP for password reset
  verifyResetOTP(
    email: string,
    otp: string,
    resetToken: string
  ): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.apiUrl}/verify-reset-otp`, {
        email,
        otp,
        resetToken,
      })
      .pipe(
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'OTP verification failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Reset password with new password
  resetPassword(
    email: string,
    resetToken: string,
    newPassword: string
  ): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/reset-password`, {
        email,
        resetToken,
        newPassword,
      })
      .pipe(
        catchError((error) => {
          const errorMessage = error.error?.message || 'Password reset failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Request login with OTP
  requestLoginOTP(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-login-otp`, { email }).pipe(
      catchError((error) => {
        const errorMessage = error.error?.message || 'OTP request failed';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // Verify login OTP
  verifyLoginOTP(email: string, otp: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/verify-login-otp`, { email, otp })
      .pipe(
        tap((response) => {
          // Store tokens
          this.storeTokens(response.accessToken, response.refreshToken);

          // Parse the token for user info
          this.loadUserFromTokens();
        }),
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'OTP verification failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Logout user
  logout(): void {
    // Clear tokens from storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');

    // Clear user subject
    this.currentUserSubject.next(null);

    // Clear auto logout timer
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
      this.tokenExpiryTimer = null;
    }

    // Navigate to login
    this.router.navigate(['/auth/login']);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUserSubject.value;
  }

  // Get current authentication token
  getToken(): string | null {
    return (
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token')
    );
  }

  // Get refresh token
  getRefreshToken(): string | null {
    return (
      localStorage.getItem('refresh_token') ||
      sessionStorage.getItem('refresh_token')
    );
  }

  // Get current logged in user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Store tokens in local/session storage
  private storeTokens(
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean = false
  ): void {
    const storage = rememberMe ? localStorage : sessionStorage;

    // Clear any existing tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');

    // Store new tokens
    storage.setItem('access_token', accessToken);
    storage.setItem('refresh_token', refreshToken);
  }

  // Set timer for auto logout when token expires
  private setAutoLogout(expiryDuration: number): void {
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
    }

    this.tokenExpiryTimer = setTimeout(() => {
      this.logout();
    }, expiryDuration);
  }

  // Add this method to your AuthService class
  refreshTokenRequest(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh-token`, {
        refreshToken,
      })
      .pipe(
        tap((response) => {
          // Store the new tokens
          this.storeTokens(
            response.accessToken,
            response.refreshToken || refreshToken, // Use new refresh token if provided, otherwise keep the old one
            localStorage.getItem('access_token') !== null // Keep in localStorage if it was there before
          );

          // Parse the new token for user info
          this.loadUserFromTokens();
        }),
        catchError((error) => {
          const errorMessage = error.error?.message || 'Token refresh failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }
}