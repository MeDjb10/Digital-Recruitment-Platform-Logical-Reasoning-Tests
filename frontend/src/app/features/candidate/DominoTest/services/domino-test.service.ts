
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { TestService } from '../../../../core/services/test.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { DominoChange } from '../../../../core/models/domino.model';

// Define interfaces for tracking test metrics
interface UserTestMetrics {
  testId: string;
  startTime: Date;
  totalTimeSpent: number;
  questionsAnswered: number;
  questionsSkipped: number;
  answerChanges: number;
  flaggedQuestions: number;
  visitCounts: Record<number, number>;
  timePerQuestion: Record<number, number>;
  lastQuestionStartTime: Date | null;
  currentQuestionId: number | null;
  questionStartTimes: Record<number, Date>;
}

interface UserActionEvent {
  action: string;
  target: string;
  timestamp: Date;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class DominoTestService {
 
  private readonly STORAGE_KEY = 'domino_test_progress';
  private currentAttemptId: string | null = null;

  // Track current test session metrics
  private currentTestMetrics = new BehaviorSubject<UserTestMetrics | null>(
    null
  );
  currentTestMetrics$ = this.currentTestMetrics.asObservable();

  // Track user actions for analytics
  private userActions: UserActionEvent[] = [];

  constructor(
    private http: HttpClient,
    private testService: TestService,
    private authService: AuthService
  ) {
  
  }

  // Get available tests for candidates
  getAvailableTests(): Observable<any[]> {
    // Use TestService to get active tests of type "domino"
    return this.testService
      .getAllTests({
        isActive: true,
        type: 'domino',
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
          }));
        }),
        catchError((error) => {
          console.error('Error loading available tests:', error);
          return throwError(() => new Error('Failed to load available tests'));
        })
      );
  }

  // Get test with questions for the test-taking interface
  getTest(testId: string): Observable<any> {
    // Initialize metrics when starting a new test
    this.initializeTestMetrics(testId);

    console.log(`Loading test ${testId} from backend`);

    // Use TestService to get the test with questions
    return this.testService.getTestWithQuestions(testId).pipe(
      map((testData) => {
        console.log('Test data received from backend:', testData);

        // Store the attempt ID for future API calls
        if (testData.attemptId) {
          this.currentAttemptId = testData.attemptId;
          console.log(`Current attempt ID set to: ${this.currentAttemptId}`);
        }

        return testData;
      }),
      catchError((error) => {
        console.error('Error loading test:', error);
        return throwError(() => new Error('Failed to load test data'));
      })
    );
  }

  // Submit an answer for a question
  submitAnswer(
    questionId: number | string,
    answer: {
      topValue: number | null;
      bottomValue: number | null;
      dominoId: number;
    }
  ): Observable<any> {
    // Track metrics
    this.trackQuestionAnswer(
      typeof questionId === 'string' ? parseInt(questionId) : questionId,
      answer,
      false
    );

    if (!this.currentAttemptId) {
      console.error('No attempt ID available, cannot submit answer');
      return throwError(() => new Error('No active test attempt found'));
    }

    console.log(
      `Submitting answer for question ${questionId}, attempt ${this.currentAttemptId}`
    );

    // Use TestService to submit the answer
    return this.testService
      .submitAnswer(this.currentAttemptId, questionId.toString(), {
         answer,
      })
      .pipe(
        tap((response) => {
          console.log('Answer submission response:', response);
        }),
        catchError((error) => {
          console.error('Error submitting answer:', error);
          return throwError(() => new Error('Failed to submit answer'));
        })
      );
  }

  // Toggle flag on a question
  toggleQuestionFlag(
    questionId: number | string,
    isFlagged: boolean
  ): Observable<any> {
    // Track in metrics
    this.trackQuestionFlag(
      typeof questionId === 'string' ? parseInt(questionId) : questionId,
      isFlagged
    );

    if (!this.currentAttemptId) {
      console.error('No attempt ID available, cannot toggle flag');
      return throwError(() => new Error('No active test attempt found'));
    }

    // Use TestService to toggle the flag
    return this.testService
      .toggleQuestionFlag(this.currentAttemptId, questionId.toString())
      .pipe(
        catchError((error) => {
          console.error('Error toggling question flag:', error);
          return throwError(() => new Error('Failed to toggle flag'));
        })
      );
  }

  // Submit a completed test
  submitTest(testId: string): Observable<any> {
    // Finalize metrics
    const finalMetrics = this.finalizeTestMetrics();

    if (!this.currentAttemptId) {
      console.error('No attempt ID available, cannot submit test');
      return throwError(() => new Error('No active test attempt found'));
    }

    // Complete the attempt through the API
    return this.testService.completeAttempt(this.currentAttemptId).pipe(
      tap((response) => {
        console.log('Test completion response:', response);
        this.clearTestProgress(testId);
      }),
      catchError((error) => {
        console.error('Error submitting test:', error);
        return throwError(() => new Error('Failed to submit test'));
      })
    );
  }

  // Clear saved progress for a test
  clearTestProgress(testId: string): void {
    const storageKey = `${this.STORAGE_KEY}_${testId}`;
    localStorage.removeItem(storageKey);
    console.log(`Cleared saved progress for test ${testId}`);

    this.currentTestMetrics.next(null);
    this.currentAttemptId = null;
  }

  // Track when a user visits a question
  trackQuestionVisit(
    questionId: number | string,
    previousQuestionId: number | null = null
  ): void {
    // Convert string questionId to number if needed
    const qId =
      typeof questionId === 'string' ? parseInt(questionId) : questionId;

    const metrics = this.currentTestMetrics.value;
    if (!metrics) return;

    const now = new Date();

    // If we were tracking a different question, calculate time spent on it
    if (metrics.currentQuestionId !== null && metrics.lastQuestionStartTime) {
      const timeSpent = now.getTime() - metrics.lastQuestionStartTime.getTime();
      const currentId = metrics.currentQuestionId;

      // Update time per question
      metrics.timePerQuestion[currentId] =
        (metrics.timePerQuestion[currentId] || 0) + timeSpent;

      // Report this visit to the API
      if (this.currentAttemptId) {
        this.testService
          .visitQuestion(
            this.currentAttemptId,
            currentId.toString(),
            Math.round(timeSpent / 1000) // Convert to seconds
          )
          .subscribe({
            error: (err) =>
              console.error('Error reporting question visit:', err),
          });
      }

      // Log the time spent on previous question
      this.logUserAction('question_exit', currentId.toString(), {
        timeSpent,
        totalTimeOnQuestion: metrics.timePerQuestion[currentId],
      });
    }

    // Update visit count for this question
    metrics.visitCounts[qId] = (metrics.visitCounts[qId] || 0) + 1;

    // Set the current question and start time
    metrics.currentQuestionId = qId;
    metrics.lastQuestionStartTime = now;
    metrics.questionStartTimes[qId] = now;

    // Log the question visit
    this.logUserAction('question_visit', qId.toString(), {
      visitCount: metrics.visitCounts[qId],
      previousQuestion: previousQuestionId,
    });

    this.currentTestMetrics.next(metrics);
  }

  /**
   * Track when a user answers a question
   */
  trackQuestionAnswer(
    questionId: number,
    answer: {
      topValue: number | null;
      bottomValue: number | null;
      dominoId?: number;
    },
    isChanged: boolean = false
  ): void {
    const metrics = this.currentTestMetrics.value;
    if (!metrics) return;

    // If this is the first time answering, increment questions answered
    if (!isChanged) {
      metrics.questionsAnswered++;
    } else {
      metrics.answerChanges++;
    }

    // Calculate time spent if we have a start time
    if (metrics.questionStartTimes[questionId]) {
      const timeSpent =
        new Date().getTime() - metrics.questionStartTimes[questionId].getTime();

      // Log the answer action
      this.logUserAction('question_answer', questionId.toString(), {
        answer,
        isChanged,
        timeSpent,
      });
    }

    this.currentTestMetrics.next(metrics);
  }

  /**
   * Track when a user skips a question
   */
  trackQuestionSkip(questionId: number): void {
    const metrics = this.currentTestMetrics.value;
    if (!metrics) return;

    metrics.questionsSkipped++;

    // Log the skip action
    this.logUserAction('question_skip', questionId.toString());

    this.currentTestMetrics.next(metrics);
  }

  /**
   * Track when a user flags a question
   */
  trackQuestionFlag(questionId: number, isFlagged: boolean): void {
    const metrics = this.currentTestMetrics.value;
    if (!metrics) return;

    // Increment or decrement flagged questions count
    if (isFlagged) {
      metrics.flaggedQuestions++;
    } else {
      metrics.flaggedQuestions = Math.max(0, metrics.flaggedQuestions - 1);
    }

    // Log the flag action
    this.logUserAction('question_flag', questionId.toString(), { isFlagged });

    this.currentTestMetrics.next(metrics);
  }

  /**
   * Initialize metrics for a new test attempt
   */
  private initializeTestMetrics(testId: string): void {
    const metrics: UserTestMetrics = {
      testId,
      startTime: new Date(),
      totalTimeSpent: 0,
      questionsAnswered: 0,
      questionsSkipped: 0,
      answerChanges: 0,
      flaggedQuestions: 0,
      visitCounts: {},
      timePerQuestion: {},
      lastQuestionStartTime: null,
      currentQuestionId: null,
      questionStartTimes: {},
    };

    this.currentTestMetrics.next(metrics);
    this.userActions = [];

    // Log test start event
    this.logUserAction('test_start', testId);
  }

  /**
   * Log user actions for analytics
   */
  private logUserAction(action: string, target: string, data: any = {}): void {
    const event: UserActionEvent = {
      action,
      target,
      timestamp: new Date(),
      data,
    };

    this.userActions.push(event);
  }

  /**
   * Calculate final test metrics before submission
   */
  private finalizeTestMetrics(): UserTestMetrics | null {
    const metrics = this.currentTestMetrics.value;
    if (!metrics) return null;

    // Calculate total time spent on the test
    const now = new Date();
    metrics.totalTimeSpent = now.getTime() - metrics.startTime.getTime();

    // If we're still tracking a question, finalize its time
    if (metrics.currentQuestionId !== null && metrics.lastQuestionStartTime) {
      const timeSpent = now.getTime() - metrics.lastQuestionStartTime.getTime();
      const currentId = metrics.currentQuestionId;

      metrics.timePerQuestion[currentId] =
        (metrics.timePerQuestion[currentId] || 0) + timeSpent;
    }

    // Log test completion
    this.logUserAction('test_complete', metrics.testId, {
      totalTimeSpent: metrics.totalTimeSpent,
      questionsAnswered: metrics.questionsAnswered,
    });

    return metrics;
  }

  // Save test progress to localStorage
  saveProgress(testId: string, progress: any): void {
    // Enhance progress data with metrics
    if (this.currentTestMetrics.value) {
      progress.metrics = this.currentTestMetrics.value;
      progress.userActions = this.userActions;
      progress.attemptId = this.currentAttemptId;
    }

    // Save to localStorage
    const storageKey = `${this.STORAGE_KEY}_${testId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
      console.log(`Progress saved for test ${testId}`);
    } catch (e) {
      console.error('Error saving progress:', e);
    }
  }

  // Load test progress from localStorage
  loadProgress(testId: string): any {
    const storageKey = `${this.STORAGE_KEY}_${testId}`;

    try {
      const progressData = localStorage.getItem(storageKey);
      if (!progressData) return null;

      const progress = JSON.parse(progressData);

      // Restore attempt ID if available
      if (progress.attemptId) {
        this.currentAttemptId = progress.attemptId;
        console.log(`Restored attempt ID: ${this.currentAttemptId}`);
      }

      // Restore metrics if available
      if (progress.metrics) {
        // Convert string dates back to Date objects
        if (progress.metrics.startTime) {
          progress.metrics.startTime = new Date(progress.metrics.startTime);
        }
        if (progress.metrics.lastQuestionStartTime) {
          progress.metrics.lastQuestionStartTime = new Date(
            progress.metrics.lastQuestionStartTime
          );
        }

        // Restore question start times
        if (progress.metrics.questionStartTimes) {
          Object.keys(progress.metrics.questionStartTimes).forEach((key) => {
            progress.metrics.questionStartTimes[key] = new Date(
              progress.metrics.questionStartTimes[key]
            );
          });
        }

        this.currentTestMetrics.next(progress.metrics);
      }

      // Restore user actions if available
      if (progress.userActions) {
        // Convert string dates back to Date objects
        this.userActions = progress.userActions.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp),
        }));
      }

      return progress;
    } catch (e) {
      console.error('Error parsing saved test progress:', e);
      return null;
    }
  }

  /**
   * Evaluate an answer against the correct answer
   * Handles rotation and orientation issues with dominos
   */
  evaluateAnswer(
    userAnswer: { topValue: number | null; bottomValue: number | null },
    correctAnswer: { topValue: number | null; bottomValue: number | null }
  ): {
    isCorrect: boolean;
    isReversed: boolean;
    isHalfCorrect: boolean;
  } {
    // Guard against null values
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

    // Check for exact match
    const exactMatch =
      userAnswer.topValue === correctAnswer.topValue &&
      userAnswer.bottomValue === correctAnswer.bottomValue;

    // Check for reversed match
    const reversedMatch =
      userAnswer.topValue === correctAnswer.bottomValue &&
      userAnswer.bottomValue === correctAnswer.topValue;

    // Check for half match (only one value correct)
    const halfMatch =
      userAnswer.topValue === correctAnswer.topValue ||
      userAnswer.bottomValue === correctAnswer.bottomValue ||
      userAnswer.topValue === correctAnswer.bottomValue ||
      userAnswer.bottomValue === correctAnswer.topValue;

    return {
      isCorrect: exactMatch,
      isReversed: reversedMatch,
      isHalfCorrect: !exactMatch && !reversedMatch && halfMatch,
    };
  }
}
