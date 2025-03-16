import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface MockDominoTest {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  totalQuestions: number;
  questions: MockQuestion[];
}

export interface MockQuestion {
  id: number;
  title?: string;
  instruction?: string;
  dominos: {
    id: number;
    row: number;
    col: number;
    topValue: number | null;
    bottomValue: number | null;
    isEditable: boolean;
    isVertical?: boolean;
    color?: string;
  }[];
  gridLayout: { rows: number; cols: number };
  pattern?: string; // Description of the pattern for admin reference
  correctAnswer: {
    topValue: number;
    bottomValue: number;
    dominoId: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MockDataService {
  private d70Test: MockDominoTest = {
    id: 'd70',
    name: 'Logical Reasoning Test (D-70)',
    description: 'A comprehensive logical reasoning test with domino patterns',
    duration: 25,
    totalQuestions: 8, // Simplified for demo, real test has 44 questions
    questions: [
      // Question 1: Simple sequential pattern (top values increase by 1, bottom values increase by 1)
      {
        id: 1,
        instruction: 'Identify the pattern and complete the missing domino.',
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
            topValue: 4,
            bottomValue: 5,
            isEditable: false,
          },
          {
            id: 5,
            row: 0,
            col: 4,
            topValue: 5,
            bottomValue: 6,
            isEditable: false,
          },
          {
            id: 6,
            row: 0,
            col: 5,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 1, cols: 6 },
        pattern: 'Sequential increments by 1',
        correctAnswer: {
          topValue: 6,
          bottomValue: 1, // Wrapping around to 1
          dominoId: 6,
        },
      },

      // Question 2: Matching top-bottom values across rows
      {
        id: 2,
        instruction:
          'Find the pattern between the dominos and fill in the missing values.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 3,
            bottomValue: 3,
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
            topValue: 1,
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 4,
            row: 1,
            col: 0,
            topValue: 3,
            bottomValue: 2,
            isEditable: false,
          },
          {
            id: 5,
            row: 1,
            col: 1,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
          {
            id: 6,
            row: 1,
            col: 2,
            topValue: 3,
            bottomValue: 0,
            isEditable: false,
          },
        ],
        gridLayout: { rows: 2, cols: 3 },
        pattern:
          'Bottom values in top row match top values in bottom row; top decreases left to right in first row',
        correctAnswer: {
          topValue: 2,
          bottomValue: 1,
          dominoId: 5,
        },
      },

      // Question 3: Rhombus pattern with mathematical relations
      {
        id: 3,
        instruction:
          'Complete the rhombus pattern by determining the missing domino values.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 1,
            topValue: 1,
            bottomValue: 4,
            isEditable: false,
          },
          {
            id: 2,
            row: 1,
            col: 0,
            topValue: 3,
            bottomValue: 5,
            isEditable: false,
          },
          {
            id: 3,
            row: 1,
            col: 2,
            topValue: 2,
            bottomValue: 6,
            isEditable: false,
          },
          {
            id: 4,
            row: 2,
            col: 1,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 3, cols: 3 },
        pattern: 'Opposite dominos have related values (sum to same number)',
        correctAnswer: {
          topValue: 4,
          bottomValue: 3,
          dominoId: 4,
        },
      },

      // Question 4: Matching sums pattern
      {
        id: 4,
        instruction:
          'Find the missing values that maintain the pattern of the domino set.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 5,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 2,
            bottomValue: 4,
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
            row: 1,
            col: 1,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 2, cols: 3 },
        pattern: 'Sum of each domino is 6',
        correctAnswer: {
          topValue: 4,
          bottomValue: 2,
          dominoId: 4,
        },
      },

      // Question 5: Decreasing sequence
      {
        id: 5,
        instruction:
          'Identify the pattern in this sequence and complete the missing domino.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 6,
            bottomValue: 5,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 5,
            bottomValue: 4,
            isEditable: false,
          },
          {
            id: 3,
            row: 0,
            col: 2,
            topValue: 4,
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
        gridLayout: { rows: 1, cols: 4 },
        pattern: 'Decreasing sequence by 1',
        correctAnswer: {
          topValue: 3,
          bottomValue: 2,
          dominoId: 4,
        },
      },

      // Question 6: Alternating vertical/horizontal dominos
      {
        id: 6,
        instruction:
          'Identify the pattern considering both values and orientation.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 2,
            bottomValue: 3,
            isEditable: false,
            isVertical: true,
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
            row: 0,
            col: 2,
            topValue: 4,
            bottomValue: 5,
            isEditable: false,
            isVertical: true,
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
        pattern: 'Values increase by 1, orientation alternates',
        correctAnswer: {
          topValue: 5,
          bottomValue: 6,
          dominoId: 4,
        },
      },

      // Question 7: Matrix pattern with sums
      {
        id: 7,
        instruction:
          'Find the values for the bottom-right domino to complete the pattern.',
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
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 3,
            row: 1,
            col: 0,
            topValue: 3,
            bottomValue: 2,
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
        pattern: 'Sum of values increases by position',
        correctAnswer: {
          topValue: 4,
          bottomValue: 4,
          dominoId: 4,
        },
      },

      // Question 8: Complex pattern with multiple relationships
      {
        id: 8,
        instruction:
          'Analyze the relationships between all dominos to find the missing values.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 2,
            bottomValue: 4,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 3,
            bottomValue: 6,
            isEditable: false,
          },
          {
            id: 3,
            row: 1,
            col: 0,
            topValue: 4,
            bottomValue: 2,
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
        pattern:
          'Bottom right values are doubles of top left in same column/row',
        correctAnswer: {
          topValue: 6,
          bottomValue: 3,
          dominoId: 4,
        },
      },
    ],
  };

  private d200Test: MockDominoTest = {
    id: 'd200',
    name: 'Advanced Logical Reasoning Test (D-200)',
    description: 'An advanced test with complex domino patterns',
    duration: 30,
    totalQuestions: 5, // Simplified for demo
    questions: [
      // Just a few sample questions for the D-200 test
      {
        id: 1,
        instruction:
          'Identify the complex pattern and complete the missing domino.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 0,
            topValue: 1,
            bottomValue: 3,
            isEditable: false,
          },
          {
            id: 2,
            row: 0,
            col: 1,
            topValue: 2,
            bottomValue: 6,
            isEditable: false,
          },
          {
            id: 3,
            row: 1,
            col: 0,
            topValue: 3,
            bottomValue: 9,
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
        pattern:
          'Top values follow row pattern, bottom values are top values x row+col+1',
        correctAnswer: {
          topValue: 4,
          bottomValue: 12,
          dominoId: 4,
        },
      },
      // Add more complex examples as needed
    ],
  };

  private tests: { [key: string]: MockDominoTest } = {
    d70: this.d70Test,
    d200: this.d200Test,
  };

  constructor() {}

  // Get all available tests
  getAvailableTests(): Observable<any[]> {
    const testList = Object.values(this.tests).map((test) => ({
      id: test.id,
      name: test.name,
      description: test.description,
      duration: test.duration,
      totalQuestions: test.totalQuestions,
    }));

    return of(testList).pipe(delay(500)); // Simulate network delay
  }

  // Get a specific test
  getTest(testId: string): Observable<any> {
    const test = this.tests[testId];

    if (!test) {
      return throwError(() => new Error(`Test with ID ${testId} not found`));
    }

    // Create a copy without the correct answers for the client
    const clientTest = {
      id: test.id,
      name: test.name,
      description: test.description,
      duration: test.duration,
      questions: test.questions.map((q) => ({
        id: q.id,
        instruction: q.instruction || 'Find the missing values in the domino',
        dominos: q.dominos,
        gridLayout: q.gridLayout,
      })),
    };

    return of(clientTest).pipe(delay(700)); // Simulate network delay
  }

  // Submit test answers
  submitTest(testId: string, answers: any[]): Observable<any> {
    console.log(`Submitting test ${testId} with answers:`, answers);

    const test = this.tests[testId];
    if (!test) {
      return throwError(() => new Error(`Test with ID ${testId} not found`));
    }

    // Calculate score based on correct answers
    let score = 0;
    let correctCount = 0;

    answers.forEach((answer) => {
      const question = test.questions.find((q) => q.id === answer.id);

      if (question) {
        const userAnswer = answer.userAnswer;
        const correctAnswer = question.correctAnswer;

        let isCorrect = false;
        let isPartiallyCorrect = false;
        let isReversed = false;

        if (userAnswer && correctAnswer) {
          if (
            userAnswer.topValue === correctAnswer.topValue &&
            userAnswer.bottomValue === correctAnswer.bottomValue
          ) {
            isCorrect = true;
            correctCount++;
          } else if (
            userAnswer.topValue === correctAnswer.bottomValue &&
            userAnswer.bottomValue === correctAnswer.topValue
          ) {
            // Reversed answer
            isReversed = true;
            isPartiallyCorrect = true;
          } else if (
            userAnswer.topValue === correctAnswer.topValue ||
            userAnswer.bottomValue === correctAnswer.bottomValue
          ) {
            // Partially correct
            isPartiallyCorrect = true;
          }
        }
      }
    });

    score = Math.round((correctCount / test.questions.length) * 100);

    const result = {
      success: true,
      score,
      totalQuestions: test.questions.length,
      correctAnswers: correctCount,
    };

    return of(result).pipe(delay(1000)); // Simulate network delay
  }

  // Get test results (for the results page)
  getTestResults(
    testId: string,
    candidateId: string = 'current-user'
  ): Observable<any> {
    console.log(`Getting results for test ${testId}, candidate ${candidateId}`);

    const test = this.tests[testId];
    if (!test) {
      return throwError(() => new Error(`Test with ID ${testId} not found`));
    }

    // Generate mock results
    const score = Math.floor(Math.random() * 41) + 60; // Between 60-100
    const timeTaken = Math.floor(test.duration * 60 * 0.8); // 80% of allowed time

    // Create detailed question results
    const questions = test.questions.map((question) => {
      const isCorrect = Math.random() > 0.3; // 70% chance of being correct
      const isPartiallyCorrect = !isCorrect && Math.random() > 0.5;
      const isReversed =
        !isCorrect && !isPartiallyCorrect && Math.random() > 0.7;

      return {
        id: question.id,
        correct: isCorrect,
        userAnswer: isCorrect
          ? {
              topValue: question.correctAnswer.topValue,
              bottomValue: question.correctAnswer.bottomValue,
            }
          : isReversed
          ? {
              topValue: question.correctAnswer.bottomValue,
              bottomValue: question.correctAnswer.topValue,
            }
          : isPartiallyCorrect
          ? {
              topValue: question.correctAnswer.topValue,
              bottomValue: Math.floor(Math.random() * 6) + 1,
            }
          : {
              topValue: Math.floor(Math.random() * 6) + 1,
              bottomValue: Math.floor(Math.random() * 6) + 1,
            },
        correctAnswer: {
          topValue: question.correctAnswer.topValue,
          bottomValue: question.correctAnswer.bottomValue,
        },
        isPartiallyCorrect,
        isReversed,
        timeSpent: Math.floor(Math.random() * 180) + 60, // Between 60-240 seconds
        dominos: question.dominos,
        gridLayout: question.gridLayout,
      };
    });

    const result = {
      testId,
      testName: test.name,
      score,
      totalQuestions: test.questions.length,
      timeSpent: timeTaken, // in seconds
      submittedAt: new Date().toISOString(),
      questions,
    };

    return of(result).pipe(delay(800)); // Simulate network delay
  }

  // Get analytics for a test (for admin)
  getTestAnalytics(testId: string): Observable<any> {
    console.log(`Getting analytics for test ${testId}`);

    const test = this.tests[testId];
    if (!test) {
      return throwError(() => new Error(`Test with ID ${testId} not found`));
    }

    // Generate mock analytics data
    const analytics = {
      testId,
      testName: test.name,
      totalAttempts: Math.floor(Math.random() * 100) + 50, // Between 50-150
      averageScore: Math.floor(Math.random() * 31) + 60, // Between 60-90
      averageTimeSpent: Math.floor(test.duration * 60 * 0.75), // 75% of allowed time
      questionStats: test.questions.map((q) => ({
        questionId: q.id,
        correctRate: Math.floor(Math.random() * 61) + 40, // Between 40-100
        averageTimeSpent: Math.floor(Math.random() * 180) + 60, // Between 60-240 seconds
        partialCorrectRate: Math.floor(Math.random() * 11) + 5, // Between 5-15
        reversedAnswerRate: Math.floor(Math.random() * 6) + 1, // Between 1-6
      })),
      recentSubmissions: [
        {
          candidateId: 'user1',
          candidateName: 'John Smith',
          score: 85,
          timeSpent: 1250,
          submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          candidateId: 'user2',
          candidateName: 'Emma Wilson',
          score: 92,
          timeSpent: 1100,
          submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        {
          candidateId: 'user3',
          candidateName: 'Michael Brown',
          score: 64,
          timeSpent: 1500,
          submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        {
          candidateId: 'user4',
          candidateName: 'Sarah Davis',
          score: 72,
          timeSpent: 1400,
          submittedAt: new Date().toISOString(),
        },
        {
          candidateId: 'user5',
          candidateName: 'James Johnson',
          score: 78,
          timeSpent: 1350,
          submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        },
      ],
    };

    return of(analytics).pipe(delay(900)); // Simulate network delay
  }

  // Save test progress (mainly handled in localStorage by the service)
  saveProgress(testId: string, progress: any): Observable<any> {
    console.log(`Saving progress for test ${testId}:`, progress);
    return of({ success: true }).pipe(delay(300));
  }
}
