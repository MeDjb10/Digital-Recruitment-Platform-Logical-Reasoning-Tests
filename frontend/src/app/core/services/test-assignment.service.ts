import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class TestAssignmentService {
  private apiUrl = `${environment.apiUrl}/assignments`; // Endpoint to test-assignment-service

  constructor(private http: HttpClient) {}

  // Manual test assignment
  manualTestAssignment(
    userId: string,
    assignmentData: {
      assignedTestId: string;
      additionalTestIds?: string[];
      examDate?: Date | string;
    }
  ): Observable<any> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .put<{ success: boolean; message: string }>(
        `${this.apiUrl}/${userId}/assign`,
        assignmentData
      )
      .pipe(
        tap((response) =>
          console.log('Test assignment updated successfully:', response)
        ),
        catchError(this.handleError)
      );
  }

  // Bulk update test authorization status with automatic test assignment
  bulkAssignment(
    userIds: string[],
    status: 'approved' | 'rejected',
    examDate?: Date
  ): Observable<{
    success: boolean;
    message?: string;
    successCount: number;
    totalRequested: number;
  }> {
    const payload = {
      userIds,
      status,
      ...(examDate && { examDate: examDate.toISOString() }),
    };

    return this.http
      .put<{
        success: boolean;
        message?: string;
        successCount: number;
        totalRequested: number;
      }>(`${this.apiUrl}/bulk-update`, payload)
      .pipe(
        tap((response) => console.log('Bulk assignment completed:', response)),
        catchError(this.handleError)
      );
  }

  // Get assignment status for a user
  getAssignmentStatus(userId: string): Observable<any> {
    if (!this.isValidObjectId(userId)) {
      return throwError(() => new Error('Invalid user ID format'));
    }

    return this.http
      .get<any>(`${this.apiUrl}/${userId}`)
      .pipe(catchError(this.handleError));
  }

  // Error handler (reuse from user.service.ts)
  private handleError(error: any) {
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

  // Add a helper method to validate MongoDB ObjectIds
  private isValidObjectId(id: string): boolean {
    // MongoDB ObjectId is a 24 character hex string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}
