import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, finalize, switchMap, take } from 'rxjs/operators';

// For token refresh handling
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip adding token for auth endpoints except token refresh
  if (
    (req.url.includes('/auth/login') ||
      req.url.includes('/auth/register') ||
      req.url.includes('/auth/forgot-password')) &&
    !req.url.includes('/auth/refresh-token')
  ) {
    return next(req);
  }

  // Get the auth token
  const token = authService.getToken();

  // Clone the request with the authorization header
  if (token) {
    req = addTokenToRequest(req, token);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Try to refresh token if unauthorized
        return handleUnauthorizedError(req, next, authService, router);
      }

      // Handle 403 Forbidden responses
      if (error.status === 403) {
        console.error(
          'Access forbidden:',
          error.error?.message ||
            'You do not have permission to access this resource'
        );
        router.navigate(['/dashboard']);
      }

      return throwError(() => error);
    })
  );
};

function addTokenToRequest(
  request: HttpRequest<any>,
  token: string
): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function handleUnauthorizedError(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<any> {
  // If not already refreshing token
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    // Get refresh token
    const refreshToken = authService.getRefreshToken();

    if (!refreshToken) {
      // No refresh token available, logout and redirect
      isRefreshing = false;
      authService.logout();
      router.navigate(['/auth/login']);
      return throwError(() => new Error('No refresh token available'));
    }

    // Make a request to refresh the token
    // This method needs to be implemented in your AuthService
    return authService.refreshTokenRequest().pipe(
      switchMap((response) => {
        isRefreshing = false;

        // Store the new token
        refreshTokenSubject.next(response.accessToken);

        // Clone the original request with new token
        return next(addTokenToRequest(request, response.accessToken));
      }),
      catchError((error) => {
        isRefreshing = false;
        authService.logout();
        router.navigate(['/auth/login']);
        return throwError(() => error);
      }),
      finalize(() => {
        isRefreshing = false;
      })
    );
  } else {
    // Wait for token to be refreshed
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => {
        return next(addTokenToRequest(request, token!));
      })
    );
  }
}
