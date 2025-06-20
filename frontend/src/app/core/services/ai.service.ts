import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface MetricsRequest {
  attemptId: string;  // Add this field
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

    return this.http.post<ClassificationResponse>(`${this.apiUrl}/classify`, payload).pipe(
      tap(response => {
        console.log('Classification response:', response);
      }),
      catchError(error => {
        console.error('Error details:', error.error);
        return throwError(() => error);
      })
    );
  }

  analyze(metrics: MetricsRequest): Observable<AnalysisResponse> {
    console.log('Sending analysis request:', metrics);
    
    return this.http.post<AnalysisResponse>(`${this.apiUrl}/analyze`, metrics).pipe(
      tap(response => {
        console.log('Analysis response:', response);
      }),
      catchError(error => {
        console.error('Analysis error:', error);
        return throwError(() => error);
      })
    );
  }

  commentOnAnalysis(request: PsychologistCommentRequest): Observable<PsychologistCommentResponse> {
    console.log('Sending psychologist comment request:', request);
    
    return this.http.post<PsychologistCommentResponse>(`${this.apiUrl}/comment`, request).pipe(
      tap(response => {
        console.log('Comment response:', response);
      }),
      catchError(error => {
        console.error('Comment error:', error);
        return throwError(() => error);
      })
    );
  }

  addPsychologistComment(metrics: MetricsRequest, comment: string): Observable<PsychologistCommentResponse> {
    const request: PsychologistCommentRequest = {
      metrics,
      comment
    };

    console.log('Sending psychologist comment request:', request);

    return this.http.post<PsychologistCommentResponse>(`${this.apiUrl}/comment`, request).pipe(
      tap(response => {
        console.log('Psychologist comment response:', response);
      }),
      catchError(error => {
        console.error('Psychologist comment error:', error);
        return throwError(() => error);
      })
    );
  }

  provideFeedback(metrics: MetricsRequest, aiComment: string, isGood: boolean, feedbackText?: string): Observable<FeedbackResponse> {
    const request: FeedbackRequest = {
      metrics,
      ai_comment: aiComment,
      is_good: isGood,
      feedback_text: feedbackText || ''
    };

    console.log('Sending feedback request:', request);

    return this.http.post<FeedbackResponse>(`${this.apiUrl}/feedback`, request).pipe(
      tap(response => {
        console.log('Feedback response:', response);
      }),
      catchError(error => {
        console.error('Feedback error:', error);
        return throwError(() => error);
      })
    );
  }
}