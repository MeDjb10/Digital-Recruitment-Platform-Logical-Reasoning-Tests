import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class DashboardGuard implements CanActivate {
  // Array of roles that can access the dashboard
  private allowedRoles: string[] = ['admin', 'moderator', 'psychologist'];
  private snackBar = inject(MatSnackBar);

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return this.authService.currentUser$.pipe(
      take(1),
      map((user) => {
        // Check if user exists and has one of the allowed roles
        if (user && this.allowedRoles.includes(user.role)) {
          return true;
        }

        // If user is authenticated but doesn't have the right role
        if (user) {
          // Show snackbar message
          this.snackBar.open(
            "Vous n'avez pas les permissions nécessaires pour accéder au tableau de bord.",
            'Fermer',
            {
              duration: 5000,
              panelClass: ['error-snackbar'],
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
            }
          );

          // Redirect to home page
          return this.router.createUrlTree(['/home']);
        }

        // If not authenticated, redirect to login
        return this.router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: state.url },
        });
      })
    );
  }
}
