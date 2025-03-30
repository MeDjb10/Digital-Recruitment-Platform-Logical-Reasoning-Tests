import { DominoPosition, ArrowPosition } from './domino.model';

// Base interface for all questions
export interface Question {
  _id: string;
  testId: string;
  title?: string;
  instruction: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  isActive: boolean;
  questionNumber: number;
  questionType: 'DominoQuestion' | 'MultipleChoiceQuestion';
  createdAt: Date;
  updatedAt: Date;
}

// Domino specific question
export interface DominoQuestion extends Question {
  questionType: 'DominoQuestion';
  pattern?: string;
  layoutType:
    | 'row'
    | 'grid'
    | 'rhombus'
    | 'custom'
    | 'rhombus-large'
    | 'spiral';
  dominos: DominoPosition[];
  arrows?: ArrowPosition[];
  gridLayout?: {
    rows: number;
    cols: number;
    width?: number;
    height?: number;
  };
  correctAnswer: {
    dominoId: number;
    topValue: number | null;
    bottomValue: number | null;
  } | null;
}

// Multiple choice specific question
export interface MultipleChoiceQuestion extends Question {
  questionType: 'MultipleChoiceQuestion';
  options: {
    text: string;
    isCorrect?: boolean;
  }[];
  correctOptionIndex?: number;
  allowMultipleCorrect: boolean;
  randomizeOptions: boolean;
}

// Response interfaces
export interface QuestionsResponse {
  success: boolean;
  count: number;
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  data: (DominoQuestion | MultipleChoiceQuestion)[];
}

export interface QuestionResponse {
  success: boolean;
  data: DominoQuestion | MultipleChoiceQuestion;
}
