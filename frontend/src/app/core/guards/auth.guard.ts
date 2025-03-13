import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    if (this.authService.isLoggedIn()) {
      // Get current user role
      const userRole = this.authService.getCurrentUser()?.role;

      // Handle route-specific role requirements
      if (route.data['roles'] && !route.data['roles'].includes(userRole)) {
        // Role not authorized for this specific route

        // Redirect based on role
        if (userRole === 'candidate') {
          // Candidates go to home
          this.router.navigate(['/home']);
        } else if (
          ['admin', 'moderator', 'psychologist'].includes(userRole || '')
        ) {
          // Staff roles go to dashboard
          this.router.navigate(['/dashboard']);
        } else {
          // Default fallback
          this.router.navigate(['/home']);
        }
        return false;
      }

      // Route has no role restrictions or user has required role
      return true;
    }

    // Not logged in, redirect to login with return url
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  /**
   * Special method to handle initial route after login
   * Can be called from login component or auth service
   */
  routeBasedOnRole(): void {
    const userRole = this.authService.getCurrentUser()?.role;

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
  }
}
