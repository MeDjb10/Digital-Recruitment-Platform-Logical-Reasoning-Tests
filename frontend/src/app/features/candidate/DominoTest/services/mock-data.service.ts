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
    isVisible?: boolean;
    color?: string;
    exactX?: number;
    exactY?: number;
    angle?: number;
    connectsTo?: number[];
    relatesTo?: number[];
    uniqueId?: string;
  }[];
  gridLayout: { rows: number; cols: number; width?: number; height?: number };
  pattern?: string;
  dominoLayout?: string;
  isCircularPattern?: boolean;
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
    totalQuestions: 10,
    questions: [
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
          bottomValue: 1,
          dominoId: 6,
        },
      },
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
      {
        id: 9,
        instruction:
          'Analyze the large rhombus pattern and find the missing domino values.',
        dominos: [
          {
            id: 1,
            row: 0,
            col: 1,
            topValue: 2,
            bottomValue: 4,
            isEditable: false,
            isVertical: false,
          },
          {
            id: 2,
            row: 0,
            col: 2,
            topValue: 3,
            bottomValue: 1,
            isEditable: false,
          },
          {
            id: 3,
            row: 1,
            col: 0,
            topValue: 5,
            bottomValue: 2,
            isEditable: false,
            isVertical: true,
          },
          {
            id: 4,
            row: 1,
            col: 3,
            topValue: 1,
            bottomValue: 5,
            isEditable: false,
            isVertical: true,
          },
          {
            id: 5,
            row: 2,
            col: 0,
            topValue: 6,
            bottomValue: 3,
            isEditable: false,
            isVertical: true,
          },
          {
            id: 6,
            row: 2,
            col: 3,
            topValue: 4,
            bottomValue: 6,
            isEditable: false,
            isVertical: true,
          },
          {
            id: 7,
            row: 3,
            col: 1,
            topValue: 6,
            bottomValue: 2,
            isEditable: false,
          },
          {
            id: 8,
            row: 3,
            col: 2,
            topValue: null,
            bottomValue: null,
            isEditable: true,
          },
        ],
        gridLayout: { rows: 4, cols: 4 },
        pattern:
          'Large rhombus pattern with vertical dominos in columns 1 and 4',
        correctAnswer: {
          topValue: 5,
          bottomValue: 4,
          dominoId: 8,
        },
      },
      {
        id: 10,
        instruction:
          'Find the missing values for the domino that best completes the spiral pattern.',
        dominos: [
          // Domino 1: Starting point of the spiral (center)
          {
            id: 1,
            row: 2,
            col: 2,
            topValue: 3,
            bottomValue: 2,
            isEditable: false,
            exactX: 350, // Center position
            exactY: 250, // Center position
            angle: 90,
            connectsTo: [2],
            uniqueId: 'spiral-domino-1',
          },
          // Domino 2: First turn of spiral (below domino 1)
          {
            id: 2,
            row: 3,
            col: 2,
            topValue: 2,
            bottomValue: 4,
            isEditable: false,
            exactX: 210, // Same X as domino 1
            exactY: 400, // Increased spacing from domino 1 (was 350)
            angle: 80,
            connectsTo: [3],
            uniqueId: 'spiral-domino-2',
          },
          // Domino 3: Second turn of spiral (left of domino 2)
          {
            id: 3,
            row: 3,
            col: 1,
            topValue: 5,
            bottomValue: 3,
            isEditable: false,
            exactX: 20, // More left spacing from domino 2 (was 250)
            exactY: 350, // Same Y as domino 2
            angle: -40,
            connectsTo: [4],
            uniqueId: 'spiral-domino-3',
          },
          // Domino 4: Third turn of spiral (above domino 3)
          {
            id: 4,
            row: 2,
            col: 1,
            topValue: 6,
            bottomValue: 2,
            isEditable: false,
            exactX: 10, // Same X as domino 3
            exactY: 140, // Further up from center (was 150)
            angle: 10,
            connectsTo: [5],
            uniqueId: 'spiral-domino-4',
          },
          // Domino 5: Fourth turn of spiral (right of domino 4)
          {
            id: 5,
            row: 2,
            col: 3,
            topValue: 1,
            bottomValue: 5,
            isEditable: false,
            exactX: 140, // Further right (was 450)
            exactY: 10, // Same Y as domino 4
            angle: 90,
            connectsTo: [6],
            uniqueId: 'spiral-domino-5',
          },
          // Domino 6: Fifth turn of spiral (below domino 5, right of domino 1)
          {
            id: 6,
            row: 3,
            col: 3,
            topValue: 4,
            bottomValue: 6,
            isEditable: false,
            exactX: 480, // Same X as domino 5
            exactY: 250, // Same Y as domino 1
            angle: -30,
            connectsTo: [7],
            uniqueId: 'spiral-domino-6',
          },
          // Domino 7 (Editable): Final piece of spiral (below and right of domino 6)
          {
            id: 7,
            row: 4,
            col: 3,
            topValue: null,
            bottomValue: null,
            isEditable: true,
            exactX: 280, // Same X as domino 6
            exactY: 500, // Much lower than domino 6 (was 450)
            angle: 0,
            connectsTo: [],
            uniqueId: 'spiral-domino-7',
          },
        ],
        gridLayout: { rows: 4, cols: 4 },
        dominoLayout: 'spiral',
        isCircularPattern: true,
        pattern:
          'Spiral pattern of dominos with increasing size as the path progresses',
        correctAnswer: {
          topValue: 4,
          bottomValue: 2,
          dominoId: 7,
        },
      },
    ],
  };

  private d200Test: MockDominoTest = {
    id: 'd200',
    name: 'Advanced Logical Reasoning Test (D-200)',
    description: 'An advanced test with complex domino patterns',
    duration: 30,
    totalQuestions: 5,
    questions: [
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
    ],
  };

  private tests: { [key: string]: MockDominoTest } = {
    d70: this.d70Test,
    d200: this.d200Test,
  };

  constructor() {
    this.loadCustomD70Questions();
  }

  getAvailableTests(): Observable<any[]> {
    const testList = Object.values(this.tests).map((test) => ({
      id: test.id,
      name: test.name,
      description: test.description,
      duration: test.duration,
      totalQuestions: test.totalQuestions,
    }));

    return of(testList).pipe(delay(500));
  }

  getTest(testId: string): Observable<any> {
      if (testId === 'd70-enhanced') {
        return of(this.getD70TestData()).pipe(delay(300));
      }
    const test = this.tests[testId];

    if (!test) {
      return throwError(() => new Error(`Test with ID ${testId} not found`));
    }

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

    return of(clientTest).pipe(delay(700));
  }

  submitTest(testId: string, answers: any[]): Observable<any> {
    console.log(`Submitting test ${testId} with answers:`, answers);

    const test = this.tests[testId];
    if (!test) {
      return throwError(() => new Error(`Test with ID ${testId} not found`));
    }

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
            isReversed = true;
            isPartiallyCorrect = true;
          } else if (
            userAnswer.topValue === correctAnswer.topValue ||
            userAnswer.bottomValue === correctAnswer.bottomValue
          ) {
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

    return of(result).pipe(delay(1000));
  }

  // Add this method to your MockDataService
  public getD70TestData(): MockDominoTest {
  return this.d70Test;
}

  getTestResults(
    testId: string,
    candidateId: string = 'current-user'
  ): Observable<any> {
    console.log(`Getting results for test ${testId}, candidate ${candidateId}`);

    const test = this.tests[testId];
    if (!test) {
      return throwError(() => new Error(`Test with ID ${testId} not found`));
    }

    const score = Math.floor(Math.random() * 41) + 60;
    const timeTaken = Math.floor(test.duration * 60 * 0.8);

    const questions = test.questions.map((question) => {
      const isCorrect = Math.random() > 0.3;
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
        timeSpent: Math.floor(Math.random() * 180) + 60,
        dominos: question.dominos,
        gridLayout: question.gridLayout,
      };
    });

    const result = {
      testId,
      testName: test.name,
      score,
      totalQuestions: test.questions.length,
      timeSpent: timeTaken,
      submittedAt: new Date().toISOString(),
      questions,
    };

    return of(result).pipe(delay(800));
  }

  // Add this method to load custom questions
  private loadCustomD70Questions(): void {
    try {
      const storageKey = 'customD70Questions';
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const customQuestions = JSON.parse(stored);

        // Only add if we have questions and the D70 test exists
        if (customQuestions && customQuestions.length > 0 && this.d70Test) {
          // Get the highest question ID to ensure no conflicts
          const highestId = Math.max(
            ...this.d70Test.questions.map((q) => q.id)
          );

          // Add each custom question with an updated ID
          customQuestions.forEach((question: any, index: number) => {
            // Ensure the ID is unique
            question.id = highestId + index + 1;

            // Add to the questions array
            this.d70Test.questions.push(question);
          });

          // Update the total questions count
          this.d70Test.totalQuestions = this.d70Test.questions.length;

          console.log(
            `Loaded ${customQuestions.length} custom questions into D70 test`
          );
        }
      }
    } catch (error) {
      console.error('Error loading custom D70 questions:', error);
    }
  }

  // Add method to clear custom questions (useful for testing)
  public clearCustomD70Questions(): void {
    localStorage.removeItem('customD70Questions');
    console.log('Custom D70 questions cleared from localStorage');

    // Reset the questions array to the original questions
    // You'd need to have a backup of the original questions
    // For now, we'll just reload the page to reset the service
    window.location.reload();
  }

  getTestAnalytics(testId: string): Observable<any> {
    console.log(`Getting analytics for test ${testId}`);

    const test = this.tests[testId];
    if (!test) {
      return throwError(() => new Error(`Test with ID ${testId} not found`));
    }

    const analytics = {
      testId,
      testName: test.name,
      totalAttempts: Math.floor(Math.random() * 100) + 50,
      averageScore: Math.floor(Math.random() * 31) + 60,
      averageTimeSpent: Math.floor(test.duration * 60 * 0.75),
      questionStats: test.questions.map((q) => ({
        questionId: q.id,
        correctRate: Math.floor(Math.random() * 61) + 40,
        averageTimeSpent: Math.floor(Math.random() * 180) + 60,
        partialCorrectRate: Math.floor(Math.random() * 11) + 5,
        reversedAnswerRate: Math.floor(Math.random() * 6) + 1,
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

    return of(analytics).pipe(delay(900));
  }

  saveProgress(testId: string, progress: any): Observable<any> {
    console.log(`Saving progress for test ${testId}:`, progress);
    return of({ success: true }).pipe(delay(300));
  }
}
