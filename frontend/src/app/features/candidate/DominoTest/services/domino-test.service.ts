import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, forkJoin } from 'rxjs';
import { catchError, tap, map, finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { MockDataService } from './mock-data.service';
import {
  DominoPosition,
  TestQuestion,
  TestData,
  TestResult,
  QuestionAnalytics,
  TestAnalytics,
  UserActionEvent,
  UserTestMetrics,
} from '../models/domino.model';
import { TestManagementService } from '../../../../core/services/test-management.service';

/**
 * Service responsible for handling all domino test related operations
 * including test retrieval, progress tracking, submission, and analytics
 */
@Injectable({
  providedIn: 'root',
})
export class DominoTestService {
  private apiUrl = `${environment.apiUrl || 'api'}/tests`;
  private readonly STORAGE_KEY = 'domino_test_progress';
  private useMockData = true; // Set to true to use mock data instead of API calls

  // Track current test session metrics
  private currentTestMetrics = new BehaviorSubject<UserTestMetrics | null>(
    null
  );
  currentTestMetrics$ = this.currentTestMetrics.asObservable();

  // Track user actions for analytics
  private userActions: UserActionEvent[] = [];

  constructor(
    private http: HttpClient,
    private mockDataService: MockDataService,
    private testManagementService: TestManagementService // Add this
  ) {}

  // Get test data
  getTest(testId: string): Observable<any> {
    // Initialize test metrics when starting a new test
    this.initializeTestMetrics(testId);

    if (
      this.useMockData &&
      (testId === 'd70' || testId === 'd70-enhanced' || testId === 'd200')
    ) {
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
                    (domino: DominoPosition, dIndex: number) => {
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

    // When connecting to real backend:
    return this.testManagementService.getTestForDominoTest(testId).pipe(
      map((test: any) => {
        if (test && test.questions) {
          // Apply the same transformations
          test.questions = test.questions.map((question: any) => {
            if (question.dominos) {
              question.dominos = question.dominos.map((domino: any) => {
                // Create unique IDs for each domino
                const newDomino = { ...domino };
                newDomino.uniqueId = `q${question.id}_d${domino.id}`;
                newDomino.questionId = question.id;

                // Reset editable dominos
                if (newDomino.isEditable) {
                  newDomino.topValue = null;
                  newDomino.bottomValue = null;
                }
                return newDomino;
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

  /**
   * Initialize test metrics when a user starts a test
   * @param testId The ID of the test being taken
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
   * Track when a user visits a question
   * @param questionId The ID of the question being visited
   * @param previousQuestionId The ID of the previous question (if any)
   */
  trackQuestionVisit(
    questionId: number,
    previousQuestionId: number | null = null
  ): void {
    const metrics = this.currentTestMetrics.value;
    if (!metrics) return;

    const now = new Date();

    // If we were tracking a different question, calculate time spent on it
    if (metrics.currentQuestionId !== null && metrics.lastQuestionStartTime) {
      const timeSpent = now.getTime() - metrics.lastQuestionStartTime.getTime();
      const currentId = metrics.currentQuestionId;

      metrics.timePerQuestion[currentId] =
        (metrics.timePerQuestion[currentId] || 0) + timeSpent;

      // Log the time spent on previous question
      this.logUserAction('question_exit', currentId.toString(), {
        timeSpent,
        totalTimeOnQuestion: metrics.timePerQuestion[currentId],
      });
    }

    // Update visit count for this question
    metrics.visitCounts[questionId] =
      (metrics.visitCounts[questionId] || 0) + 1;

    // Set the current question and start time
    metrics.currentQuestionId = questionId;
    metrics.lastQuestionStartTime = now;
    metrics.questionStartTimes[questionId] = now;

    // Log the question visit
    this.logUserAction('question_visit', questionId.toString(), {
      visitCount: metrics.visitCounts[questionId],
      previousQuestion: previousQuestionId,
    });

    this.currentTestMetrics.next(metrics);
  }

  /**
   * Track when a user answers a question
   * @param questionId The ID of the question being answered
   * @param answer The user's answer
   * @param isChanged Whether this is changing a previous answer
   */
  trackQuestionAnswer(
    questionId: number,
    answer: { topValue: number | null; bottomValue: number | null },
    isChanged: boolean = false
  ): void {
    const metrics = this.currentTestMetrics.value;
    if (!metrics) return;

    // If this is the first time answering, increment questions answered
    if (!isChanged) {
      metrics.questionsAnswered++;
    } else {
      // If changing an answer, increment the change counter
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
   * @param questionId The ID of the question being skipped
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
   * @param questionId The ID of the question being flagged
   * @param isFlagged Whether the question is being flagged or unflagged
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
   * Log user actions for analytics
   * @param action The type of action
   * @param target The target of the action (question ID, test ID, etc.)
   * @param data Additional data about the action
   */
  private logUserAction(action: string, target: string, data: any = {}): void {
    const event: UserActionEvent = {
      action,
      target,
      timestamp: new Date(),
      data,
    };

    this.userActions.push(event);

    // In a production environment, you might want to periodically
    // send these events to the server for real-time analytics
  }

  /**
   * Calculate final test metrics before submission
   * @returns The complete user test metrics
   */
  private finalizeTestMetrics(): UserTestMetrics {
    const metrics = this.currentTestMetrics.value;
    if (!metrics) {
      throw new Error('No active test metrics found');
    }

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

  // Save test progress to localStorage and optionally to server
  saveProgress(testId: string, progress: any): void {
    // Enhance progress data with metrics
    if (this.currentTestMetrics.value) {
      progress.metrics = this.currentTestMetrics.value;
      progress.userActions = this.userActions;
    }

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
        const progress = JSON.parse(progressData);

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

    return null;
  }

  /**
   * Evaluate an answer against the correct answer
   * Handles rotation and orientation issues with dominos
   * @param userAnswer The user's answer
   * @param correctAnswer The correct answer
   * @returns Evaluation of the answer
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

  // Submit completed test
  submitTest(testId: string, answers: any[]): Observable<any> {
    // Finalize metrics
    const finalMetrics = this.finalizeTestMetrics();

    // Prepare complete submission with all analytics data
    const submission = {
      testId,
      answers,
      submittedAt: new Date().toISOString(),
      metrics: finalMetrics,
      userActions: this.userActions,
      // Evaluate each answer against correct answers
      // (this would be done server-side in a real backend)
      evaluatedAnswers: answers.map((answer) => {
        // For mock purposes - in real implementation this would be done server-side
        const correctAnswer = this.getCorrectAnswerForQuestion(
          testId,
          answer.id
        );
        if (correctAnswer && answer.userAnswer) {
          const evaluation = this.evaluateAnswer(
            answer.userAnswer,
            correctAnswer
          );
          return {
            questionId: answer.id,
            userAnswer: answer.userAnswer,
            isCorrect: evaluation.isCorrect,
            isReversed: evaluation.isReversed,
            isHalfCorrect: evaluation.isHalfCorrect,
            timeSpent: finalMetrics.timePerQuestion[answer.id] || 0,
            visitCount: finalMetrics.visitCounts[answer.id] || 0,
          };
        }
        return {
          questionId: answer.id,
          userAnswer: answer.userAnswer,
          isCorrect: false,
          isReversed: false,
          isHalfCorrect: false,
          timeSpent: 0,
          visitCount: 0,
        };
      }),
    };

    if (this.useMockData) {
      return this.mockDataService.submitTest(testId, answers).pipe(
        tap(() => {
          // Clear saved progress after successful submission
          const storageKey = `${this.STORAGE_KEY}_${testId}`;
          localStorage.removeItem(storageKey);

          // Reset metrics
          this.currentTestMetrics.next(null);
          this.userActions = [];
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

          // Reset metrics
          this.currentTestMetrics.next(null);
          this.userActions = [];
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

  /**
   * Get correct answer for a question - for mock testing only
   * In real implementation, this would be handled server-side
   */
  private getCorrectAnswerForQuestion(
    testId: string,
    questionId: number
  ): { topValue: number; bottomValue: number } | null {
    // This is a mock implementation - in a real app this would be done server-side
    // Getting the correct answer here is just for demonstration/testing
    try {
      const testData = this.mockDataService.getD70TestData();
      const question = testData.questions.find((q) => q.id === questionId);
      if (question && question.correctAnswer) {
        return {
          topValue: question.correctAnswer.topValue,
          bottomValue: question.correctAnswer.bottomValue,
        };
      }
    } catch (err) {
      console.error('Error getting correct answer:', err);
    }
    return null;
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
      // Get mock tests
      const mockTests$ = this.mockDataService.getAvailableTests();

      // Get custom tests
      const customTests$ = this.testManagementService.getAllTests().pipe(
        map((tests) =>
          tests
            .filter((t) => t.isActive)
            .map((test) => ({
              id: test.id,
              name: test.name,
              description: test.description,
              duration: test.duration,
              totalQuestions: test.totalQuestions,
              type: 'domino',
              difficulty: test.difficulty,
            }))
        )
      );

      // Combine both arrays
      return forkJoin([mockTests$, customTests$]).pipe(
        map(([mockTests, customTests]) => [...mockTests, ...customTests])
      );
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

    // Reset metrics
    this.currentTestMetrics.next(null);
    this.userActions = [];
  }

  // Clear progress for a specific test
  clearTestProgress(testId: string): void {
    const storageKey = `${this.STORAGE_KEY}_${testId}`;
    localStorage.removeItem(storageKey);
    console.log(`Cleared saved progress for test: ${testId}`);

    // Reset metrics for this test
    if (this.currentTestMetrics.value?.testId === testId) {
      this.currentTestMetrics.next(null);
      this.userActions = [];
    }
  }

  /**
   * Handle test timeout - called when test time expires
   * @param testId The ID of the test
   * @param answers Array of user answers at the point of timeout
   * @returns Observable of the submission result
   */
  handleTestTimeout(testId: string, answers: any[]): Observable<any> {
    // Log the timeout event
    this.logUserAction('test_timeout', testId);

    // Submit the test with whatever answers we have
    return this.submitTest(testId, answers);
  }

  /**
   * Calculate the score for a test
   * @param evaluatedAnswers Array of evaluated answers
   * @returns Number of correct answers (score)
   */
  calculateTestScore(evaluatedAnswers: any[]): number {
    return evaluatedAnswers.filter((answer) => answer.isCorrect).length;
  }
}
