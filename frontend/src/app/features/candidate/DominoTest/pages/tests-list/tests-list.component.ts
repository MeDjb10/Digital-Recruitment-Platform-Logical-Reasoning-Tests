import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DominoTestService } from '../../services/domino-test.service';

@Component({
  selector: 'app-tests-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tests-container">
      <div class="tests-header">
        <h1>Available Tests</h1>
        <p>Select a test to begin your assessment</p>
      </div>

      <div class="loading-indicator" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading available tests...</p>
      </div>

      <div class="tests-list" *ngIf="!loading">
        <!-- Iterate over all available tests -->
        <div class="test-card" *ngFor="let test of availableTests">
          <div class="test-info">
            <h2>{{ test.name }}</h2>
            <p class="description">{{ test.description }}</p>
            <div class="test-meta">
              <div class="meta-item">
                <i class="pi pi-clock"></i>
                <span>{{ test.duration }} minutes</span>
              </div>
              <div class="meta-item">
                <i class="pi pi-list"></i>
                <span>{{ test.totalQuestions }} questions</span>
              </div>
              <!-- Optionally display test type -->
              <div class="meta-item" *ngIf="test.type">
                <i class="pi pi-tag"></i>
                <span>{{
                  test.type === 'DominoQuestion'
                    ? 'Domino Logic'
                    : test.type === 'MultipleChoiceQuestion'
                    ? 'Multiple Choice'
                    : test.type
                }}</span>
              </div>
            </div>
          </div>

          <div class="test-actions">
            <!-- Link remains the same, routing handles the test ID -->
            <a
              [routerLink]="['/tests', test.id || test._id]"
              class="btn btn-primary"
              >Start Test</a
            >
          </div>
        </div>

        <div
          class="no-tests-message"
          *ngIf="!loading && availableTests.length === 0"
        >
          <p>No tests are currently available for you.</p>
          <a routerLink="/dashboard" class="btn btn-secondary"
            >Return to Dashboard</a
          >
        </div>
      </div>

      <div class="error-message" *ngIf="errorMessage">
        <p>{{ errorMessage }}</p>
        <button (click)="loadTests()" class="btn btn-secondary">Retry</button>
      </div>
    </div>
  `,
  styles: [
    `
      .tests-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 40px 20px;
      }

      .tests-header {
        margin-bottom: 30px;
        text-align: center;
      }

      .tests-header h1 {
        font-size: 32px;
        margin-bottom: 10px;
        color: #1e293b;
      }

      .tests-header p {
        font-size: 18px;
        color: #64748b;
      }

      .loading-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px 0;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 4px solid #e2e8f0;
        border-top-color: #3b82f6;
        animation: spinner 1s linear infinite;
        margin-bottom: 15px;
      }

      @keyframes spinner {
        to {
          transform: rotate(360deg);
        }
      }

      .tests-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 20px;
      }

      .test-card {
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .test-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      }

      .test-info {
        padding: 24px;
        flex-grow: 1;
      }

      .test-info h2 {
        font-size: 22px;
        margin: 0 0 12px;
        color: #1e293b;
      }

      .description {
        color: #64748b;
        margin-bottom: 20px;
        line-height: 1.5;
        min-height: 4.5em; /* Ensure space for ~3 lines */
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 3; /* Limit to 3 lines */
        -webkit-box-orient: vertical;
      }

      .test-meta {
        display: flex;
        flex-wrap: wrap; /* Allow wrapping */
        gap: 15px; /* Adjusted gap */
        margin-top: 20px;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #64748b;
        font-size: 14px;
      }

      .test-actions {
        padding: 16px 24px;
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
      }

      .btn-primary {
        background-color: #3b82f6;
        color: white;
        border: none;
      }

      .btn-primary:hover {
        background-color: #2563eb;
      }

      .btn-secondary {
        background-color: #f1f5f9;
        color: #334155;
        border: 1px solid #e2e8f0;
      }

      .btn-secondary:hover {
        background-color: #e2e8f0;
      }

      .no-tests-message {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .no-tests-message p {
        margin-bottom: 20px;
        color: #64748b;
        font-size: 18px;
      }

      .error-message {
        text-align: center;
        padding: 30px;
        background-color: #fee2e2;
        border-radius: 12px;
        margin-top: 30px;
        color: #b91c1c;
      }

      .error-message p {
        margin-bottom: 20px;
      }

      @media (max-width: 768px) {
        .tests-list {
          grid-template-columns: 1fr;
        }
        .description {
          min-height: auto; /* Remove min-height on small screens */
        }
      }
    `,
  ],
})
export class TestsListComponent implements OnInit {
  availableTests: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';

  constructor(
    private dominoTestService: DominoTestService, // Service name is okay, it fetches all tests now
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadTests();
  }

  loadTests() {
    this.loading = true;
    this.errorMessage = '';

    // This service method now fetches all test types
    this.dominoTestService.getAvailableTests().subscribe({
      next: (tests) => {
        console.log('Available tests loaded:', tests);
        this.availableTests = tests;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading tests:', error);
        this.errorMessage =
          error.message ||
          'Unable to load available tests. Please try again later.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
