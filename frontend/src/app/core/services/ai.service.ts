import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, timeout, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface MetricsRequest {
  attemptId: string; // Add this field
  test_type: string;
  questionsAnswered: number;
  correct_answers: number;
  timeSpent: number;
  halfCorrect: number;
  reversed: number;
  questionsSkipped: number;
  answerChanges: number;
  flaggedQuestions: number;
  desired_position: string;
  education_level: string;
}

interface ClassificationResponse {
  prediction: string;
  confidence: number;
}

interface AnalysisResponse {
  metrics: {
    attemptId: string;
    test_type: string;
    questionsAnswered: number;
    correct_answers: number;
    timeSpent: number;
    halfCorrect: number;
    reversed: number;
    questionsSkipped: number;
    answerChanges: number;
    flaggedQuestions: number;
    desired_position: string;
    education_level: string;
    timestamp: string;
  };
  prediction: {
    test_type: string;
    predicted_category: string;
    confidence: number;
    raw_features: any;
  };
  ai_analysis: string;
}

interface PsychologistCommentRequest {
  metrics: MetricsRequest;
  comment: string;
}

interface PsychologistCommentResponse {
  message: string;
}

interface FeedbackRequest {
  metrics: MetricsRequest;
  ai_comment: string;
  is_good: boolean;
  feedback_text?: string;
}

interface FeedbackResponse {
  improved_analysis: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  // Update API URL to use gateway port 5000
  private apiUrl = `${environment.apiUrl}/ai`;

  // Timeout configurations (in milliseconds)
  private readonly CLASSIFICATION_TIMEOUT = 30000; // 30 seconds
  private readonly ANALYSIS_TIMEOUT = 120000; // 2 minutes for AI analysis
  private readonly COMMENT_TIMEOUT = 60000; // 1 minute
  private readonly FEEDBACK_TIMEOUT = 90000; // 1.5 minutes

  constructor(private http: HttpClient) {}
  classify(metrics: MetricsRequest): Observable<ClassificationResponse> {
    // Ensure all fields are properly typed
    const payload = {
      ...metrics,
      timeSpent: Number(metrics.timeSpent),
      questionsAnswered: Number(metrics.questionsAnswered),
      correct_answers: Number(metrics.correct_answers),
      halfCorrect: Number(metrics.halfCorrect),
      reversed: Number(metrics.reversed),
      questionsSkipped: Number(metrics.questionsSkipped),
      answerChanges: Number(metrics.answerChanges),
      flaggedQuestions: Number(metrics.flaggedQuestions),
    };

    console.log('Sending classification request:', payload);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http
      .post<ClassificationResponse>(`${this.apiUrl}/classify`, payload, {
        headers,
      })
      .pipe(
        timeout(this.CLASSIFICATION_TIMEOUT),
        retry(2), // Retry up to 2 times
        tap((response) => {
          console.log('Classification response:', response);
        }),
        catchError((error) => {
          console.error('Classification error details:', error);
          let errorMessage = 'Classification failed';

          if (error.name === 'TimeoutError') {
            errorMessage =
              'Classification request timed out. Please try again.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => ({ ...error, userMessage: errorMessage }));
        })
      );
  }
  analyze(metrics: MetricsRequest): Observable<AnalysisResponse> {
    console.log('Sending analysis request:', metrics);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http
      .post<AnalysisResponse>(`${this.apiUrl}/analyze`, metrics, { headers })
      .pipe(
        timeout(this.ANALYSIS_TIMEOUT), // 2 minutes timeout for AI analysis
        retry(1), // Only retry once for analysis due to longer processing time
        tap((response) => {
          console.log('Analysis response:', response);
        }),
        catchError((error) => {
          console.error('Analysis error:', error);
          let errorMessage = 'AI analysis failed';

          if (error.name === 'TimeoutError') {
            errorMessage =
              'AI analysis is taking longer than expected. The AI service might be busy. Please try again in a few moments.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 500) {
            errorMessage =
              'AI service is temporarily unavailable. Please try again later.';
          }

          return throwError(() => ({ ...error, userMessage: errorMessage }));
        })
      );
  }
  commentOnAnalysis(
    request: PsychologistCommentRequest
  ): Observable<PsychologistCommentResponse> {
    console.log('Sending psychologist comment request:', request);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http
      .post<PsychologistCommentResponse>(`${this.apiUrl}/comment`, request, {
        headers,
      })
      .pipe(
        timeout(this.COMMENT_TIMEOUT),
        retry(2),
        tap((response) => {
          console.log('Comment response:', response);
        }),
        catchError((error) => {
          console.error('Comment error:', error);
          let errorMessage = 'Failed to save comment';

          if (error.name === 'TimeoutError') {
            errorMessage = 'Comment submission timed out. Please try again.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => ({ ...error, userMessage: errorMessage }));
        })
      );
  }
  addPsychologistComment(
    metrics: MetricsRequest,
    comment: string
  ): Observable<PsychologistCommentResponse> {
    const request: PsychologistCommentRequest = {
      metrics,
      comment,
    };

    console.log('Sending psychologist comment request:', request);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http
      .post<PsychologistCommentResponse>(`${this.apiUrl}/comment`, request, {
        headers,
      })
      .pipe(
        timeout(this.COMMENT_TIMEOUT),
        retry(2),
        tap((response) => {
          console.log('Psychologist comment response:', response);
        }),
        catchError((error) => {
          console.error('Psychologist comment error:', error);
          let errorMessage = 'Failed to save psychologist comment';

          if (error.name === 'TimeoutError') {
            errorMessage = 'Comment submission timed out. Please try again.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => ({ ...error, userMessage: errorMessage }));
        })
      );
  }
  provideFeedback(
    metrics: MetricsRequest,
    aiComment: string,
    isGood: boolean,
    feedbackText?: string
  ): Observable<FeedbackResponse> {
    const request: FeedbackRequest = {
      metrics,
      ai_comment: aiComment,
      is_good: isGood,
      feedback_text: feedbackText || '',
    };

    console.log('Sending feedback request:', request);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http
      .post<FeedbackResponse>(`${this.apiUrl}/feedback`, request, { headers })
      .pipe(
        timeout(this.FEEDBACK_TIMEOUT),
        retry(1), // Only retry once for feedback due to processing time
        tap((response) => {
          console.log('Feedback response:', response);
        }),
        catchError((error) => {
          console.error('Feedback error:', error);
          let errorMessage = 'Failed to process feedback';

          if (error.name === 'TimeoutError') {
            errorMessage = 'Feedback processing timed out. Please try again.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => ({ ...error, userMessage: errorMessage }));
        })
      );
  }
}
