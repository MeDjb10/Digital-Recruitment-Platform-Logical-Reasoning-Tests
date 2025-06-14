import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  getCurrentUserId(): string {
    // Get user ID from stored session/token
    const user = this.getCurrentUser();
    return user?.id || '';
  }

  getCurrentUserName(): string {
    // Get username from stored session/token
    const user = this.getCurrentUser();
    return user?.name || '';
  }

  getCurrentUserRole(): string {
    // Get user role from stored session/token
    const user = this.getCurrentUser();
    return user?.role || '';
  }

  private getCurrentUser() {
    // Get user from localStorage or other storage mechanism
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}
