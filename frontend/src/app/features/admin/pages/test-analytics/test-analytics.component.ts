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
            <tr *ngFor="let submission of paginatedSubmissions">
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

        <div class="pagination-controls" *ngIf="totalPages > 1">
          <button
            class="btn"
            (click)="goToPage(currentPage - 1)"
            [disabled]="currentPage === 1"
          >
            Previous
          </button>
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            class="btn"
            (click)="goToPage(currentPage + 1)"
            [disabled]="currentPage === totalPages"
          >
            Next
          </button>
        </div>
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

  // Add pagination for better performance with large datasets
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // Add visualization options
  showChart: boolean = true;
  chartType: 'bar' | 'line' | 'pie' = 'bar';

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
        this.analytics = data;
        this.filteredSubmissions = [...(data.recentSubmissions || [])];
        this.calculateTotalPages();
        this.sortSubmissions(); // Apply default sorting
        this.cdr.markForCheck();
      },
      error: () => {
        this.createMockData(); // Fallback to mock data if API fails
        this.cdr.markForCheck();
      },
    });
  }

  createMockData() {
    // Create mock analytics data for testing
    this.analytics = {
      testId: this.testId,
      testName: `Test ${this.testId.toUpperCase()}`,
      totalAttempts: 50,
      averageScore: 72.5,
      averageTimeSpent: 1500, // 25 minutes
      questionStats: [
        // Sample question stats
        {
          questionId: 1,
          correctRate: 80,
          averageTimeSpent: 120,
          partialCorrectRate: 10,
          reversedAnswerRate: 5,
        },
        // Add more mock question stats...
      ],
      recentSubmissions: [
        // Sample submissions
        {
          candidateId: 'user1',
          candidateName: 'John Smith',
          score: 85,
          timeSpent: 1250,
          submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        // Add more mock submissions...
      ],
    };

    // Set the filtered submissions
    this.filteredSubmissions = [...this.analytics.recentSubmissions];
    this.calculateTotalPages();
  }

  // Improved time formatting with more readable output
  formatTime(seconds?: number): string {
    if (!seconds) return '0m 0s';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  }

  // Better date formatting with options
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Enhanced filtering with more options
  filterSubmissions() {
    if (!this.analytics) return;

    const searchTermLower = this.searchTerm.toLowerCase();

    if (!searchTermLower) {
      this.filteredSubmissions = [...this.analytics.recentSubmissions];
    } else {
      this.filteredSubmissions = this.analytics.recentSubmissions.filter(
        (submission) =>
          submission.candidateName.toLowerCase().includes(searchTermLower)
      );
    }

    this.sortSubmissions();
    this.calculateTotalPages();
    this.currentPage = 1; // Reset to first page after filtering
    this.cdr.markForCheck();
  }

  // Enhanced sorting with more options
  sortSubmissions() {
    if (!this.filteredSubmissions) return;

    switch (this.sortOption) {
      case 'date':
        this.filteredSubmissions.sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
        );
        break;
      case 'date-oldest':
        this.filteredSubmissions.sort(
          (a, b) =>
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime()
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
      case 'name-asc':
        this.filteredSubmissions.sort((a, b) =>
          a.candidateName.localeCompare(b.candidateName)
        );
        break;
      case 'name-desc':
        this.filteredSubmissions.sort((a, b) =>
          b.candidateName.localeCompare(a.candidateName)
        );
        break;
    }

    this.cdr.markForCheck();
  }

  // New method for pagination
  calculateTotalPages() {
    if (!this.filteredSubmissions) {
      this.totalPages = 1;
      return;
    }

    this.totalPages = Math.ceil(
      this.filteredSubmissions.length / this.itemsPerPage
    );
    if (this.totalPages === 0) this.totalPages = 1;
  }

  // Get paginated submissions
  get paginatedSubmissions(): Submission[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSubmissions.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  // Pagination controls
  goToPage(page: number) {
    if (page < 1) page = 1;
    if (page > this.totalPages) page = this.totalPages;
    this.currentPage = page;
    this.cdr.markForCheck();
  }

  // Export data to CSV
  exportData() {
    if (!this.analytics) return;

    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';

    // Add header
    csvContent += 'Candidate,Score,Time Spent,Date\n';

    // Add submission data
    this.filteredSubmissions.forEach((sub) => {
      csvContent += `"${sub.candidateName}",${sub.score},"${this.formatTime(
        sub.timeSpent
      )}","${this.formatDate(sub.submittedAt)}"\n`;
    });

    // Create download link and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${this.analytics.testName}-analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Toggle chart visibility
  toggleChartView() {
    this.showChart = !this.showChart;
    this.cdr.markForCheck();
  }

  // Switch chart type
  setChartType(type: 'bar' | 'line' | 'pie') {
    this.chartType = type;
    this.cdr.markForCheck();
  }
}
