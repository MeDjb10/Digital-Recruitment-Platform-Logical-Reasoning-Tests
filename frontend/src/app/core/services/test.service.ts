import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Test, TestResponse, TestsResponse } from '../models/test.model';
import { QuestionsResponse, QuestionResponse } from '../models/question.model';
import {
  AttemptResponse,
  AttemptsResponse,
  AttemptQuestionsResponse,
  AttemptResultsResponse,
  TestAttempt,
} from '../models/attempt.model';
import { AuthService } from '../auth/services/auth.service';
import {
  TestQuestion,
  PropositionResponse,
} from '../../features/candidate/DominoTest/models/domino.model'; // Import frontend model

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
    // Strip _id from the updates if present to avoid conflicts
    const updatePayload = { ...updates };
    if (updatePayload._id) delete updatePayload._id;
    if (updatePayload.id) delete updatePayload.id;

    console.log(`Updating question ${questionId} with payload:`, updatePayload);

    return this.http
      .put<QuestionResponse>(
        `${this.questionApiUrl}/${questionId}`,
        updatePayload
      )
      .pipe(
        tap((response) => {
          console.log('Update question response:', response);
        }),
        catchError(this.handleError)
      );
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
   * Update time spent on a question
   */
  updateTimeSpent(
    attemptId: string,
    questionId: string,
    timeSpent: number
  ): Observable<any> {
    const candidateId = this.authService.getCurrentUserId();

    const payload = {
      candidateId,
      timeSpent: timeSpent,
    };

    this.logApiInteraction('updateTimeSpent-payload', payload);

    return this.http
      .post(
        `${this.attemptApiUrl}/${attemptId}/questions/${questionId}/time`,
        payload
      )
      .pipe(
        tap((response) => {
          this.logApiInteraction(
            'updateTimeSpent-response',
            { timeSpent },
            response
          );
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Mark a question as visited
   */
  visitQuestion(attemptId: string, questionId: string): Observable<any> {
    const candidateId = this.authService.getCurrentUserId();

    const payload = {
      candidateId,
    };

    this.logApiInteraction('visitQuestion-payload', payload);

    return this.http
      .post(
        `${this.attemptApiUrl}/${attemptId}/questions/${questionId}/visit`,
        payload
      )
      .pipe(
        tap((response) => {
          this.logApiInteraction('visitQuestion-response', {}, response);
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
   * Get test with its questions for the candidate test-taking interface
   * This combines several API calls to prepare everything needed for the test UI
   */
  getTestWithQuestions(testId: string): Observable<any> {
    console.log(
      `[TestService] Getting test with questions for testId: ${testId}`
    );

    // First get the test details
    return this.getTestById(testId).pipe(
      tap((testResponse) => {
        console.log('[TestService] Test response:', testResponse);
      }),
      switchMap((testResponse) => {
        if (!testResponse.success || !testResponse.data) {
          console.error(
            '[TestService] Test not found or invalid response:',
            testResponse
          );
          return throwError(() => new Error('Test not found'));
        }

        const test = testResponse.data;
        const candidateId = this.authService.getCurrentUserId();
        if (!candidateId) {
          return throwError(() => new Error('Candidate ID not found'));
        }
        console.log(
          '[TestService] Starting test attempt for candidate:',
          candidateId
        );

        // Start a test attempt
        return this.startTestAttempt(testId, candidateId).pipe(
          tap((attemptResponse) => {
            console.log('[TestService] Attempt response:', attemptResponse);
          }),
          switchMap((attemptResponse) => {
            if (!attemptResponse.success || !attemptResponse.data) {
              console.error(
                '[TestService] Failed to create test attempt:',
                attemptResponse
              );
              return throwError(
                () => new Error('Failed to create test attempt')
              );
            }

            const attemptId = attemptResponse.data._id;
            console.log('[TestService] Created attempt ID:', attemptId);

            // Get questions for this attempt
            return this.getAttemptQuestions(attemptId).pipe(
              tap((questionsResponse) => {
                console.log(
                  '[TestService] Raw Questions response from attempt:',
                  questionsResponse
                ); // DEBUG: Log raw questions
              }),
              map((questionsResponse) => {
                if (!questionsResponse.success || !questionsResponse.data) {
                  console.error(
                    '[TestService] Failed to get attempt questions:',
                    questionsResponse
                  );
                  throw new Error('Failed to load questions for the attempt');
                }

                // Map the backend questions/responses to the frontend TestQuestion format
                const mappedQuestions = this.mapQuestionsForTestInterface(
                  questionsResponse.data.questions // Pass the array of questions with responses
                );

                // Combine test details, attempt ID, and mapped questions
                const formattedData = {
                  id: test._id,
                  name: test.name,
                  description: test.description,
                  duration: test.duration,
                  totalQuestions: test.totalQuestions,
                  attemptId: attemptId,
                  questions: mappedQuestions, // Use the correctly mapped questions
                };
                console.log(
                  '[TestService] Formatted test data for frontend:',
                  formattedData
                ); // DEBUG: Log final formatted data
                return formattedData;
              })
            );
          })
        );
      }),
      catchError((error) => {
        console.error('[TestService] Error in getTestWithQuestions:', error);
        return throwError(
          () => new Error(`Failed to load test: ${error.message || error}`)
        );
      })
    );
  }

  // Map backend questions (with responses) to the frontend TestQuestion interface format
  private mapQuestionsForTestInterface(
    backendQuestionsWithResponses: any[]
  ): TestQuestion[] {
    console.log(
      '[TestService] Mapping backend questions:',
      backendQuestionsWithResponses
    ); // DEBUG
    return backendQuestionsWithResponses.map((qwr, index) => {
      // qwr contains the question object and the response object
      const question = qwr; // The backend question data is directly on the object now
      const response = qwr.response; // The response data is nested

      // Determine user answer based on question type
      let userAnswer: any = undefined;
      if (
        question.questionType === 'DominoQuestion' &&
        response?.dominoAnswer
      ) {
        userAnswer = response.dominoAnswer;
      } else if (
        question.questionType === 'MultipleChoiceQuestion' &&
        response?.propositionResponses
      ) {
        userAnswer = response.propositionResponses;
      }

      // Determine if answered based on response data and type
      let answered = false;
      if (question.questionType === 'DominoQuestion') {
        answered = !!response?.dominoAnswer;
      } else if (question.questionType === 'MultipleChoiceQuestion') {
        // Considered answered if there are responses and not all are 'X' (or adjust logic as needed)
        answered =
          !!response?.propositionResponses &&
          response.propositionResponses.length > 0 &&
          response.propositionResponses.some(
            (pr: PropositionResponse) => pr.candidateEvaluation !== 'X'
          );
      } else {
        answered = !!response?.answeredAt; // Fallback for other types or if specific answer fields are missing
      }

      const mappedQuestion: TestQuestion = {
        id: question._id,
        questionType: question.questionType, // ** Use the type from backend **
        title: question.title || '',
        instruction: question.instruction || 'No instruction provided.',
        // Domino specific fields
        dominos: question.dominos || [],
        arrows: question.arrows || [],
        gridLayout: question.gridLayout || { rows: 3, cols: 3 },
        pattern: question.pattern || '',
        layoutType: question.layoutType || 'grid',
        // MCQ specific fields
        propositions: question.propositions || [], // ** Map propositions **
        // Common fields from response
        answered: answered,
        flaggedForReview: response?.isFlagged || false,
        visited: (response?.visitCount || 0) > 0,
        userAnswer: userAnswer, // Assign the determined user answer
        // Fields from question (correctAnswer might be omitted for candidates)
        correctAnswer: question.correctAnswer, // Keep if needed, but backend might omit it
        questionNumber: question.questionNumber || index + 1, // Use backend number or index
      };
      // console.log(`[TestService] Mapped question ${index + 1}:`, mappedQuestion); // DEBUG individual mapping
      return mappedQuestion;
    });
  }

  /**
   * Determine test type from test data
   */
  getTestType(test: any): 'domino' | 'mcq' | 'unknown' {
    const testName = test?.name?.toLowerCase() || '';
    if (testName.includes('d-70') || testName.includes('d-2000')) {
      return 'domino';
    } else if (testName.includes('logique_des_propositions')) {
      return 'mcq';
    }
    return 'unknown';
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

  /**
   * Get recent test attempts across all tests for dashboard
   */
  getRecentAttempts(limit: number = 15): Observable<TestAttempt[]> {
    // First get all tests
    return this.getAllTests().pipe(
      switchMap((testsResponse) => {
        if (!testsResponse.success || !testsResponse.data) {
          return of([]);
        }

        // Get attempts for each test and combine them
        const attemptRequests = testsResponse.data.map((test) =>
          this.getTestAttempts(test._id, {
            limit: 5,
            sortBy: 'startTime',
            sortOrder: 'desc',
          }).pipe(
            catchError(() => of({ success: false, data: [] })),
            map((response) => (response.success ? response.data : []))
          )
        );

        return forkJoin(attemptRequests).pipe(
          map((allAttempts: TestAttempt[][]) => {
            // Flatten and sort all attempts by startTime
            const flattenedAttempts = allAttempts.flat();
            return flattenedAttempts
              .sort(
                (a, b) =>
                  new Date(b.startTime).getTime() -
                  new Date(a.startTime).getTime()
              )
              .slice(0, limit);
          })
        );
      }),
      catchError((error) => {
        console.error('Error fetching recent attempts:', error);
        return of([]);
      })
    );
  }

  /**
   * Update AI classification for an attempt
   */
  updateAiClassification(attemptId: string, classification: { prediction: string; confidence: number; timestamp?: string }): Observable<AttemptResponse> {
    console.log('Updating AI classification:', { attemptId, classification });
    
    return this.http
      .post<AttemptResponse>(`${this.attemptApiUrl}/${attemptId}/ai-classification`, classification)
      .pipe(
        tap(response => {
          console.log('AI classification update response:', response);
        }),
        catchError(error => {
          console.error('Error updating AI classification:', error);
          // Create a more user-friendly error response
          const errorMessage = error.error?.error || 'Failed to update AI classification';
          return throwError(() => ({
            success: false,
            message: errorMessage,
            error: error
          }));
        })
      );
  }

  /**
   * Update manual classification for an attempt
   */
  updateManualClassification(attemptId: string, classification: string): Observable<AttemptResponse> {
    console.log('Updating manual classification:', { attemptId, classification });
    
    return this.http
      .post<AttemptResponse>(`${this.attemptApiUrl}/${attemptId}/manual-classification`, { classification })
      .pipe(
        tap(response => {
          console.log('Manual classification update response:', response);
        }),
        catchError(error => {
          console.error('Error updating manual classification:', error);
          const errorMessage = error.error?.error || 'Failed to update manual classification';
          return throwError(() => ({
            success: false,
            message: errorMessage,
            error: error
          }));
        })
      );
  }
}
