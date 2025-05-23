import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';
import { UserService } from './user.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserContextService {
  private userProfileSubject = new BehaviorSubject<User | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();
  private profileLoaded = false;

  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {
    // Subscribe to authentication changes
    this.authService.currentUser$.subscribe((authUser) => {
      if (authUser) {
        if (!this.profileLoaded) {
          this.loadUserProfile();
        }
      } else {
        // Clear user profile when user logs out
        this.userProfileSubject.next(null);
        this.profileLoaded = false;
      }
    });
  }

  loadUserProfile(): Observable<User> {
    return this.userService.getMyProfile().pipe(
      tap((response) => {
        this.profileLoaded = true;
        this.userProfileSubject.next(response.user);
      }),
      switchMap((response) => {
        if (response.user) {
          return of(response.user);
        }
        return throwError(() => new Error('User profile not found'));
      }),
      catchError((error) => {
        console.error('Error loading user profile:', error);
        return throwError(() => error);
      })
    );
  }

  refreshUserProfile(): Observable<User> {
    this.profileLoaded = false;
    return this.loadUserProfile();
  }

  updateUserProfile(userData: Partial<User>): Observable<User> {
    const currentAuthUser = this.authService.getCurrentUser();

    if (!currentAuthUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    return this.userService.updateUser(currentAuthUser.id, userData).pipe(
      tap((response) => {
        // Update the local user profile with the new data
        this.userProfileSubject.next(response.user);
      }),
      switchMap((response) => of(response.user)),
      catchError((error) => {
        console.error('Error updating user profile:', error);
        return throwError(() => error);
      })
    );
  }

  getCurrentUserProfile(): User | null {
    return this.userProfileSubject.value;
  }
}
