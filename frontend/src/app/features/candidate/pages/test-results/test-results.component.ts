import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DominoTestService } from '../../services/domino-test.service';
import {
  InteractiveDominoGridComponent,
  DominoPosition,
} from '../../components/interactive-domino-grid/interactive-domino-grid.component';

interface TestResult {
  testId: string;
  testName: string;
  score: number;
  totalQuestions: number;
  timeSpent: number;
  submittedAt: string;
  questions: QuestionResult[];
}

interface QuestionResult {
  id: number;
  correct: boolean;
  userAnswer: {
    topValue: number | null;
    bottomValue: number | null;
  };
  correctAnswer: {
    topValue: number;
    bottomValue: number;
  };
  timeSpent: number;
  isPartiallyCorrect?: boolean;
  isReversed?: boolean;
  dominos: DominoPosition[];
  gridLayout: { rows: number; cols: number };
}

@Component({
  selector: 'app-test-results',
  standalone: true,
  imports: [CommonModule, RouterModule, InteractiveDominoGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="results-container">
      <div class="results-header">
        <div class="back-button" (click)="goBack()"><span>←</span> Back</div>
        <h1>{{ testResult?.testName || 'Test Results' }}</h1>
        <div class="score-badge">{{ testResult?.score || 0 }}%</div>
      </div>

      <div class="results-summary">
        <div class="summary-item">
          <div class="label">Date</div>
          <div class="value">{{ formatDate(testResult?.submittedAt) }}</div>
        </div>
        <div class="summary-item">
          <div class="label">Time Spent</div>
          <div class="value">{{ formatTime(testResult?.timeSpent) }}</div>
        </div>
        <div class="summary-item">
          <div class="label">Questions</div>
          <div class="value">{{ testResult?.totalQuestions || 0 }}</div>
        </div>
        <div class="summary-item">
          <div class="label">Correct</div>
          <div class="value">
            {{ correctCount }}/{{ testResult?.totalQuestions || 0 }}
          </div>
        </div>
      </div>

      <div class="results-questions">
        <h2>Question Details</h2>

        <div class="question-filters">
          <button
            class="filter-btn"
            [class.active]="filter === 'all'"
            (click)="setFilter('all')"
          >
            All
          </button>
          <button
            class="filter-btn"
            [class.active]="filter === 'correct'"
            (click)="setFilter('correct')"
          >
            Correct
          </button>
          <button
            class="filter-btn"
            [class.active]="filter === 'incorrect'"
            (click)="setFilter('incorrect')"
          >
            Incorrect
          </button>
        </div>

        <div class="questions-list">
          <div
            *ngFor="let question of filteredQuestions; let i = index"
            class="question-item"
            [class.correct]="question.correct"
            [class.incorrect]="!question.correct"
          >
            <div class="question-header">
              <h3>Question {{ i + 1 }}</h3>
              <div
                class="status-badge"
                [class.correct-badge]="question.correct"
                [class.incorrect-badge]="!question.correct"
              >
                {{ question.correct ? 'Correct' : 'Incorrect' }}
                <span *ngIf="question.isPartiallyCorrect"
                  >(Partially Correct)</span
                >
                <span *ngIf="question.isReversed">(Reversed)</span>
              </div>
              <div class="time-spent">
                Time: {{ formatTime(question.timeSpent) }}
              </div>
            </div>

            <div class="question-grid">
              <app-interactive-domino-grid
                [dominos]="question.dominos"
                [gridSize]="question.gridLayout"
                [showGridLines]="false"
              ></app-interactive-domino-grid>
            </div>

            <div class="answer-comparison">
              <div class="answer-section">
                <h4>Your Answer</h4>
                <div class="domino-value">
                  <div class="domino-half">
                    Top: {{ question.userAnswer.topValue ?? 'None' }}
                  </div>
                  <div class="domino-half">
                    Bottom: {{ question.userAnswer.bottomValue ?? 'None' }}
                  </div>
                </div>
              </div>

              <div class="answer-section">
                <h4>Correct Answer</h4>
                <div class="domino-value">
                  <div class="domino-half">
                    Top: {{ question.correctAnswer.topValue }}
                  </div>
                  <div class="domino-half">
                    Bottom: {{ question.correctAnswer.bottomValue }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .results-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 30px 20px;
      }

      .results-header {
        display: flex;
        align-items: center;
        margin-bottom: 30px;
        position: relative;
      }

      .back-button {
        position: absolute;
        left: 0;
        display: inline-flex;
        align-items: center;
        padding: 8px 16px;
        background-color: #f1f5f9;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .back-button:hover {
        background-color: #e2e8f0;
      }

      .back-button span {
        margin-right: 6px;
        font-size: 18px;
      }

      .results-header h1 {
        flex: 1;
        font-size: 28px;
        font-weight: 700;
        margin: 0;
        text-align: center;
      }

      .score-badge {
        background-color: #3b82f6;
        color: white;
        border-radius: 12px;
        padding: 8px 16px;
        font-size: 18px;
        font-weight: 600;
      }

      .results-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }

      .summary-item {
        background-color: white;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }

      .label {
        color: #64748b;
        font-size: 14px;
        margin-bottom: 5px;
      }

      .value {
        font-size: 24px;
        font-weight: 600;
        color: #1e293b;
      }

      .results-questions {
        background-color: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      }

      .results-questions h2 {
        margin: 0 0 20px;
        font-size: 24px;
      }

      .question-filters {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }

      .filter-btn {
        padding: 8px 16px;
        border-radius: 20px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
      }

      .filter-btn.active {
        background-color: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .questions-list {
        display: flex;
        flex-direction: column;
        gap: 30px;
      }

      .question-item {
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }

      .question-header {
        display: flex;
        align-items: center;
        padding: 15px;
        background-color: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }

      .question-header h3 {
        margin: 0;
        font-size: 18px;
        flex: 1;
      }

      .status-badge {
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 14px;
        font-weight: 500;
        margin-right: 15px;
      }

      .correct-badge {
        background-color: #dcfce7;
        color: #15803d;
      }

      .incorrect-badge {
        background-color: #fee2e2;
        color: #b91c1c;
      }

      .time-spent {
        font-size: 14px;
        color: #64748b;
      }

      .question-grid {
        padding: 20px;
        display: flex;
        justify-content: center;
        background-color: #f8fafc;
      }

      .answer-comparison {
        display: flex;
        border-top: 1px solid #e2e8f0;
      }

      .answer-section {
        flex: 1;
        padding: 15px;
        text-align: center;
      }

      .answer-section:first-child {
        border-right: 1px solid #e2e8f0;
      }

      .answer-section h4 {
        margin: 0 0 10px;
        font-size: 16px;
        color: #64748b;
      }

      .domino-value {
        font-size: 18px;
        font-weight: 600;
      }

      .domino-half {
        margin: 5px 0;
      }

      .question-item.correct .question-header {
        background-color: #f0fdf4;
      }

      .question-item.incorrect .question-header {
        background-color: #fef2f2;
      }

      @media (max-width: 768px) {
        .results-header {
          flex-direction: column;
          gap: 20px;
          margin-top: 50px;
        }

        .back-button {
          top: -40px;
          left: 0;
          position: absolute;
        }

        .answer-comparison {
          flex-direction: column;
        }

        .answer-section:first-child {
          border-right: none;
          border-bottom: 1px solid #e2e8f0;
        }
      }
    `,
  ],
})
export class TestResultsComponent implements OnInit {
  testId: string = '';
  testResult: TestResult | null = null;
  filter: 'all' | 'correct' | 'incorrect' = 'all';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dominoTestService: DominoTestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.testId = params['id'];
      this.loadTestResults();
    });
  }

  loadTestResults() {
    this.dominoTestService.getTestAnalytics(this.testId).subscribe({
      next: (result) => {
        if (result) {
          this.testResult = result;
          this.cdr.markForCheck();
        } else {
          // If there's no data, create mock results for demo
          this.createMockResults();
        }
      },
      error: () => {
        // On error, create mock results
        this.createMockResults();
      },
    });
  }

  createMockResults() {
    this.testResult = {
      testId: this.testId,
      testName:
        this.testId === 'd70'
          ? 'Logical Reasoning Test (D-70)'
          : 'Logical Reasoning Test',
      score: 75,
      totalQuestions: 5,
      timeSpent: 1200, // 20 minutes
      submittedAt: new Date().toISOString(),
      questions: [
        {
          id: 1,
          correct: true,
          userAnswer: { topValue: 6, bottomValue: 1 },
          correctAnswer: { topValue: 6, bottomValue: 1 },
          timeSpent: 120,
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
              topValue: 6,
              bottomValue: 1,
              isEditable: false,
            },
          ],
          gridLayout: { rows: 1, cols: 6 },
        },
        {
          id: 2,
          correct: false,
          userAnswer: { topValue: 1, bottomValue: 3 },
          correctAnswer: { topValue: 3, bottomValue: 1 },
          isReversed: true,
          timeSpent: 200,
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
              topValue: 1,
              bottomValue: 3,
              isEditable: false,
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
        },
        {
          id: 3,
          correct: false,
          userAnswer: { topValue: 2, bottomValue: 4 },
          correctAnswer: { topValue: 5, bottomValue: 2 },
          isPartiallyCorrect: true, // Got bottom value in top position
          timeSpent: 180,
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
              topValue: 2,
              bottomValue: 4,
              isEditable: false,
            },
          ],
          gridLayout: { rows: 3, cols: 3 },
        },
        {
          id: 4,
          correct: true,
          userAnswer: { topValue: 4, bottomValue: 4 },
          correctAnswer: { topValue: 4, bottomValue: 4 },
          timeSpent: 150,
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
              row: 1,
              col: 1,
              topValue: 4,
              bottomValue: 4,
              isEditable: false,
            },
          ],
          gridLayout: { rows: 2, cols: 3 },
        },
        {
          id: 5,
          correct: true,
          userAnswer: { topValue: 2, bottomValue: 2 },
          correctAnswer: { topValue: 2, bottomValue: 2 },
          timeSpent: 210,
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
              topValue: 3,
              bottomValue: 2,
              isEditable: false,
            },
          ],
          gridLayout: { rows: 2, cols: 2 },
        },
      ],
    };
    this.cdr.markForCheck();
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  formatTime(seconds?: number): string {
    if (seconds === undefined) return 'N/A';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m ${secs}s`;
    }

    return `${mins}m ${secs}s`;
  }

  setFilter(filter: 'all' | 'correct' | 'incorrect') {
    this.filter = filter;
    this.cdr.markForCheck();
  }

  goBack() {
    this.router.navigate(['/test-completion']);
  }

  get correctCount(): number {
    if (!this.testResult) return 0;
    return this.testResult.questions.filter((q) => q.correct).length;
  }

  get filteredQuestions(): QuestionResult[] {
    if (!this.testResult) return [];

    switch (this.filter) {
      case 'correct':
        return this.testResult.questions.filter((q) => q.correct);
      case 'incorrect':
        return this.testResult.questions.filter((q) => !q.correct);
      default:
        return this.testResult.questions;
    }
  }
}
