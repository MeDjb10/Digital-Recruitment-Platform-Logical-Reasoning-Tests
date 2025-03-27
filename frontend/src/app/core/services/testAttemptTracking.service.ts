import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TestService } from './test.service';

@Injectable({
  providedIn: 'root',
})
export class TestAttemptTrackingService {
  private currentQuestionId: string | null = null;
  private questionStartTime: number = 0;
  private attemptId: string | null = null;
  private timeSpentMap: Map<string, number> = new Map();
  private currentAnswer: any = null;

  // Event streams
  private answerSubmittedSubject = new Subject<{
    questionId: string;
    success: boolean;
  }>();
  private visitRecordedSubject = new Subject<{
    questionId: string;
    timeSpent: number;
  }>();

  public answerSubmitted$ = this.answerSubmittedSubject.asObservable();
  public visitRecorded$ = this.visitRecordedSubject.asObservable();

  constructor(private testService: TestService) {
    console.log('TestAttemptTracking service initialized');
  }

  /**
   * Initialize with attempt information
   */
  initAttempt(attemptId: string): void {
    this.attemptId = attemptId;
    console.log(`Initialized test tracking for attempt: ${attemptId}`);
  }

  /**
   * Start tracking a new question
   */
  startQuestionVisit(questionId: string): void {
    // If there was a previous question, record the time spent on it
    this.endCurrentQuestionVisit();

    // Start tracking the new question
    this.currentQuestionId = questionId;
    this.questionStartTime = Date.now();
    console.log(`Started tracking visit for question ${questionId}`);
  }

  /**
   * End tracking for the current question, send the time spent to the server
   */
  endCurrentQuestionVisit(): void {
    if (
      this.currentQuestionId &&
      this.attemptId &&
      this.questionStartTime > 0
    ) {
      const timeSpent = Math.floor(
        (Date.now() - this.questionStartTime) / 1000
      ); // Convert to seconds

      // Add to our local tracking
      const previousTime = this.timeSpentMap.get(this.currentQuestionId) || 0;
      this.timeSpentMap.set(this.currentQuestionId, previousTime + timeSpent);

      // Send to server
      this.recordVisit(this.currentQuestionId, timeSpent);

      console.log(
        `Ended visit for question ${
          this.currentQuestionId
        }. Time spent: ${timeSpent}s. Total: ${previousTime + timeSpent}s`
      );

      // Reset tracking
      this.questionStartTime = 0;
    }
  }

  /**
   * Record a visit with time spent
   */
  private recordVisit(questionId: string, timeSpent: number): void {
    if (!this.attemptId) {
      console.error('Cannot record visit: No active attempt');
      return;
    }

    this.testService
      .visitQuestion(this.attemptId, questionId, timeSpent)
      .pipe(
        tap((response) => {
          console.log(
            `Visit recorded for question ${questionId}, time spent: ${timeSpent}s`,
            response
          );
          this.visitRecordedSubject.next({ questionId, timeSpent });
        }),
        catchError((error) => {
          console.error('Error recording visit:', error);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Submit an answer for the current question
   */
  submitAnswer(questionId: string, answer: any): Observable<any> {
    if (!this.attemptId) {
      console.error('Cannot submit answer: No active attempt');
      return of(null);
    }

    // Store the current answer for this question
    this.currentAnswer = answer;
    console.log(`Submitting answer for question ${questionId}:`, answer);

    return this.testService
      .submitAnswer(this.attemptId, questionId, answer)
      .pipe(
        tap((response) => {
          console.log(
            `Answer submitted successfully for ${questionId}`,
            response
          );
          this.answerSubmittedSubject.next({ questionId, success: true });
        }),
        catchError((error) => {
          console.error('Error submitting answer:', error);
          this.answerSubmittedSubject.next({ questionId, success: false });
          return of(null);
        })
      );
  }

  /**
   * Toggle flag status for a question
   */
  toggleQuestionFlag(questionId: string): Observable<any> {
    if (!this.attemptId) {
      console.error('Cannot toggle flag: No active attempt');
      return of(null);
    }

    return this.testService.toggleQuestionFlag(this.attemptId, questionId).pipe(
      catchError((error) => {
        console.error('Error toggling flag:', error);
        return of(null);
      })
    );
  }

  /**
   * Skip the current question
   */
  skipQuestion(questionId: string): Observable<any> {
    if (!this.attemptId) {
      console.error('Cannot skip question: No active attempt');
      return of(null);
    }

    return this.testService.skipQuestion(this.attemptId, questionId).pipe(
      catchError((error) => {
        console.error('Error skipping question:', error);
        return of(null);
      })
    );
  }

  /**
   * Complete the test attempt
   */
  completeAttempt(): Observable<any> {
    if (!this.attemptId) {
      console.error('Cannot complete attempt: No active attempt');
      return of(null);
    }

    // Make sure to record any final question visit
    this.endCurrentQuestionVisit();

    return this.testService.completeAttempt(this.attemptId).pipe(
      catchError((error) => {
        console.error('Error completing attempt:', error);
        return of(null);
      })
    );
  }

  /**
   * Cleanup when test is finished
   */
  cleanup(): void {
    this.endCurrentQuestionVisit();
    this.currentQuestionId = null;
    this.attemptId = null;
    this.timeSpentMap.clear();
  }

  /**
   * Get total time spent on a question
   */
  getTimeSpentOnQuestion(questionId: string): number {
    return this.timeSpentMap.get(questionId) || 0;
  }
}
