export interface TestData {
  id: string;
  name: string;
  description: string;
  duration: number;
  questions: TestQuestion[];
}

export interface DominoPosition {
  id: number;
  row: number;
  col: number;
  topValue: number | null;
  bottomValue: number | null;
  isEditable: boolean;
  isVertical?: boolean;
  color?: string;
  questionId?: number;
  uniqueId?: string;
  exactX?: number;
  exactY?: number;
  angle?: number;
  scale?: number;
  connectsTo?: number[];
}

export interface DominoChange {
  id: number;
  topValue: number | null;
  bottomValue: number | null;
  isVertical?: boolean;
}

// Add this new interface for arrows
export interface ArrowPosition {
  id: number;
  row?: number;
  col?: number;
  exactX: number;
  exactY: number;
  angle: number;
  uniqueId: string;
  scale: number;
  length: number;
  arrowColor: string;
  headSize: number;
  curved: boolean;
  curvature: number;
}

// Add questionType and propositions to the TestQuestion interface if they don't exist
export interface TestQuestion {
  id: number;
  questionType: 'DominoQuestion' | 'MultipleChoiceQuestion'; // Add this line
  title: string;
  instruction: string;
  dominos: DominoPosition[];
  arrows: ArrowPosition[];
  gridLayout: { rows: number; cols: number; width?: number; height?: number };
  propositions?: Proposition[]; // Add this line
  correctAnswer?: any; // Keep generic or use a union type
  answered: boolean;
  flaggedForReview: boolean;
  visited: boolean;
  pattern?: string;
  layoutType?: string;
  userAnswer?: any; // Keep generic or use a union type
  questionNumber: number;
}

// Add Proposition interface if it doesn't exist
export interface Proposition {
  text: string;
  correctEvaluation: 'V' | 'F' | '?';
  // Add any other relevant fields from the backend model if needed
}

// Define the structure for proposition responses
export interface PropositionResponse {
  propositionIndex: number;
  candidateEvaluation: 'V' | 'F' | '?' | 'X';
}

export interface QuestionInfo {
  id: number;
  visited: boolean;
  answered: boolean;
  flaggedForReview: boolean;
}

export interface TestResult {
  testId: string;
  score: number;
  totalQuestions: number;
  completionTime: number;
  answers: {
    questionId: number;
    correct: boolean;
    userAnswer?: {
      topValue: number | null;
      bottomValue: number | null;
      dominoId: number;
    };
    correctAnswer?: {
      topValue: number | null;
      bottomValue: number | null;
      dominoId: number;
    };
  }[];
}

// Add these new interfaces to your existing models file

export interface UserActionEvent {
  action: string; // Type of action: 'question_visit', 'question_answer', 'test_start', etc.
  target: string; // Target of the action: question ID, test ID, etc.
  timestamp: Date;
  data?: any; // Additional data about the action
}

export interface UserTestMetrics {
  testId: string;
  startTime: Date;
  totalTimeSpent: number; // in milliseconds
  questionsAnswered: number;
  questionsSkipped: number;
  answerChanges: number; // How many times the user changed their answers
  flaggedQuestions: number;
  visitCounts: { [questionId: number]: number }; // How many times each question was visited
  timePerQuestion: { [questionId: number]: number }; // Time spent on each question (ms)
  lastQuestionStartTime: Date | null; // When user started viewing current question
  currentQuestionId: number | null; // Which question user is currently viewing
  questionStartTimes: { [questionId: number]: Date }; // When each question was first visited
}

export interface TestAnalytics {
  testId: string;
  testName: string;
  totalAttempts: number;
  averageScore: number;
  averageTimeSpent: number; // in seconds
  completionRate: number; // percentage of users who finished the test
  questionStats: QuestionAnalytics[];
}

export interface QuestionAnalytics {
  questionId: number;
  correctAnswerRate: number; // percentage
  halfCorrectRate: number; // percentage
  reversedAnswerRate: number; // percentage
  averageTimeSpent: number; // in seconds
  skipRate: number; // percentage
  visitCountAverage: number; // average visits per candidate
}

export interface QuestionResultDetail {
  questionId: number;
  userAnswer: {
    topValue: number | null;
    bottomValue: number | null;
  };
  correctAnswer: {
    topValue: number | null;
    bottomValue: number | null;
  };
  isCorrect: boolean;
  isReversed: boolean;
  isHalfCorrect: boolean;
  timeSpent: number; // in milliseconds
  visitCount: number;
  isFlagged: boolean;
}

export interface TestResultDetail extends TestResult {
  candidateId: string;
  candidateName: string;
  questionDetails: QuestionResultDetail[];
  testMetrics: UserTestMetrics;
  actions: UserActionEvent[];
  // Additional fields for detailed reporting
  completedQuestions: number;
  totalQuestions: number;
  timeoutReached: boolean;
  timeRemaining: number; // in seconds (negative if timeout)
}
