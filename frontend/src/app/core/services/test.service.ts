import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Test, TestResponse, TestsResponse } from '../models/test.model';
import { QuestionsResponse, QuestionResponse } from '../models/question.model';
import {
  AttemptResponse,
  AttemptsResponse,
  AttemptQuestionsResponse,
  AttemptResultsResponse,
} from '../models/attempt.model';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class TestService {
  // Base API URLs for different endpoints
  private testApiUrl = `${environment.apiUrl}/tests`;
  private questionApiUrl = `${environment.apiUrl}/questions`;
  private attemptApiUrl = `${environment.apiUrl}/attempts`;
  private analyticsApiUrl = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient, private authService: AuthService) {
    console.log('TestService initialized with URLs:', {
      testApiUrl: this.testApiUrl,
      questionApiUrl: this.questionApiUrl,
      attemptApiUrl: this.attemptApiUrl,
    });
  }

  // ===== TEST OPERATIONS =====

  /**
   * Get all tests with optional filtering
   */
  getAllTests(params: any = {}): Observable<TestsResponse> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    return this.http
      .get<TestsResponse>(this.testApiUrl, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get a specific test by ID
   */
  getTestById(testId: string): Observable<TestResponse> {
    return this.http
      .get<TestResponse>(`${this.testApiUrl}/${testId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Create a new test
   */
  createTest(testData: Partial<Test>): Observable<TestResponse> {
    return this.http
      .post<TestResponse>(this.testApiUrl, testData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Update an existing test
   */
  updateTest(testId: string, updates: Partial<Test>): Observable<TestResponse> {
    return this.http
      .put<TestResponse>(`${this.testApiUrl}/${testId}`, updates)
      .pipe(catchError(this.handleError));
  }

  /**
   * Delete a test
   */
  deleteTest(testId: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${this.testApiUrl}/${testId}`)
      .pipe(catchError(this.handleError));
  }

  // ===== QUESTION OPERATIONS =====

  /**
   * Get all questions for a test
   */
  getQuestionsByTestId(
    testId: string,
    params: any = {}
  ): Observable<QuestionsResponse> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    // Using question controller paths
    return this.http
      .get<QuestionsResponse>(
        `${this.questionApiUrl}/tests/${testId}/questions`,
        {
          params: httpParams,
        }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Get a specific question by ID
   */
  getQuestionById(questionId: string): Observable<QuestionResponse> {
    return this.http
      .get<QuestionResponse>(`${this.questionApiUrl}/${questionId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Create a new question for a test
   */
  createQuestion(
    testId: string,
    questionData: any
  ): Observable<QuestionResponse> {
    return this.http
      .post<QuestionResponse>(
        `${this.questionApiUrl}/tests/${testId}/questions`,
        questionData
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Update an existing question
   */
  updateQuestion(
    questionId: string,
    updates: any
  ): Observable<QuestionResponse> {
    return this.http
      .put<QuestionResponse>(`${this.questionApiUrl}/${questionId}`, updates)
      .pipe(catchError(this.handleError));
  }

  /**
   * Delete a question
   */
  deleteQuestion(questionId: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${this.questionApiUrl}/${questionId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Move a question's position
   */
  moveQuestionPosition(
    questionId: string,
    newPosition: number
  ): Observable<QuestionResponse> {
    return this.http
      .patch<QuestionResponse>(
        `${this.questionApiUrl}/${questionId}/position`,
        { newPosition }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Duplicate a question
   */
  duplicateQuestion(questionId: string): Observable<QuestionResponse> {
    return this.http
      .post<QuestionResponse>(
        `${this.questionApiUrl}/${questionId}/duplicate`,
        {}
      )
      .pipe(catchError(this.handleError));
  }

  // ===== TEST ATTEMPT OPERATIONS =====

  /**
   * Start a test attempt
   */
  startTestAttempt(
    testId: string,
    candidateId: string
  ): Observable<AttemptResponse> {
    return this.http
      .post<AttemptResponse>(`${this.attemptApiUrl}/tests/${testId}/start`, {
        candidateId,
      })
      .pipe(
        tap((response) => {
          this.logApiInteraction(
            'startTestAttempt',
            { testId, candidateId },
            response
          );
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get a specific test attempt
   */
  getAttemptById(attemptId: string): Observable<AttemptResponse> {
    return this.http
      .get<AttemptResponse>(`${this.attemptApiUrl}/${attemptId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get questions for an attempt
   */
  getAttemptQuestions(attemptId: string): Observable<AttemptQuestionsResponse> {
    return this.http
      .get<AttemptQuestionsResponse>(
        `${this.attemptApiUrl}/${attemptId}/questions`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Submit an answer for a question
   */
  submitAnswer(
    attemptId: string,
    questionId: string,
    answer: any
  ): Observable<any> {
    const candidateId = this.authService.getCurrentUserId();

    // Format the answer payload according to the backend expectations
    const payload = {
      candidateId,
      answer: answer, // This is now explicitly sent as 'answer' property
    };

    this.logApiInteraction('submitAnswer-payload', payload);

    return this.http
      .post(
        `${this.attemptApiUrl}/${attemptId}/questions/${questionId}/answer`,
        payload
      )
      .pipe(
        tap((response) => {
          this.logApiInteraction(
            'submitAnswer-response',
            { questionId, answer },
            response
          );
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Toggle flag on a question
   */
  toggleQuestionFlag(attemptId: string, questionId: string): Observable<any> {
    const candidateId = this.authService.getCurrentUserId();

    return this.http
      .post(`${this.attemptApiUrl}/${attemptId}/questions/${questionId}/flag`, {
        candidateId,
      })
      .pipe(
        tap((response) => {
          this.logApiInteraction(
            'toggleQuestionFlag',
            { attemptId, questionId, candidateId },
            response
          );
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Mark a question as visited
   */
  visitQuestion(
    attemptId: string,
    questionId: string,
    timeSpent?: number
  ): Observable<any> {
    const candidateId = this.authService.getCurrentUserId();

    const payload = {
      candidateId,
      timeSpent: timeSpent || 0,
    };

    this.logApiInteraction('visitQuestion-payload', payload);

    return this.http
      .post(
        `${this.attemptApiUrl}/${attemptId}/questions/${questionId}/visit`,
        payload
      )
      .pipe(
        tap((response) => {
          this.logApiInteraction(
            'visitQuestion-response',
            { timeSpent },
            response
          );
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Skip a question
   */
  skipQuestion(attemptId: string, questionId: string): Observable<any> {
    const candidateId = this.authService.getCurrentUserId();

    return this.http
      .post(`${this.attemptApiUrl}/${attemptId}/questions/${questionId}/skip`, {
        candidateId,
      })
      .pipe(
        tap((response) => {
          this.logApiInteraction(
            'skipQuestion',
            { attemptId, questionId },
            response
          );
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Complete a test attempt
   */
  completeAttempt(attemptId: string): Observable<AttemptResponse> {
    const candidateId = this.authService.getCurrentUserId();

    return this.http
      .post<AttemptResponse>(`${this.attemptApiUrl}/${attemptId}/complete`, {
        candidateId,
      })
      .pipe(
        tap((response) => {
          this.logApiInteraction('completeAttempt', { attemptId }, response);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get all attempts for a candidate
   */
  getCandidateAttempts(
    candidateId: string,
    status?: string
  ): Observable<AttemptsResponse> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }

    return this.http
      .get<AttemptsResponse>(
        `${this.attemptApiUrl}/candidates/${candidateId}`,
        { params }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Get all attempts for a test
   */
  getTestAttempts(
    testId: string,
    params: any = {}
  ): Observable<AttemptsResponse> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    return this.http
      .get<AttemptsResponse>(`${this.attemptApiUrl}/tests/${testId}`, {
        params: httpParams,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get results for a completed attempt
   */
  getAttemptResults(attemptId: string): Observable<AttemptResultsResponse> {
    return this.http
      .get<AttemptResultsResponse>(`${this.attemptApiUrl}/${attemptId}/results`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get a test with its questions for the candidate test-taking interface
   * This combines several API calls to prepare everything needed for the test UI
   */
  getTestWithQuestions(testId: string): Observable<any> {
    console.log(`Getting test with questions for testId: ${testId}`);

    // First get the test details
    return this.getTestById(testId).pipe(
      tap((testResponse) => {
        console.log('Test response:', testResponse);
      }),
      switchMap((testResponse) => {
        if (!testResponse.success || !testResponse.data) {
          console.error('Test not found or invalid response:', testResponse);
          return throwError(() => new Error('Test not found'));
        }

        const test = testResponse.data;
        const candidateId = this.authService.getCurrentUserId();
        console.log('Starting test attempt for candidate:', candidateId);

        // Start a test attempt
        return this.startTestAttempt(testId, candidateId).pipe(
          tap((attemptResponse) => {
            console.log('Attempt response:', attemptResponse);
          }),
          switchMap((attemptResponse) => {
            if (!attemptResponse.success || !attemptResponse.data) {
              console.error('Failed to create test attempt:', attemptResponse);
              return throwError(
                () => new Error('Failed to create test attempt')
              );
            }

            const attemptId = attemptResponse.data._id;
            console.log('Created attempt ID:', attemptId);

            // Get questions for this attempt
            return this.getAttemptQuestions(attemptId).pipe(
              tap((questionsResponse) => {
                console.log('Questions response:', questionsResponse);
              }),
              map((questionsResponse) => {
                if (!questionsResponse.success || !questionsResponse.data) {
                  console.error(
                    'Failed to get attempt questions:',
                    questionsResponse
                  );
                  return throwError(
                    () => new Error('Failed to load questions')
                  );
                }

                // Format the response for the test-taking interface
                const formattedResponse = {
                  id: test._id,
                  name: test.name,
                  description: test.description,
                  duration: test.duration,
                  totalQuestions: test.totalQuestions || 0,
                  attemptId: attemptId,
                  questions: this.mapQuestionsForTestInterface(
                    questionsResponse.data.questions
                  ),
                };

                console.log(
                  'Formatted test data for frontend:',
                  formattedResponse
                );
                return formattedResponse;
              })
            );
          })
        );
      }),
      catchError((error) => {
        console.error('Error in getTestWithQuestions:', error);
        return throwError(
          () => new Error(`Failed to load test: ${error.message}`)
        );
      })
    );
  }

  // Map backend questions to the frontend test interface format
  private mapQuestionsForTestInterface(questions: any[]): any[] {
    return questions.map((q) => {
      // Handle both question with response or just question
      const question = q.question || q;
      const response = q.response || null;

      return {
        id: question._id,
        title: question.title || '',
        instruction: question.instruction,
        dominos: question.dominos || [],
        arrows: question.arrows || [],
        gridLayout: question.gridLayout || { rows: 3, cols: 3 },
        correctAnswer: question.correctAnswer, // This might be null for candidate interface
        answered: response?.dominoAnswer ? true : false,
        flaggedForReview: response?.isFlagged || false,
        visited: response?.visitCount > 0,
        pattern: question.pattern || '',
        layoutType: question.layoutType || 'grid',
        userAnswer: response?.dominoAnswer,
      };
    });
  }

  // Debug method to log API interactions
  private logApiInteraction(action: string, data: any, response?: any): void {
    console.group(`API: ${action}`);
    console.log('Sent data:', data);
    if (response) {
      console.log('Received response:', response);
    }
    console.groupEnd();
  }

  // Error handling
  private handleError(error: any) {
    console.error('API Error:', error);
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error && error.error.message) {
      // Server-side error with message
      errorMessage = error.error.message;
    } else if (error.status) {
      // HTTP status error
      errorMessage = `HTTP Error ${error.status}: ${error.statusText}`;
    }

    return throwError(() => new Error(errorMessage));
  }
}
