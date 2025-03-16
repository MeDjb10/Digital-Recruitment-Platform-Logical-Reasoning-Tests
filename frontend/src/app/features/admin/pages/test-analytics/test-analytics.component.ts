import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DominoTestService } from '../../../candidate/services/domino-test.service';

interface TestAnalytics {
  testId: string;
  testName: string;
  totalAttempts: number;
  averageScore: number;
  averageTimeSpent: number;
  questionStats: QuestionStat[];
  recentSubmissions: Submission[];
}

interface QuestionStat {
  questionId: number;
  correctRate: number;
  averageTimeSpent: number;
  partialCorrectRate: number;
  reversedAnswerRate: number;
}

interface Submission {
  candidateId: string;
  candidateName: string;
  score: number;
  timeSpent: number;
  submittedAt: string;
}

@Component({
  selector: 'app-test-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="analytics-container">
      <header class="analytics-header">
        <h1>{{ analytics?.testName || 'Test Analytics' }}</h1>
        <div class="actions">
          <button class="btn" routerLink="/dashboard/tests">
            Back to Tests
          </button>
          <button class="btn btn-primary" (click)="exportData()">
            Export Data
          </button>
        </div>
      </header>

      <div class="analytics-summary">
        <div class="summary-card">
          <div class="card-title">Attempts</div>
          <div class="card-value">{{ analytics?.totalAttempts || 0 }}</div>
        </div>
        <div class="summary-card">
          <div class="card-title">Average Score</div>
          <div class="card-value">
            {{ analytics?.averageScore || 0 | number : '1.1-1' }}%
          </div>
        </div>
        <div class="summary-card">
          <div class="card-title">Average Time</div>
          <div class="card-value">
            {{ formatTime(analytics?.averageTimeSpent) }}
          </div>
        </div>
      </div>

      <div class="analytics-charts">
        <div class="chart-container">
          <h2>Question Performance</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Correct Rate</th>
                <th>Avg Time</th>
                <th>Partial Correct</th>
                <th>Reversed Answers</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let stat of analytics?.questionStats">
                <td>Question {{ stat.questionId }}</td>
                <td>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      [style.width.%]="stat.correctRate"
                    ></div>
                    <span>{{ stat.correctRate }}%</span>
                  </div>
                </td>
                <td>{{ formatTime(stat.averageTimeSpent) }}</td>
                <td>{{ stat.partialCorrectRate }}%</td>
                <td>{{ stat.reversedAnswerRate }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="recent-submissions">
        <h2>Recent Submissions</h2>
        <div class="submissions-filter">
          <div class="search-box">
            <input
              type="text"
              placeholder="Search by name"
              [(ngModel)]="searchTerm"
              (input)="filterSubmissions()"
            />
          </div>
          <div class="sort-options">
            <label>Sort by: </label>
            <select [(ngModel)]="sortOption" (change)="sortSubmissions()">
              <option value="date">Date (newest)</option>
              <option value="score-high">Score (highest)</option>
              <option value="score-low">Score (lowest)</option>
              <option value="time-fast">Time (fastest)</option>
              <option value="time-slow">Time (slowest)</option>
            </select>
          </div>
        </div>

        <table class="data-table submissions-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Score</th>
              <th>Time Spent</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let submission of filteredSubmissions">
              <td>{{ submission.candidateName }}</td>
              <td>
                <span
                  [class.high-score]="submission.score >= 80"
                  [class.medium-score]="
                    submission.score >= 60 && submission.score < 80
                  "
                  [class.low-score]="submission.score < 60"
                >
                  {{ submission.score }}%
                </span>
              </td>
              <td>{{ formatTime(submission.timeSpent) }}</td>
              <td>{{ formatDate(submission.submittedAt) }}</td>
              <td>
                <button
                  class="btn btn-small"
                  [routerLink]="[
                    '/admin/submissions',
                    analytics?.testId,
                    submission.candidateId
                  ]"
                >
                  View Details
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredSubmissions.length === 0">
              <td colspan="5" class="no-results">No submissions found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .analytics-container {
        padding: 30px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .analytics-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
      }

      .analytics-header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
      }

      .actions {
        display: flex;
        gap: 15px;
      }

      .btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid #e2e8f0;
        background-color: white;
        color: #64748b;
        transition: all 0.2s;
      }

      .btn:hover {
        background-color: #f8fafc;
        border-color: #cbd5e1;
      }

      .btn-primary {
        background-color: #3b82f6;
        border-color: #3b82f6;
        color: white;
      }

      .btn-primary:hover {
        background-color: #2563eb;
        border-color: #2563eb;
      }

      .btn-small {
        padding: 5px 10px;
        font-size: 14px;
      }

      .analytics-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }

      .summary-card {
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }

      .card-title {
        font-size: 14px;
        color: #64748b;
        margin-bottom: 10px;
      }

      .card-value {
        font-size: 36px;
        font-weight: 700;
        color: #1e293b;
      }

      .analytics-charts,
      .recent-submissions {
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 30px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }

      h2 {
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 20px;
        color: #1e293b;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
      }

      .data-table th {
        text-align: left;
        padding: 12px 15px;
        background-color: #f8fafc;
        color: #475569;
        font-weight: 500;
        border-bottom: 1px solid #e2e8f0;
      }

      .data-table td {
        padding: 12px 15px;
        border-bottom: 1px solid #e2e8f0;
        color: #1e293b;
      }

      .progress-bar {
        height: 24px;
        background-color: #f1f5f9;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        background-color: #3b82f6;
        position: absolute;
        top: 0;
        left: 0;
      }

      .progress-bar span {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #1e293b;
        font-weight: 500;
        font-size: 14px;
      }

      .submissions-filter {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
      }

      .search-box input {
        padding: 10px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        width: 250px;
      }

      .sort-options {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .sort-options select {
        padding: 8px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        background-color: white;
      }

      .high-score {
        color: #15803d;
        font-weight: 600;
      }

      .medium-score {
        color: #ca8a04;
        font-weight: 600;
      }

      .low-score {
        color: #dc2626;
        font-weight: 600;
      }

      .no-results {
        text-align: center;
        color: #64748b;
        font-style: italic;
        padding: 30px 0;
      }

      @media (max-width: 768px) {
        .analytics-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 15px;
        }

        .submissions-filter {
          flex-direction: column;
          gap: 15px;
        }

        .search-box input {
          width: 100%;
        }
      }
    `,
  ],
})
export class TestAnalyticsComponent implements OnInit {
  testId: string = '';
  analytics: TestAnalytics | null = null;

  // Filtering and sorting
  searchTerm: string = '';
  sortOption: string = 'date';
  filteredSubmissions: Submission[] = [];

  constructor(
    private route: ActivatedRoute,
    private dominoTestService: DominoTestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.testId = params['id'];
      this.loadTestAnalytics();
    });
  }

  loadTestAnalytics() {
    this.dominoTestService.getTestAnalytics(this.testId).subscribe({
      next: (data) => {
        if (data) {
          this.analytics = data;
          this.filteredSubmissions = [...this.analytics.recentSubmissions];
          this.sortSubmissions();
        } else {
          this.createMockData();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.createMockData();
        this.cdr.markForCheck();
      },
    });
  }

  createMockData() {
    // Create mock analytics data for testing
    this.analytics = {
      testId: this.testId,
      testName:
        this.testId === 'd70'
          ? 'Logical Reasoning Test (D-70)'
          : 'Logical Reasoning Test',
      totalAttempts: 127,
      averageScore: 68.5,
      averageTimeSpent: 1350, // 22.5 minutes
      questionStats: [
        {
          questionId: 1,
          correctRate: 82,
          averageTimeSpent: 90,
          partialCorrectRate: 8,
          reversedAnswerRate: 2,
        },
        {
          questionId: 2,
          correctRate: 65,
          averageTimeSpent: 120,
          partialCorrectRate: 12,
          reversedAnswerRate: 5,
        },
        {
          questionId: 3,
          correctRate: 48,
          averageTimeSpent: 180,
          partialCorrectRate: 20,
          reversedAnswerRate: 10,
        },
        {
          questionId: 4,
          correctRate: 75,
          averageTimeSpent: 105,
          partialCorrectRate: 5,
          reversedAnswerRate: 3,
        },
        {
          questionId: 5,
          correctRate: 92,
          averageTimeSpent: 75,
          partialCorrectRate: 2,
          reversedAnswerRate: 1,
        },
      ],
      recentSubmissions: [
        {
          candidateId: 'c001',
          candidateName: 'John Smith',
          score: 80,
          timeSpent: 1250,
          submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
        },
        {
          candidateId: 'c002',
          candidateName: 'Emma Wilson',
          score: 95,
          timeSpent: 1100,
          submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
        },
        {
          candidateId: 'c003',
          candidateName: 'Michael Brown',
          score: 60,
          timeSpent: 1500,
          submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(), // 1 day ago
        },
        {
          candidateId: 'c004',
          candidateName: 'Sarah Davis',
          score: 45,
          timeSpent: 1800,
          submittedAt: new Date().toISOString(), // Today
        },
        {
          candidateId: 'c005',
          candidateName: 'James Johnson',
          score: 75,
          timeSpent: 1350,
          submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days ago
        },
      ],
    };

    this.filteredSubmissions = [...this.analytics.recentSubmissions];
    this.sortSubmissions();
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  filterSubmissions() {
    if (!this.analytics) return;

    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredSubmissions = [...this.analytics.recentSubmissions];
    } else {
      this.filteredSubmissions = this.analytics.recentSubmissions.filter(
        (submission) => submission.candidateName.toLowerCase().includes(term)
      );
    }

    this.sortSubmissions();
  }

  sortSubmissions() {
    switch (this.sortOption) {
      case 'date':
        this.filteredSubmissions.sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
        );
        break;
      case 'score-high':
        this.filteredSubmissions.sort((a, b) => b.score - a.score);
        break;
      case 'score-low':
        this.filteredSubmissions.sort((a, b) => a.score - b.score);
        break;
      case 'time-fast':
        this.filteredSubmissions.sort((a, b) => a.timeSpent - b.timeSpent);
        break;
      case 'time-slow':
        this.filteredSubmissions.sort((a, b) => b.timeSpent - a.timeSpent);
        break;
    }
  }

  exportData() {
    if (!this.analytics) return;

    try {
      // Create CSV content
      let csvContent = 'data:text/csv;charset=utf-8,';

      // Add test info header
      csvContent += `Test ID,${this.analytics.testId}\r\n`;
      csvContent += `Test Name,${this.analytics.testName}\r\n`;
      csvContent += `Total Attempts,${this.analytics.totalAttempts}\r\n`;
      csvContent += `Average Score,${this.analytics.averageScore}%\r\n`;
      csvContent += `Average Time,${this.formatTime(
        this.analytics.averageTimeSpent
      )}\r\n\r\n`;

      // Add question stats
      csvContent +=
        'Question ID,Correct Rate,Avg Time,Partial Correct Rate,Reversed Answer Rate\r\n';
      this.analytics.questionStats.forEach((stat) => {
        csvContent += `${stat.questionId},${
          stat.correctRate
        }%,${this.formatTime(stat.averageTimeSpent)},${
          stat.partialCorrectRate
        }%,${stat.reversedAnswerRate}%\r\n`;
      });
      csvContent += '\r\n';

      // Add submissions
      csvContent +=
        'Candidate ID,Candidate Name,Score,Time Spent,Submission Date\r\n';
      this.analytics.recentSubmissions.forEach((sub) => {
        csvContent += `${sub.candidateId},${sub.candidateName},${
          sub.score
        }%,${this.formatTime(sub.timeSpent)},${this.formatDate(
          sub.submittedAt
        )}\r\n`;
      });

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${this.analytics.testName}_analytics.csv`);
      document.body.appendChild(link);

      // Trigger download and cleanup
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  }
}
