import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Just to verify HttpClient is available
    console.log('AuthService initialized with HttpClient');
  }

  login(email: string, password: string): Observable<AuthResponse> {
    // For testing only - use mock data instead of real HTTP call
    console.log('Mock login for:', email);
    return of({
      user: {
        id: '1',
        firstName: 'Test',
        lastName: 'User',
        email: email,
        role: 'candidate',
      },
      accessToken: 'mock-jwt-token',
    }).pipe(delay(1000));
  }

  register(userData: any): Observable<any> {
    // For testing only - use mock data instead of real HTTP call
    console.log('Mock register for:', userData.email);
    return of({
      success: true,
      message: 'User registered successfully',
    }).pipe(delay(1000));
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }
}
