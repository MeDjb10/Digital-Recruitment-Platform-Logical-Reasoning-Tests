import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { MockDataService } from './mock-data.service';

interface TestQuestion {
  id: number;
  dominos: TestDomino[];
  gridLayout: { rows: number; cols: number };
  instruction?: string;
}

// Enhanced TestDomino interface to include new properties
interface TestDomino {
  id: number;
  row: number;
  col: number;
  topValue: number | null;
  bottomValue: number | null;
  isEditable: boolean;
  isVertical?: boolean;
  color?: string;
  // Add these properties to fix the TypeScript errors
  uniqueId?: string;
  questionId?: number;
}

interface TestData {
  id: string;
  name: string;
  description: string;
  duration: number;
  questions: TestQuestion[];
}

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
      return this.mockDataService.getTest(testId).pipe(
        map((test: TestData) => {
          if (test && test.questions) {
            // Process test questions to ensure isolation
            test.questions = test.questions.map(
              (question: TestQuestion, qIndex: number) => {
                const questionId = question.id;

                // Process dominos for this question
                if (question.dominos) {
                  question.dominos = question.dominos.map(
                    (domino: TestDomino, dIndex: number) => {
                      // Create a new domino with a unique reference
                      const newDomino = { ...domino };

                      // Add extra information to help with debugging and isolation
                      newDomino.uniqueId = `q${questionId}_d${domino.id}`;
                      newDomino.questionId = questionId;

                      // Reset editable dominos
                      if (newDomino.isEditable) {
                        newDomino.topValue = null;
                        newDomino.bottomValue = null;
                      }

                      return newDomino;
                    }
                  );
                }

                return question;
              }
            );
          }
          return test;
        })
      );
    }

    return this.http.get<any>(`${this.apiUrl}/${testId}`).pipe(
      map((test) => {
        if (test && test.questions) {
          // Apply the same transformation for API data
          test.questions = test.questions.map((question: any) => {
            if (question.dominos) {
              question.dominos = question.dominos.map((domino: any) => {
                if (domino.isEditable) {
                  return {
                    ...domino,
                    topValue: null,
                    bottomValue: null,
                  };
                }
                return domino;
              });
            }
            return question;
          });
        }
        return test;
      }),
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

  // Clear all saved test progress from localStorage
  clearAllProgress(): void {
    // Find all keys related to test progress
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_KEY)) {
        keysToRemove.push(key);
      }
    }

    // Remove each key
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.log(`Cleared ${keysToRemove.length} saved test progress items`);
  }

  // Clear progress for a specific test
  clearTestProgress(testId: string): void {
    const storageKey = `${this.STORAGE_KEY}_${testId}`;
    localStorage.removeItem(storageKey);
    console.log(`Cleared saved progress for test: ${testId}`);
  }
}
