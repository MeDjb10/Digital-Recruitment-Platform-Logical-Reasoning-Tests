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
  lastActivityAt?: Date; // Added to match backend
  aiClassification?: {
    prediction: string | null;
    confidence: number | null;
    classifiedAt: Date | null;
  };
  manualClassification?: {
    classification: string | null;
    classifiedBy: string | null;
    classifiedAt: Date | null;
  };
  psychologistComment?: {
    comment: string | null;
    commentedBy: string | null;
    commentedAt: Date | null;
  };
  aiComment?: {
    comment: string | null;
    commentedAt: Date | null;
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
  // New field for V/F/?/X answers
  propositionResponses?: {
    propositionIndex: number;
    candidateEvaluation: 'V' | 'F' | '?' | 'X';
    isCorrect?: boolean; // Optional: if backend sends individual correctness
  }[];
  // Removed: selectedOptions
  isCorrect: boolean; // Overall correctness for the question
  isReversed: boolean; // Primarily for Domino
  isHalfCorrect: boolean; // Primarily for Domino
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
    attempt: {
      // Updated to match TestAttempt structure more closely
      _id: string;
      testId: string;
      testName: string; // Populated from testId
      candidateId: string;
      startTime: Date;
      endTime: Date;
      timeSpent: number;
      status: 'in-progress' | 'completed' | 'timed-out' | 'abandoned';
      score: number;
      percentageScore: number;
      metrics: {
        questionsAnswered: number;
        questionsSkipped: number;
        answerChanges: number;
        flaggedQuestions: number;
        visitCounts?: Record<string, number>;
        timePerQuestion?: Record<string, number>;
      };
      device?: string;
      browser?: string;
      ipAddress?: string;
      aiClassification?: {
        prediction: string | null;
        confidence: number | null;
        classifiedAt: Date | null;
      };
      manualClassification?: {
        classification: string | null;
        classifiedBy: string | null;
        classifiedAt: Date | null;
      };
      psychologistComment?: {
        comment: string | null;
        commentedBy: string | null;
        commentedAt: Date | null;
      };
      aiComment?: {
        comment: string | null;
        commentedAt: Date | null;
      };
    };
    questions: {
      question: {
        _id: string; // Use _id
        title?: string;
        instruction: string;
        questionNumber: number;
        questionType: string;
        difficulty: string;
      };
      response?: {
        _id: string; // Add response ID
        dominoAnswer?: {
          dominoId: number;
          topValue: number | null;
          bottomValue: number | null;
        };
        // Add propositionResponses
        propositionResponses?: {
          propositionIndex: number;
          candidateEvaluation: 'V' | 'F' | '?' | 'X';
          isCorrect?: boolean;
        }[];
        // Removed: selectedOptions
        isCorrect: boolean; // Overall question correctness
        isHalfCorrect: boolean; // Domino specific
        isReversed: boolean; // Domino specific
        isSkipped: boolean;
        isFlagged: boolean; // Added
        timeSpent: number;
        visitCount: number;
        answeredAt?: Date; // Added
        answerChanges: number; // Added
      };
      correctAnswer: any; // Keep as any or define specific structures per type
      // Example structure for MultipleChoiceQuestion correctAnswer:
      // correctAnswer: {
      //   propositions: { text: string; correctEvaluation: 'V' | 'F' | '?' }[];
      // } | { dominoId: number; topValue: number | null; bottomValue: number | null };
    }[];
  };
}
