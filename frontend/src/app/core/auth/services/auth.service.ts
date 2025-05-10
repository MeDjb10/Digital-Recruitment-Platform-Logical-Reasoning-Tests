import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models/user.model';

export interface AuthResponse {
  success: boolean;
  message?: string;
  accessToken: string;
  refreshToken: string;
  rememberMe?: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  };
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  email: string;
  requiresVerification: boolean;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    isActive: boolean;
  };
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface OtpVerificationResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Auth service endpoints
  private authApiUrl = `${environment.apiUrl}/auth`;

  // User management service endpoints - use correct base URL
  private userMgmtApiUrl = `${environment.apiUrl}/users`;

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

  // Register user - Now handled by User Management Service
  register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Observable<RegistrationResponse> {
    return this.http
      .post<RegistrationResponse>(`${this.userMgmtApiUrl}/signup`, userData)
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

  updateCurrentUser(updatedUser: User): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser && updatedUser) {
      let hasChanges = false;
      const mergedUser = { ...currentUser };

      Object.keys(updatedUser).forEach((key) => {
        const typedKey = key as keyof User;
        if (
          updatedUser[typedKey] !== undefined &&
          updatedUser[typedKey] !== currentUser[typedKey]
        ) {
          (mergedUser[typedKey] as (typeof updatedUser)[typeof typedKey]) =
            updatedUser[typedKey];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        console.log(
          'Updating current user with changes:',
          Object.keys(updatedUser).filter((key) => {
            const typedKey = key as keyof User;
            return updatedUser[typedKey] !== currentUser[typedKey];
          })
        );
        this.currentUserSubject.next(mergedUser);
      }
    }
  }

  // Verify email with OTP after registration - Now handled by User Management Service
  verifyEmail(
    email: string,
    otp: string
  ): Observable<EmailVerificationResponse> {
    return this.http
      .post<EmailVerificationResponse>(`${this.userMgmtApiUrl}/verify-otp`, {
        email,
        otp,
      })
      .pipe(
        tap((response) => {
          console.log('Email verified successfully:', response.message);
        }),
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'Email verification failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Resend verification code - Now handled by User Management Service
  resendVerificationCode(email: string): Observable<RegistrationResponse> {
    return this.http
      .post<RegistrationResponse>(
        `${this.userMgmtApiUrl}/resend-verification`,
        {
          email,
        }
      )
      .pipe(
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'Failed to resend verification code';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Login user - Still handled by Authentication Service
  login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authApiUrl}/login`, {
        email,
        password,
        rememberMe,
      })
      .pipe(
        tap((response) => {
          // Store tokens with rememberMe preference
          this.storeTokens(
            response.accessToken,
            response.refreshToken,
            rememberMe || response.rememberMe || false
          );

          // Parse the token for user info
          this.loadUserFromTokens();

          // Route the user based on their role
          const userRole = this.getCurrentUser()?.role;
          if (userRole === 'candidate') {
            this.router.navigate(['/home']);
          } else if (
            ['admin', 'moderator', 'psychologist'].includes(userRole || '')
          ) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/home']);
          }
        }),
        catchError((error) => {
          const errorMessage = error.error?.message || 'Login failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Request password reset - Now handled by User Management Service
  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(
        `${this.userMgmtApiUrl}/request-password-reset`,
        {
          email,
        }
      )
      .pipe(
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'Password reset request failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Verify OTP for password reset - Now handled by User Management Service
  verifyResetOTP(
    email: string,
    otp: string
  ): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.userMgmtApiUrl}/verify-reset-otp`, {
        email,
        otp,
      })
      .pipe(
        catchError((error) => {
          const errorMessage =
            error.error?.message || 'OTP verification failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Reset password - Now handled by User Management Service
  resetPassword(
    email: string,
    newPassword: string
  ): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.userMgmtApiUrl}/reset-password`, {
        email,
        newPassword,
      })
      .pipe(
        catchError((error) => {
          const errorMessage = error.error?.message || 'Password reset failed';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Logout - Still handled by Authentication Service
  logout(): Observable<any> {
    // Make a call to the logout endpoint if user is logged in
    if (this.isLoggedIn()) {
      return this.http.post(`${this.authApiUrl}/logout`, {}).pipe(
        tap(() => {
          this.clearAuthData();
        }),
        catchError((error) => {
          // Still clear auth data even if logout API call fails
          this.clearAuthData();
          return throwError(
            () => new Error('Logout failed on server but cleared locally')
          );
        })
      );
    } else {
      // If no user is logged in, just clear local data
      this.clearAuthData();
      return new Observable((observer) => {
        observer.next({ success: true });
        observer.complete();
      });
    }
  }

  // Helper method to clear auth data
  private clearAuthData(): void {
    // Clear tokens from storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('rememberMe');
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

  getCurrentUserId(): string {
    const currentUser = this.getCurrentUser();
    return currentUser ? currentUser.id : '';
  }

  // Store tokens in local/session storage based on rememberMe option
  private storeTokens(
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean = false
  ): void {
    const storage = rememberMe ? localStorage : sessionStorage;

    // Clear any existing tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');

    // Store new tokens
    storage.setItem('access_token', accessToken);
    storage.setItem('refresh_token', refreshToken);
    storage.setItem('rememberMe', String(rememberMe));
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

  // Refresh token - Still handled by Authentication Service
  refreshTokenRequest(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<AuthResponse>(`${this.authApiUrl}/refresh-token`, {
        refreshToken,
      })
      .pipe(
        tap((response) => {
          // Store the new tokens, preserving the original rememberMe setting
          this.storeTokens(
            response.accessToken,
            response.refreshToken || refreshToken,
            response.rememberMe !== undefined ? response.rememberMe : rememberMe
          );

          // Parse the new token for user info
          this.loadUserFromTokens();
        }),
        catchError((error) => {
          const errorMessage = error.error?.message || 'Token refresh failed';
          if (error.status === 401) {
            this.clearAuthData(); // Clear auth data on unauthorized error
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }
}
