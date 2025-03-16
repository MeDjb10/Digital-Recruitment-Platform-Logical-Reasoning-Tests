import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { MockDataService } from './mock-data.service';

@Injectable({
  providedIn: 'root',
})
export class DominoTestService {
  private apiUrl = `${environment.apiUrl || 'api'}/tests`;
  private readonly STORAGE_KEY = 'domino_test_progress';
  private useMockData = true; // Set to true to use mock data instead of API calls

  constructor(
    private http: HttpClient,
    private mockDataService: MockDataService
  ) {}

  // Get test data
  getTest(testId: string): Observable<any> {
    if (this.useMockData) {
      return this.mockDataService.getTest(testId);
    }

    return this.http.get<any>(`${this.apiUrl}/${testId}`).pipe(
      catchError((error) => {
        console.error('Error fetching test:', error);
        return of(null);
      })
    );
  }

  // Save test progress to localStorage and optionally to server
  saveProgress(testId: string, progress: any): void {
    // Save to localStorage
    const storageKey = `${this.STORAGE_KEY}_${testId}`;
    localStorage.setItem(storageKey, JSON.stringify(progress));

    // Also attempt to save to server if online
    if (navigator.onLine) {
      if (this.useMockData) {
        this.mockDataService.saveProgress(testId, progress).subscribe();
      } else {
        this.http
          .post(`${this.apiUrl}/${testId}/progress`, progress)
          .pipe(
            catchError((error) => {
              console.error('Failed to save progress to server:', error);
              return of(null);
            })
          )
          .subscribe();
      }
    }
  }

  // Load test progress from localStorage
  loadProgress(testId: string): any {
    const storageKey = `${this.STORAGE_KEY}_${testId}`;
    const progressData = localStorage.getItem(storageKey);

    if (progressData) {
      try {
        return JSON.parse(progressData);
      } catch (e) {
        console.error('Error parsing saved test progress:', e);
        return null;
      }
    }

    return null;
  }

  // Submit completed test
  submitTest(testId: string, answers: any[]): Observable<any> {
    const submission = {
      testId,
      answers,
      submittedAt: new Date().toISOString(),
    };

    if (this.useMockData) {
      return this.mockDataService.submitTest(testId, answers).pipe(
        tap(() => {
          // Clear saved progress after successful submission
          const storageKey = `${this.STORAGE_KEY}_${testId}`;
          localStorage.removeItem(storageKey);
        })
      );
    }

    return this.http
      .post<any>(`${this.apiUrl}/${testId}/submit`, submission)
      .pipe(
        tap(() => {
          // Clear saved progress after successful submission
          const storageKey = `${this.STORAGE_KEY}_${testId}`;
          localStorage.removeItem(storageKey);
        }),
        catchError((error) => {
          console.error('Error submitting test:', error);
          return of({
            success: false,
            error: error.message,
            // Provide mock score for demo purposes when server is unavailable
            score: Math.floor(Math.random() * 100),
          });
        })
      );
  }

  // Get analytics for a specific test (for admin/psychologist)
  getTestAnalytics(testId: string): Observable<any> {
    if (this.useMockData) {
      return this.mockDataService.getTestAnalytics(testId);
    }

    return this.http.get<any>(`${this.apiUrl}/${testId}/analytics`).pipe(
      catchError((error) => {
        console.error('Error fetching test analytics:', error);
        return of(null);
      })
    );
  }

  // Get test results for a specific candidate
  getTestResults(
    testId: string,
    candidateId: string = 'current-user'
  ): Observable<any> {
    if (this.useMockData) {
      return this.mockDataService.getTestResults(testId, candidateId);
    }

    return this.http
      .get<any>(`${this.apiUrl}/${testId}/results/${candidateId}`)
      .pipe(
        catchError((error) => {
          console.error('Error fetching test results:', error);
          return of(null);
        })
      );
  }

  // Get all available tests for candidate
  getAvailableTests(): Observable<any[]> {
    if (this.useMockData) {
      return this.mockDataService.getAvailableTests();
    }

    return this.http.get<any[]>(`${this.apiUrl}/available`).pipe(
      catchError((error) => {
        console.error('Error fetching available tests:', error);
        return of([]);
      })
    );
  }
}
