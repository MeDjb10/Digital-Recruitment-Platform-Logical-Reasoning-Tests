import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, switchMap, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

// Define interfaces to be used across the application
export interface Test {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  totalQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string; // e.g., 'logical-reasoning', 'verbal-reasoning'
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  questions?: Question[];
  instructionsGeneral?: string;
  createdBy?: string;
  tags?: string[];
}

export interface Question {
  id: string;
  testId: string;
  title?: string;
  instruction: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  pattern: string;
  dominos: any[]; // DominoPosition[]
  gridLayout?: {
    rows: number;
    cols: number;
    width?: number;
    height?: number;
  };
  correctAnswer?: {
    dominoId: number;
    topValue: number | null;
    bottomValue: number | null;
  };
  layoutType:
    | 'row'
    | 'grid'
    | 'rhombus'
    | 'custom'
    | 'rhombus-large'
    | 'spiral';
}

@Injectable({
  providedIn: 'root',
})
export class TestManagementService {
  private apiUrl = '/api/tests'; // Base URL for API
  private useMockData = true; // Toggle for mock vs real API

  // Local storage keys
  private readonly STORAGE_KEY_TESTS = 'domino_tests';
  private readonly STORAGE_KEY_QUESTIONS = 'domino_questions';
  private readonly STORAGE_KEY_TEMPLATES = 'domino_templates';

  constructor(private http: HttpClient) {
    // Initialize mock data if needed
    this.initializeMockDataIfNeeded();
  }

  // Initialize mock data in local storage if it doesn't exist
  private initializeMockDataIfNeeded(): void {
    if (this.useMockData) {
      // Check if tests exist in local storage
      if (!localStorage.getItem(this.STORAGE_KEY_TESTS)) {
        localStorage.setItem(
          this.STORAGE_KEY_TESTS,
          JSON.stringify(this.getInitialTests())
        );
      }

      // Check if questions exist in local storage
      if (!localStorage.getItem(this.STORAGE_KEY_QUESTIONS)) {
        localStorage.setItem(
          this.STORAGE_KEY_QUESTIONS,
          JSON.stringify(this.getInitialQuestions())
        );
      }

      // Check if templates exist in local storage
      if (!localStorage.getItem(this.STORAGE_KEY_TEMPLATES)) {
        localStorage.setItem(
          this.STORAGE_KEY_TEMPLATES,
          JSON.stringify(this.getInitialTemplates())
        );
      }
    }
  }

  // CRUD Operations: Tests

  // Get all tests (for admin)
  getAllTests(): Observable<Test[]> {
    if (this.useMockData) {
      const tests = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_TESTS) || '[]'
      );
      return of(tests).pipe(delay(300)); // Simulate API delay
    }

    return this.http.get<Test[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching tests:', error);
        return throwError(
          () => new Error('Failed to load tests. Please try again.')
        );
      })
    );
  }

  // Get all active tests (for candidates)
  getActiveTests(): Observable<Test[]> {
    return this.getAllTests().pipe(
      map((tests) => tests.filter((test) => test.isActive))
    );
  }

  // Get test by category (e.g., logical-reasoning)
  getTestsByCategory(category: string): Observable<Test[]> {
    return this.getAllTests().pipe(
      map((tests) => tests.filter((test) => test.category === category))
    );
  }

  // Get test by ID
  getTestById(testId: string): Observable<Test | null> {
    if (this.useMockData) {
      const tests = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_TESTS) || '[]'
      );
      const test = tests.find((t: Test) => t.id === testId) || null;

      // If found and it's for admin, get questions too
      if (test) {
        const questions = JSON.parse(
          localStorage.getItem(this.STORAGE_KEY_QUESTIONS) || '[]'
        );
        test.questions = questions.filter((q: Question) => q.testId === testId);
      }

      return of(test).pipe(delay(300));
    }

    return this.http.get<Test | null>(`${this.apiUrl}/${testId}`).pipe(
      catchError((error) => {
        console.error(`Error fetching test ${testId}:`, error);
        return throwError(
          () => new Error('Failed to load test details. Please try again.')
        );
      })
    );
  }

  // Create new test
  createTest(test: Partial<Test>): Observable<Test> {
    const newTest: Test = {
      id: uuidv4(),
      name: test.name || 'Untitled Test',
      description: test.description || '',
      duration: test.duration || 30,
      totalQuestions: 0, // Will be updated when questions are added
      difficulty: test.difficulty || 'medium',
      category: test.category || 'logical-reasoning',
      isActive: test.isActive !== undefined ? test.isActive : false,
      createdAt: new Date(),
      updatedAt: new Date(),
      instructionsGeneral: test.instructionsGeneral || '',
      questions: [],
    };

    if (this.useMockData) {
      const tests = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_TESTS) || '[]'
      );
      tests.push(newTest);
      localStorage.setItem(this.STORAGE_KEY_TESTS, JSON.stringify(tests));
      return of(newTest).pipe(delay(300));
    }

    return this.http.post<Test>(this.apiUrl, newTest).pipe(
      catchError((error) => {
        console.error('Error creating test:', error);
        return throwError(
          () => new Error('Failed to create test. Please try again.')
        );
      })
    );
  }

  // Update existing test
  updateTest(testId: string, updates: Partial<Test>): Observable<Test> {
    if (this.useMockData) {
      const tests = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_TESTS) || '[]'
      );
      const index = tests.findIndex((t: Test) => t.id === testId);

      if (index >= 0) {
        tests[index] = { ...tests[index], ...updates, updatedAt: new Date() };
        localStorage.setItem(this.STORAGE_KEY_TESTS, JSON.stringify(tests));
        return of(tests[index]).pipe(delay(300));
      }

      return throwError(() => new Error('Test not found'));
    }

    return this.http.put<Test>(`${this.apiUrl}/${testId}`, updates).pipe(
      catchError((error) => {
        console.error(`Error updating test ${testId}:`, error);
        return throwError(
          () => new Error('Failed to update test. Please try again.')
        );
      })
    );
  }

  // Delete test
  deleteTest(testId: string): Observable<void> {
    if (this.useMockData) {
      const tests = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_TESTS) || '[]'
      );
      const questions = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_QUESTIONS) || '[]'
      );

      // Filter out the test to delete
      const filteredTests = tests.filter((t: Test) => t.id !== testId);

      // Filter out associated questions
      const filteredQuestions = questions.filter(
        (q: Question) => q.testId !== testId
      );

      localStorage.setItem(
        this.STORAGE_KEY_TESTS,
        JSON.stringify(filteredTests)
      );
      localStorage.setItem(
        this.STORAGE_KEY_QUESTIONS,
        JSON.stringify(filteredQuestions)
      );

      return of(undefined).pipe(delay(300));
    }

    return this.http.delete<void>(`${this.apiUrl}/${testId}`).pipe(
      catchError((error) => {
        console.error(`Error deleting test ${testId}:`, error);
        return throwError(
          () => new Error('Failed to delete test. Please try again.')
        );
      })
    );
  }

  // Update test status (active/inactive)
  updateTestStatus(testId: string, isActive: boolean): Observable<Test> {
    return this.updateTest(testId, { isActive });
  }

  // CRUD Operations: Questions

  // Get all questions for a test
  getQuestionsByTestId(testId: string): Observable<Question[]> {
    if (this.useMockData) {
      const questions = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_QUESTIONS) || '[]'
      );
      const testQuestions = questions.filter(
        (q: Question) => q.testId === testId
      );
      return of(testQuestions).pipe(delay(300));
    }

    return this.http.get<Question[]>(`${this.apiUrl}/${testId}/questions`).pipe(
      catchError((error) => {
        console.error(`Error fetching questions for test ${testId}:`, error);
        return throwError(
          () => new Error('Failed to load questions. Please try again.')
        );
      })
    );
  }

  // Get question by ID
  getQuestionById(questionId: string): Observable<Question | null> {
    if (this.useMockData) {
      const questions = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_QUESTIONS) || '[]'
      );
      const question =
        questions.find((q: Question) => q.id === questionId) || null;
      return of(question).pipe(delay(300));
    }

    return this.http
      .get<Question | null>(`${this.apiUrl}/questions/${questionId}`)
      .pipe(
        catchError((error) => {
          console.error(`Error fetching question ${questionId}:`, error);
          return throwError(
            () =>
              new Error('Failed to load question details. Please try again.')
          );
        })
      );
  }

  // Update the signature to make it match the calls
  createQuestion(
    testId: string,
    question: Partial<Question>
  ): Observable<Question> {
    const newQuestion: Question = {
      id: uuidv4(),
      testId,
      title: question.title || '',
      instruction:
        question.instruction ||
        'Identify the pattern and complete the missing domino',
      difficulty: question.difficulty || 'medium',
      pattern: question.pattern || '',
      dominos: question.dominos || [],
      gridLayout: question.gridLayout || { rows: 3, cols: 3 },
      correctAnswer: question.correctAnswer,
      layoutType: question.layoutType || 'grid',
    };

    if (this.useMockData) {
      // Add the new question
      const questions = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_QUESTIONS) || '[]'
      );
      questions.push(newQuestion);
      localStorage.setItem(
        this.STORAGE_KEY_QUESTIONS,
        JSON.stringify(questions)
      );

      // Update the test's question count
      this.updateTestQuestionCount(testId);

      return of(newQuestion).pipe(delay(300));
    }

    return this.http
      .post<Question>(`${this.apiUrl}/${testId}/questions`, newQuestion)
      .pipe(
        tap(() => this.updateTestQuestionCount(testId)),
        catchError((error) => {
          console.error('Error creating question:', error);
          return throwError(
            () => new Error('Failed to create question. Please try again.')
          );
        })
      );
  }

  // Also update the updateQuestion method to match the calls
  updateQuestion(
    questionId: string,
    updates: Partial<Question>
  ): Observable<Question> {
    if (this.useMockData) {
      const questions = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_QUESTIONS) || '[]'
      );
      const index = questions.findIndex((q: Question) => q.id === questionId);

      if (index >= 0) {
        // Update the question
        questions[index] = {
          ...questions[index],
          ...updates,
          updatedAt: new Date(),
        };
        localStorage.setItem(
          this.STORAGE_KEY_QUESTIONS,
          JSON.stringify(questions)
        );
        return of(questions[index]).pipe(delay(300));
      }

      return throwError(() => new Error('Question not found'));
    }

    return this.http
      .put<Question>(`${this.apiUrl}/questions/${questionId}`, updates)
      .pipe(
        catchError((error) => {
          console.error(`Error updating question ${questionId}:`, error);
          return throwError(
            () => new Error('Failed to update question. Please try again.')
          );
        })
      );
  }

  // Delete question
  deleteQuestion(questionId: string): Observable<void> {
    if (this.useMockData) {
      const questions = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_QUESTIONS) || '[]'
      );
      const questionToDelete = questions.find(
        (q: Question) => q.id === questionId
      );

      if (!questionToDelete) {
        return throwError(() => new Error('Question not found'));
      }

      const testId = questionToDelete.testId;
      const filteredQuestions = questions.filter(
        (q: Question) => q.id !== questionId
      );

      localStorage.setItem(
        this.STORAGE_KEY_QUESTIONS,
        JSON.stringify(filteredQuestions)
      );

      // Update the test's question count
      this.updateTestQuestionCount(testId);

      return of(undefined).pipe(delay(300));
    }

    return this.http
      .delete<void>(`${this.apiUrl}/questions/${questionId}`)
      .pipe(
        catchError((error) => {
          console.error(`Error deleting question ${questionId}:`, error);
          return throwError(
            () => new Error('Failed to delete question. Please try again.')
          );
        })
      );
  }

  // Add this method to TestManagementService
  getTestForDominoTest(testId: string): Observable<any> {
    // Get the test by ID
    return this.getTestById(testId).pipe(
      switchMap((test) => {
        if (!test) {
          return of(null);
        }

        // Get questions for this test
        return this.getQuestionsByTestId(test.id).pipe(
          map((questions) => {
            // Format the test data for the Domino Test component
            return {
              id: test.id,
              name: test.name,
              description: test.description,
              duration: test.duration,
              questions: questions.map((q) => ({
                id: q.id,
                title: q.title || `Question ${q.id}`,
                instruction:
                  q.instruction ||
                  'Find the missing values in the domino pattern',
                dominos: q.dominos || [],
                gridLayout: q.gridLayout || { rows: 3, cols: 3 },
                pattern: q.pattern || '',
                correctAnswer: q.correctAnswer,
              })),
            };
          })
        );
      }),
      catchError((error) => {
        console.error('Error in getTestForDominoTest:', error);
        return of(null);
      })
    );
  }

  // Layout Templates

  getTemplateById(templateId: string): Observable<any> {
    if (this.useMockData) {
      const templates = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_TEMPLATES) || '[]'
      );
      const template = templates.find((t: any) => t.id === templateId) || null;
      return of(template).pipe(delay(300));
    }

    return this.http.get<any>(`${this.apiUrl}/templates/${templateId}`).pipe(
      catchError((error) => {
        console.error(`Error fetching template ${templateId}:`, error);
        return throwError(
          () => new Error('Failed to load template. Please try again.')
        );
      })
    );
  }

  getAllTemplates(): Observable<any[]> {
    if (this.useMockData) {
      const templates = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_TEMPLATES) || '[]'
      );
      return of(templates).pipe(delay(300));
    }

    return this.http.get<any[]>(`${this.apiUrl}/templates`).pipe(
      catchError((error) => {
        console.error('Error fetching templates:', error);
        return throwError(
          () => new Error('Failed to load templates. Please try again.')
        );
      })
    );
  }

  // Helper methods

  private updateTestQuestionCount(testId: string): void {
    if (this.useMockData) {
      const tests = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_TESTS) || '[]'
      );
      const questions = JSON.parse(
        localStorage.getItem(this.STORAGE_KEY_QUESTIONS) || '[]'
      );

      const testIndex = tests.findIndex((t: Test) => t.id === testId);
      if (testIndex >= 0) {
        const testQuestions = questions.filter(
          (q: Question) => q.testId === testId
        );
        tests[testIndex].totalQuestions = testQuestions.length;
        tests[testIndex].updatedAt = new Date();
        localStorage.setItem(this.STORAGE_KEY_TESTS, JSON.stringify(tests));
      }
    } else {
      // For real API, we might trigger a separate API call to update counts
      this.http
        .post<void>(`${this.apiUrl}/${testId}/updateQuestionCount`, {})
        .subscribe();
    }
  }

  // Mock data generators

  private getInitialTests(): Test[] {
    return [
      {
        id: 'domino-test-1',
        name: 'Domino Pattern Recognition - Basic',
        description: 'A basic test for pattern recognition using domino tiles',
        duration: 15,
        totalQuestions: 2,
        difficulty: 'easy',
        category: 'logical-reasoning',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        instructionsGeneral:
          'This test assesses your ability to recognize patterns and complete sequences using domino tiles.',
      },
      {
        id: 'domino-test-2',
        name: 'Advanced Domino Logic',
        description:
          'Complex pattern recognition test with challenging domino sequences',
        duration: 30,
        totalQuestions: 1,
        difficulty: 'hard',
        category: 'logical-reasoning',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        instructionsGeneral:
          'Identify complex patterns and apply logical reasoning to find the missing domino values.',
      },
    ];
  }

  private getInitialQuestions(): Question[] {
    return [
      {
        id: 'q1-domino-test-1',
        testId: 'domino-test-1',
        title: 'Simple Sequence',
        instruction: 'Complete the sequence by identifying the pattern.',
        difficulty: 'easy',
        pattern: 'sequential-addition',
        layoutType: 'row',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 2,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 2,
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 3,
            row: 0,
            col: 2,
            topValue: 3,
            bottomValue: 4,
            isEditable: false,
          },
          {
            id: 4,
            row: 0,
            col: 3,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 1, cols: 4 },
        correctAnswer: {
          dominoId: 4,
          topValue: 4,
          bottomValue: 5,
        },
      },
      {
        id: 'q2-domino-test-1',
        testId: 'domino-test-1',
        title: 'Simple Grid Pattern',
        instruction: 'Identify the missing domino values in the grid.',
        difficulty: 'easy',
        pattern: 'grid-pattern',
        layoutType: 'grid',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 2,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 2,
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 3,
            row: 1,
            col: 0,
            topValue: 2,
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 4,
            row: 1,
            col: 1,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 2, cols: 2 },
        correctAnswer: {
          dominoId: 4,
          topValue: 3,
          bottomValue: 4,
        },
      },
      {
        id: 'q1-domino-test-2',
        testId: 'domino-test-2',
        title: 'Complex Spiral Pattern',
        instruction:
          'Find the values for the missing domino in this spiral arrangement.',
        difficulty: 'hard',
        pattern: 'spiral-pattern',
        layoutType: 'spiral',
        dominos: [
          {
            id: 1,
            row: 1,
            col: 1,
            topValue: 1,
            bottomValue: 3,
            isEditable: false,
            exactX: 250,
            exactY: 250,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 3,
            bottomValue: 5,
            isEditable: false,
            exactX: 250,
            exactY: 150,
          },
          {
            id: 3,
            row: 0,
            col: 2,
            topValue: 5,
            bottomValue: 2,
            isEditable: false,
            exactX: 350,
            exactY: 150,
          },
          {
            id: 4,
            row: 1,
            col: 2,
            topValue: 2,
            bottomValue: 4,
            isEditable: false,
            exactX: 350,
            exactY: 250,
          },
          {
            id: 5,
            row: 2,
            col: 2,
            topValue: 4,
            bottomValue: 6,
            isEditable: false,
            exactX: 350,
            exactY: 350,
          },
          {
            id: 6,
            row: 2,
            col: 1,
            topValue: null,
            bottomValue: null,
            isEditable: true,
            exactX: 250,
            exactY: 350,
          },
        ],
        gridLayout: { rows: 3, cols: 3 },
        correctAnswer: {
          dominoId: 6,
          topValue: 6,
          bottomValue: 1,
        },
      },
    ];
  }

  private getInitialTemplates(): any[] {
    return [
      {
        id: 'template-row',
        name: 'Simple Row',
        description: 'A horizontal row of dominos',
        layoutType: 'row',
        gridLayout: { rows: 1, cols: 4 },
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 1,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 2,
            bottomValue: 2,
            isEditable: false,
          },
          {
            id: 3,
            row: 0,
            col: 2,
            topValue: 3,
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 4,
            row: 0,
            col: 3,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
      },
      {
        id: 'template-grid-2x2',
        name: '2x2 Grid',
        description: 'A 2x2 grid of dominos',
        layoutType: 'grid',
        gridLayout: { rows: 2, cols: 2 },
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 2,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 3,
            bottomValue: 4,
            isEditable: false,
          },
          {
            id: 3,
            row: 1,
            col: 0,
            topValue: 5,
            bottomValue: 6,
            isEditable: false,
          },
          {
            id: 4,
            row: 1,
            col: 1,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
      },
      {
        id: 'template-custom',
        name: 'Custom Layout',
        description: 'A custom arrangement of dominos',
        layoutType: 'custom',
        gridLayout: { rows: 3, cols: 3 },
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 2,
            isEditable: false,
            exactX: 150,
            exactY: 150,
          },
          {
            id: 2,
            row: 1,
            col: 1,
            topValue: 3,
            bottomValue: 4,
            isEditable: false,
            exactX: 250,
            exactY: 250,
          },
          {
            id: 3,
            row: 2,
            col: 2,
            topValue: null,
            bottomValue: null,
            isEditable: true,
            exactX: 350,
            exactY: 350,
          },
        ],
      },
    ];
  }
}
