export interface TestAttempt {
  _id: string;
  testId: string;
  candidateId: string;
  startTime: Date;
  endTime?: Date;
  status: 'in-progress' | 'completed' | 'timed-out' | 'abandoned';
  score: number;
  percentageScore: number;
  timeSpent?: number;
  device?: string;
  browser?: string;
  metrics: {
    questionsAnswered: number;
    questionsSkipped: number;
    answerChanges: number;
    flaggedQuestions: number;
    visitCounts?: Record<string, number>;
    timePerQuestion?: Record<string, number>;
  };
}

export interface QuestionResponse {
  _id: string;
  attemptId: string;
  questionId: string;
  candidateId: string;
  dominoAnswer?: {
    dominoId: number;
    topValue: number | null;
    bottomValue: number | null;
  };
  selectedOptions?: number[];
  isCorrect: boolean;
  isReversed: boolean;
  isHalfCorrect: boolean;
  timeSpent: number;
  visitCount: number;
  isFlagged: boolean;
  isSkipped: boolean;
  answerChanges: number;
  firstVisitAt?: Date;
  lastVisitAt?: Date;
  answeredAt?: Date;
  events?: {
    eventType: 'visit' | 'answer' | 'change' | 'flag' | 'unflag' | 'skip';
    timestamp: Date;
    data?: any;
  }[];
}

export interface AttemptResponse {
  success: boolean;
  data: TestAttempt;
}

export interface AttemptsResponse {
  success: boolean;
  count: number;
  data: TestAttempt[];
}

export interface AttemptQuestionsResponse {
  success: boolean;
  data: {
    attempt: TestAttempt;
    questions: any[]; // Using any for now as it's a mix of questions with responses
  };
}

export interface AttemptResultsResponse {
  success: boolean;
  data: {
    attemptId: string;
    testId: string;
    testName: string;
    candidateId: string;
    startTime: Date;
    endTime: Date;
    timeSpent: number;
    score: number;
    percentageScore: number;
    metrics: {
      totalQuestions: number;
      correctCount: number;
      halfCorrectCount: number;
      reversedCount: number;
      skippedCount: number;
      averageTimePerQuestion: number;
    };
    questions: {
      question: {
        id: string;
        title?: string;
        instruction: string;
        questionNumber: number;
        questionType: string;
        difficulty: string;
      };
      response?: {
        dominoAnswer?: {
          dominoId: number;
          topValue: number | null;
          bottomValue: number | null;
        };
        selectedOptions?: number[];
        isCorrect: boolean;
        isHalfCorrect: boolean;
        isReversed: boolean;
        isSkipped: boolean;
        timeSpent: number;
        visitCount: number;
      };
      correctAnswer: any;
    }[];
  };
}
