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
}