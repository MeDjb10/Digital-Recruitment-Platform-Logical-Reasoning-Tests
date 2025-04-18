import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TestService } from './test.service';
import { Test, TestsResponse, TestResponse } from '../models/test.model';
import {
  DominoQuestion,
  MultipleChoiceQuestion,
  QuestionsResponse,
  QuestionResponse,
} from '../models/question.model';

@Injectable({
  providedIn: 'root',
})
export class TestManagementService {
  constructor(private http: HttpClient, private testService: TestService) {}

  // CRUD Operations: Tests

  // Get all tests (for admin)
  getAllTests(): Observable<Test[]> {
    return this.testService.getAllTests().pipe(
      map((response) => {
        if (!response.success) {
          return [];
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('Error getting tests:', error);
        return throwError(() => new Error('Failed to load tests'));
      })
    );
  }

  // Get all active tests (for candidates)
  getActiveTests(): Observable<Test[]> {
    return this.testService.getAllTests({ isActive: true }).pipe(
      map((response) => {
        if (!response.success) {
          return [];
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('Error getting active tests:', error);
        return throwError(() => new Error('Failed to load active tests'));
      })
    );
  }

  // Get tests by category
  getTestsByCategory(category: string): Observable<Test[]> {
    return this.testService.getAllTests({ category }).pipe(
      map((response) => {
        if (!response.success) {
          return [];
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error getting tests for category ${category}:`, error);
        return throwError(
          () => new Error('Failed to load tests for this category')
        );
      })
    );
  }

  // Get test by ID
  getTestById(testId: string): Observable<Test | null> {
    return this.testService.getTestById(testId).pipe(
      map((response) => {
        if (!response.success) {
          return null;
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error getting test ${testId}:`, error);
        return throwError(() => new Error('Failed to load test details'));
      })
    );
  }

  // Create new test
  createTest(test: Partial<Test>): Observable<Test> {
    return this.testService.createTest(test).pipe(
      map((response) => {
        if (!response.success || !response.data) {
          throw new Error('Failed to create test');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('Error creating test:', error);
        return throwError(() => new Error('Failed to create test'));
      })
    );
  }

  // Update existing test
  updateTest(testId: string, updates: Partial<Test>): Observable<Test> {
    return this.testService.updateTest(testId, updates).pipe(
      map((response) => {
        if (!response.success || !response.data) {
          throw new Error('Failed to update test');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error updating test ${testId}:`, error);
        return throwError(() => new Error('Failed to update test'));
      })
    );
  }

  // Delete test
  deleteTest(testId: string): Observable<void> {
    return this.testService.deleteTest(testId).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error('Failed to delete test');
        }
        return;
      }),
      catchError((error) => {
        console.error(`Error deleting test ${testId}:`, error);
        return throwError(() => new Error('Failed to delete test'));
      })
    );
  }

  // Update test status (active/inactive)
  updateTestStatus(testId: string, isActive: boolean): Observable<Test> {
    return this.updateTest(testId, { isActive });
  }

  // CRUD Operations: Questions

  // Get all questions for a test
  getQuestionsByTestId(
    testId: string
  ): Observable<(DominoQuestion | MultipleChoiceQuestion)[]> {
    return this.testService.getQuestionsByTestId(testId).pipe(
      map((response) => {
        if (!response.success) {
          return [];
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error getting questions for test ${testId}:`, error);
        return throwError(() => new Error('Failed to load questions'));
      })
    );
  }

  // Get question by ID
  getQuestionById(
    questionId: string
  ): Observable<DominoQuestion | MultipleChoiceQuestion | null> {
    return this.testService.getQuestionById(questionId).pipe(
      map((response) => {
        if (!response.success) {
          return null;
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error getting question ${questionId}:`, error);
        return throwError(() => new Error('Failed to load question details'));
      })
    );
  }

  // Create question
  createQuestion(
    testId: string,
    question: any
  ): Observable<DominoQuestion | MultipleChoiceQuestion> {
    // Prepare the question data
    const questionData = {
      ...question,
      questionType: question.questionType || 'DominoQuestion',
    };

    return this.testService.createQuestion(testId, questionData).pipe(
      map((response) => {
        if (!response.success || !response.data) {
          throw new Error('Failed to create question');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error creating question for test ${testId}:`, error);
        return throwError(() => new Error('Failed to create question'));
      })
    );
  }

  // Update question
  updateQuestion(
    questionId: string,
    updates: any
  ): Observable<DominoQuestion | MultipleChoiceQuestion> {
    // Create a copy of the updates object and remove the questionType field
    // to prevent the "Cannot change question type" error from the backend
    const updatesWithoutType = { ...updates };

    // Remove fields that shouldn't be part of the update payload
    if (updatesWithoutType.questionType) {
      delete updatesWithoutType.questionType;
    }

    // Make sure we're not sending _id or id if they exist in the updates
    // This prevents confusion between the path parameter and body
    if (updatesWithoutType._id) {
      delete updatesWithoutType._id;
    }
    if (updatesWithoutType.id) {
      delete updatesWithoutType.id;
    }

    console.log(
      `Updating question ${questionId} with data:`,
      updatesWithoutType
    );

    return this.testService.updateQuestion(questionId, updatesWithoutType).pipe(
      tap((response) => {
        console.log('Update question response:', response);
      }),
      map((response) => {
        if (!response.success || !response.data) {
          throw new Error('Failed to update question');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error updating question ${questionId}:`, error);
        return throwError(() => new Error('Failed to update question'));
      })
    );
  }

  // Delete question
  deleteQuestion(questionId: string): Observable<void> {
    return this.testService.deleteQuestion(questionId).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error('Failed to delete question');
        }
        return;
      }),
      catchError((error) => {
        console.error(`Error deleting question ${questionId}:`, error);
        return throwError(() => new Error('Failed to delete question'));
      })
    );
  }

  // Get a test with its questions for the domino test interface
  getTestForDominoTest(testId: string): Observable<any> {
    // Get the test by ID
    return this.getTestById(testId).pipe(
      switchMap((test) => {
        if (!test) {
          return throwError(() => new Error('Test not found'));
        }

        // Get questions for this test
        return this.getQuestionsByTestId(test._id).pipe(
          map((questions) => {
            // Map the questions to the format expected by the domino test component
            const mappedQuestions = questions
              .map((q) => {
                // Process only domino questions
                if (q.questionType === 'DominoQuestion') {
                  const dominoQ = q as DominoQuestion;
                  return {
                    id: dominoQ._id,
                    title: dominoQ.title || '',
                    instruction: dominoQ.instruction,
                    dominos: dominoQ.dominos || [],
                    arrows: dominoQ.arrows || [],
                    gridLayout: dominoQ.gridLayout || { rows: 3, cols: 3 },
                    correctAnswer: dominoQ.correctAnswer,
                    pattern: dominoQ.pattern || '',
                    layoutType: dominoQ.layoutType || 'grid',
                    // Add UI state properties
                    answered: false,
                    flaggedForReview: false,
                    visited: false,
                  };
                }
                // Skip non-domino questions
                return null;
              })
              .filter((q) => q !== null); // Remove null entries

            // Return the formatted test data
            return {
              id: test._id,
              name: test.name,
              description: test.description,
              duration: test.duration,
              totalQuestions: mappedQuestions.length,
              difficulty: test.difficulty,
              category: test.category,
              instructions: test.instructions,
              questions: mappedQuestions,
            };
          })
        );
      }),
      catchError((error) => {
        console.error(
          `Error loading test for domino interface ${testId}:`,
          error
        );
        return throwError(() => new Error('Failed to load test data'));
      })
    );
  }

  // Move question's position
  moveQuestionPosition(
    questionId: string,
    newPosition: number
  ): Observable<DominoQuestion | MultipleChoiceQuestion> {
    return this.testService.moveQuestionPosition(questionId, newPosition).pipe(
      map((response) => {
        if (!response.success || !response.data) {
          throw new Error('Failed to move question');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error moving question ${questionId}:`, error);
        return throwError(() => new Error('Failed to move question'));
      })
    );
  }

  // Duplicate question
  duplicateQuestion(
    questionId: string
  ): Observable<DominoQuestion | MultipleChoiceQuestion> {
    return this.testService.duplicateQuestion(questionId).pipe(
      map((response) => {
        if (!response.success || !response.data) {
          throw new Error('Failed to duplicate question');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error(`Error duplicating question ${questionId}:`, error);
        return throwError(() => new Error('Failed to duplicate question'));
      })
    );
  }
}
