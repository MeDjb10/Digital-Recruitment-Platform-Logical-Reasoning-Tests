export interface Test {
  _id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  totalQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string; // e.g., 'logical-reasoning', 'verbal-reasoning'
  type: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  instructions?: string;
  tags?: string[];
  analytics?: {
    // Added analytics field
    attempts: number;
    completionRate: number;
    averageScore: number;
    averageTimeSpent: number;
  };
}

export interface TestsResponse {
  success: boolean;
  data: Test[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface TestResponse {
  success: boolean;
  data: Test;
}
