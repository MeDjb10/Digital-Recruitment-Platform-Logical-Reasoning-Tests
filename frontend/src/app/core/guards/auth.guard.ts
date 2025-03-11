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

      // Check if route has required roles
      if (route.data['roles'] && !route.data['roles'].includes(userRole)) {
        // Role not authorized
        this.router.navigate(['/dashboard']);
        return false;
      }

      // Authenticated and authorized
      return true;
    }

    // Not logged in, redirect to login with return url
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }
}
