import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { TestService } from '../../../../core/services/test.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TestAttemptTrackingService } from '../../../../core/services/testAttemptTracking.service';

@Injectable({
  providedIn: 'root',
})
export class DominoTestService {
  private readonly STORAGE_KEY_PREFIX = 'domino_test_progress_';
  private currentAttemptId: string | null = null;

  constructor(
    private testService: TestService,
    private authService: AuthService,
    private trackingService: TestAttemptTrackingService
  ) {}

  /**
   * Get test with questions from the backend
   */
  getTest(testId: string): Observable<any> {
    return this.testService.getTestWithQuestions(testId).pipe(
      tap((response) => {
        // Store the attempt ID for future reference
        if (response && response.attemptId) {
          this.currentAttemptId = response.attemptId;

          // Initialize the tracking service with this attempt ID
          this.trackingService.initAttempt(response.attemptId);

          console.log(`Test loaded with attempt ID: ${response.attemptId}`);
        }
      }),
      catchError((error) => {
        console.error('Error fetching test data:', error);
        // Return placeholder empty data on error
        return of({
          id: testId,
          name: 'Error Loading Test',
          description:
            'There was a problem loading the test. Please try again.',
          duration: 30,
          questions: [],
        });
      })
    );
  }

  /**
   * Submit an answer for a question
   */
  submitAnswer(questionId: string, answer: any): Observable<any> {
    return this.trackingService.submitAnswer(questionId, answer).pipe(
      tap((response) => {
        console.log(`Answer submitted for question ${questionId}:`, response);
      }),
      catchError((error) => {
        console.error('Error submitting answer:', error);
        return of(null);
      })
    );
  }

  /**
   * Toggle flag for a question
   */
  toggleQuestionFlag(questionId: string): Observable<any> {
    return this.trackingService.toggleQuestionFlag(questionId).pipe(
      tap((response) => {
        console.log(`Flag toggled for question ${questionId}:`, response);
      }),
      catchError((error) => {
        console.error('Error toggling question flag:', error);
        return of(null);
      })
    );
  }

  /**
   * Skip the current question
   */
  skipQuestion(questionId: string): Observable<any> {
    return this.trackingService.skipQuestion(questionId).pipe(
      tap((response) => {
        console.log(`Question ${questionId} skipped:`, response);
      }),
      catchError((error) => {
        console.error('Error skipping question:', error);
        return of(null);
      })
    );
  }

  /**
   * Start tracking a question visit
   */
  startQuestionVisit(questionId: string): void {
    this.trackingService.startQuestionVisit(questionId);
  }

  /**
   * End tracking a question visit
   */
  endQuestionVisit(): void {
    this.trackingService.endCurrentQuestionVisit();
  }

  /**
   * Complete the test attempt
   */
  completeTest(): Observable<any> {
    // First end the current question visit to record the final time
    this.endQuestionVisit();

    // Then complete the attempt
    return this.trackingService.completeAttempt().pipe(
      tap((response) => {
        console.log('Test completed successfully:', response);

        // Clean up local storage and tracking data
        if (this.currentAttemptId) {
          this.clearTestProgress(this.currentAttemptId);
        }
      }),
      catchError((error) => {
        console.error('Error completing test:', error);
        return of(null);
      })
    );
  }

  /**
   * Save test progress to localStorage
   */
  saveProgress(testId: string, progressData: any): void {
    const key = this.getStorageKey(testId);
    try {
      // Add attempt ID to the saved data
      progressData.attemptId = this.currentAttemptId;

      localStorage.setItem(key, JSON.stringify(progressData));
      console.log(`Progress saved for test ${testId}`);
    } catch (e) {
      console.error('Error saving test progress:', e);
    }
  }

  /**
   * Load test progress from localStorage
   */
  loadProgress(testId: string): any {
    const key = this.getStorageKey(testId);
    try {
      const progressData = localStorage.getItem(key);
      if (!progressData) return null;

      const progress = JSON.parse(progressData);

      // Restore attempt ID if available
      if (progress.attemptId) {
        this.currentAttemptId = progress.attemptId;
        this.trackingService.initAttempt(progress.attemptId);
      }

      return progress;
    } catch (e) {
      console.error('Error loading test progress:', e);
      return null;
    }
  }

  /**
   * Clear test progress from localStorage and reset tracking
   */
  clearTestProgress(testId: string): void {
    const key = this.getStorageKey(testId);
    localStorage.removeItem(key);

    // Also clean up tracking service data
    this.trackingService.cleanup();
    this.currentAttemptId = null;
  }

  /**
   * Get the current attempt ID
   */
  getCurrentAttemptId(): string | null {
    return this.currentAttemptId;
  }

  /**
   * Evaluate an answer to check if it's correct
   */
  evaluateAnswer(
    userAnswer: { topValue: number | null; bottomValue: number | null },
    correctAnswer: { topValue: number | null; bottomValue: number | null }
  ): {
    isCorrect: boolean;
    isReversed: boolean;
    isHalfCorrect: boolean;
  } {
    // Handle null cases
    if (
      !userAnswer ||
      !correctAnswer ||
      userAnswer.topValue === null ||
      userAnswer.bottomValue === null ||
      correctAnswer.topValue === null ||
      correctAnswer.bottomValue === null
    ) {
      return { isCorrect: false, isReversed: false, isHalfCorrect: false };
    }

    // Exact match
    const exactMatch =
      userAnswer.topValue === correctAnswer.topValue &&
      userAnswer.bottomValue === correctAnswer.bottomValue;

    // Reversed match (domino flipped)
    const reversedMatch =
      userAnswer.topValue === correctAnswer.bottomValue &&
      userAnswer.bottomValue === correctAnswer.topValue;

    // Half match (only one side correct)
    const halfMatch =
      (userAnswer.topValue === correctAnswer.topValue ||
        userAnswer.bottomValue === correctAnswer.bottomValue ||
        userAnswer.topValue === correctAnswer.bottomValue ||
        userAnswer.bottomValue === correctAnswer.topValue) &&
      !(exactMatch || reversedMatch);

    return {
      isCorrect: exactMatch,
      isReversed: reversedMatch,
      isHalfCorrect: halfMatch,
    };
  }

  /**
   * Get storage key for a specific test
   */
  private getStorageKey(testId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${testId}`;
  }

  getAvailableTests(): Observable<any[]> {
    return this.testService
      .getAllTests({
        isActive: true,
        category: 'logical',
      })
      .pipe(
        map((response) => {
          if (!response.success) {
            return [];
          }

          return response.data.map((test) => ({
            id: test._id,
            name: test.name,
            description: test.description || 'No description available',
            duration: test.duration,
            totalQuestions: test.totalQuestions || 0,
            difficulty: test.difficulty,
            type: test.type || 'unknown',
          }));
        }),
        catchError((error) => {
          console.error('Error loading available tests:', error);
          return throwError(() => new Error('Failed to load available tests'));
        })
      );
  }
}
