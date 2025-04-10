import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpErrorResponse,
  HttpEventType,
  HttpResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  User,
  UserResponse,
  UsersResponse,
  TestAuthorizationRequest,
  TestAuthorizationRequestsResponse,
} from '../models/user.model';

// Add a UserFilter interface to match backend filtering capabilities
export interface UserFilters {
  page?: number;
  limit?: number;
  role?: 'candidate' | 'admin' | 'moderator' | 'psychologist';
  search?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

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
  getUsers(filters: UserFilters = {}): Observable<UsersResponse> {
    let httpParams = new HttpParams();

    Object.keys(filters).forEach((key) => {
      const value = filters[key as keyof UserFilters];
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, String(value));
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

  // Update the updateProfilePicture method to handle file uploads correctly
  updateProfilePicture(userId: string, file: File): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    // Log the file being uploaded
    console.log('Uploading profile picture:', {
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    // Create a FormData object
    const formData = new FormData();

    // Add the file to the FormData object
    // The field name MUST match what the server expects (profilePicture)
    formData.append('profilePicture', file, file.name);

    // Log the FormData entries (for debugging)
    console.log(
      `FormData created with file: ${file.name} (${file.size} bytes)`
    );

    // Return the HTTP request, without setting Content-Type
    // The browser will set the correct Content-Type with boundary
    return this.http
      .post<UserResponse>(
        `${this.apiUrl}/${userId}/profile-picture`,
        formData,
        {
          // Important: Do NOT set Content-Type header here
          reportProgress: true,
          observe: 'events',
        }
      )
      .pipe(
        // Filter for the final response event
        filter((event: any) => event.type === HttpEventType.Response),
        map((event: HttpResponse<UserResponse>) => event.body as UserResponse),
        tap((response) => {
          console.log('Profile picture upload successful:', response);
          if (response.user?.profilePicture) {
            // Update the profile picture URL to use the full path
            response.user.profilePicture = this.getFullProfilePictureUrl(
              response.user.profilePicture
            );
          }
        }),
        catchError((error) => {
          console.error('Error in updateProfilePicture:', error);
          return throwError(() => error);
        })
      );
  }

  // Add a method to delete profile picture
  deleteProfilePicture(userId: string): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .delete<UserResponse>(`${this.apiUrl}/${userId}/profile-picture`)
      .pipe(
        tap((response) => console.log('Profile picture deleted successfully')),
        catchError(this.handleError)
      );
  }

  // Helper method to convert relative URLs to full URLs
  private getFullProfilePictureUrl(url: string): string {
    if (!url) return url;

    // If it's already a complete URL, return it
    if (url.startsWith('http')) return url;

    // If it's a relative URL, prepend the API base URL
    if (url.startsWith('/uploads')) {
      const baseUrl = environment.apiUrl.split('/api')[0]; // Get base URL without /api
      return `${baseUrl}${url}`;
    }

    // Return original if neither condition matches
    return url;
  }

  // Submit test authorization request
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
      console.log(
        'Adding profile picture to request:',
        profilePicture.name,
        profilePicture.size
      );
      formData.append('profilePicture', profilePicture, profilePicture.name);
    }

    // Log FormData contents for debugging
    formData.forEach((value, key) => {
      if (value instanceof File) {
        console.log(
          `FormData: ${key} = File(${value.name}, ${value.size} bytes)`
        );
      } else {
        console.log(`FormData: ${key} = ${value}`);
      }
    });

    return this.http
      .post<UserResponse>(`${this.apiUrl}/test-authorization`, formData)
      .pipe(
        tap((response) =>
          console.log('Test authorization request submitted:', response)
        ),
        catchError(this.handleError)
      );
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

  // Manual test assignment for approved candidates
  manualTestAssignment(
    userId: string,
    assignmentData: {
      assignedTest: 'D-70' | 'D-2000';
      additionalTests?: string[];
      examDate?: Date | string;
    }
  ): Observable<UserResponse> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .put<UserResponse>(
        `${this.apiUrl}/${userId}/test-assignment`,
        assignmentData
      )
      .pipe(
        tap((response) => console.log('Test assignment updated successfully')),
        catchError(this.handleError)
      );
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
