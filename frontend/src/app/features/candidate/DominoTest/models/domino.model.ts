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

export interface TestQuestion {
  id: number;
  title?: string;
  instruction: string;
  dominos: DominoPosition[];
  gridLayout?: { rows: number; cols: number; width?: number; height?: number };
  answered: boolean;
  flaggedForReview: boolean;
  visited: boolean;
  pattern?: string;
  userAnswer?: {
    topValue: number | null;
    bottomValue: number | null;
    dominoId: number;
  };
}

export interface QuestionInfo {
  id: number;
  visited: boolean;
  answered: boolean;
  flaggedForReview: boolean;
}
