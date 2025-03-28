import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  User,
  UserResponse,
  UsersResponse,
  TestAuthorizationRequest,
  TestAuthorizationRequestsResponse,
} from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  // Get current user profile
  getMyProfile(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/profile`).pipe(
      tap((response) =>
        console.log('Profile loaded:', response.user.firstName)
      ),
      catchError(this.handleError)
    );
  }

  // Get users with filters (admin/moderator/psychologist)
  getUsers(params: any = {}): Observable<UsersResponse> {
    let httpParams = new HttpParams();

    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    return this.http
      .get<UsersResponse>(this.apiUrl, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  // Get user by id
  getUserById(userId: string): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .get<UserResponse>(`${this.apiUrl}/${userId}`)
      .pipe(catchError(this.handleError));
  }

  // Update user profile
  updateUser(
    userId: string,
    userData: Partial<User>
  ): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .put<UserResponse>(`${this.apiUrl}/${userId}`, userData)
      .pipe(catchError(this.handleError));
  }

  // Update profile picture
  updateProfilePicture(userId: string, file: File): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    const formData = new FormData();
    formData.append('profilePicture', file);

    return this.http
      .post<UserResponse>(`${this.apiUrl}/${userId}/profile-picture`, formData)
      .pipe(catchError(this.handleError));
  }

  // Delete profile picture
  deleteProfilePicture(userId: string): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .delete<UserResponse>(`${this.apiUrl}/${userId}/profile-picture`)
      .pipe(catchError(this.handleError));
  }

  // Submit test authorization request
  submitTestAuthorizationRequest(
    request: TestAuthorizationRequest,
    profilePicture?: File
  ): Observable<UserResponse> {
    const formData = new FormData();

    // Append request data
    for (const key in request) {
      if (request.hasOwnProperty(key)) {
        const value = request[key as keyof TestAuthorizationRequest];
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
    }

    // Append profile picture if provided
    if (profilePicture) {
      formData.append('profilePicture', profilePicture, profilePicture.name);
    }

    return this.http
      .post<UserResponse>(`${this.apiUrl}/test-authorization`, formData)
      .pipe(catchError(this.handleError));
  }

  // Get test authorization requests (for admin/moderator/psychologist)
  getTestAuthorizationRequests(
    params: any = {}
  ): Observable<TestAuthorizationRequestsResponse> {
    let httpParams = new HttpParams();

    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    return this.http
      .get<TestAuthorizationRequestsResponse>(
        `${this.apiUrl}/test-authorization-requests`,
        { params: httpParams }
      )
      .pipe(catchError(this.handleError));
  }

  // Update test authorization status
  updateTestAuthorizationStatus(
    userId: string,
    status: 'approved' | 'rejected'
  ): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .put<UserResponse>(`${this.apiUrl}/${userId}/test-authorization`, {
        status,
      })
      .pipe(catchError(this.handleError));
  }

  // Bulk update test authorization status
  bulkUpdateTestAuthorizationStatus(
    userIds: string[],
    status: 'approved' | 'rejected'
  ): Observable<{
    success: boolean;
    message: string;
    updatedCount: number;
    totalRequested: number;
  }> {
    return this.http
      .put<{
        success: boolean;
        message: string;
        updatedCount: number;
        totalRequested: number;
      }>(`${this.apiUrl}/test-authorization/bulk`, { userIds, status })
      .pipe(catchError(this.handleError));
  }

  // Assign role (admin/moderator)
  assignRole(userId: string, role: string): Observable<UserResponse> {
    // Check if the userId is in valid MongoDB ObjectId format
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .put<UserResponse>(`${this.apiUrl}/role`, { userId, role })
      .pipe(catchError(this.handleError));
  }

  // Delete user (admin only)
  deleteUser(
    userId: string
  ): Observable<{ success: boolean; message: string }> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .delete<{ success: boolean; message: string }>(`${this.apiUrl}/${userId}`)
      .pipe(catchError(this.handleError));
  }

  // Update user status (admin only)
  updateUserStatus(userId: string, status: string): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .patch<UserResponse>(`${this.apiUrl}/${userId}/status`, { status })
      .pipe(catchError(this.handleError));
  }

  // Error handler
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage =
        error.error?.message ||
        `Error Code: ${error.status}, Message: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Add this helper method to validate MongoDB ObjectIds
  private isValidObjectId(id: string): boolean {
    // MongoDB ObjectId is a 24 character hex string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}
