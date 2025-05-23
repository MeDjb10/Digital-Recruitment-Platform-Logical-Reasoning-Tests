import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DominoTestService } from '../../services/domino-test.service';

import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { UserService } from '../../../../../core/services/user.service';
import { TestService } from '../../../../../core/services/test.service';
import { AuthService } from '../../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-tests-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [UserService, TestService, AuthService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tests-container">
      <div class="tests-header">
        <h1>Your Assigned Tests</h1>
        <p>Complete your assigned assessment tests</p>
      </div>

      <div class="loading-indicator" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading your assigned tests...</p>
      </div>

      <div class="tests-list" *ngIf="!loading && assignedTests.length > 0">
        <div
          class="test-card"
          *ngFor="let test of assignedTests; trackBy: trackByTestId"
        >
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
              <div class="meta-item" *ngIf="test.difficulty">
                <i class="pi pi-star"></i>
                <span>{{ test.difficulty | titlecase }}</span>
              </div>
              <div class="meta-item" *ngIf="test.category">
                <i class="pi pi-tag"></i>
                <span>{{ test.category | titlecase }}</span>
              </div>
              <div class="meta-item" *ngIf="test.isMainTest">
                <i class="pi pi-bookmark"></i>
                <span>Main Test</span>
              </div>
              <div class="meta-item" *ngIf="!test.isMainTest">
                <i class="pi pi-plus"></i>
                <span>Additional Test</span>
              </div>
            </div>
          </div>

          <div class="test-actions">
            <a
              [routerLink]="['/tests', test._id || test.id]"
              class="btn btn-primary"
            >
              Start Test
            </a>
          </div>
        </div>
      </div>

      <!-- Assignment Info Display -->
      <div class="assignment-info" *ngIf="!loading && testAssignment">
        <div class="info-card">
          <h3>Assignment Details</h3>
          <div class="assignment-details">
            <p>
              <strong>Assignment Date:</strong>
              {{ testAssignment.assignmentDate | date : 'medium' }}
            </p>
            <p *ngIf="testAssignment.examDate">
              <strong>Exam Date:</strong>
              {{ testAssignment.examDate | date : 'medium' }}
            </p>
            <p *ngIf="testAssignment.assignedBy">
              <strong>Assigned By:</strong>
              {{ testAssignment.assignedBy.firstName }}
              {{ testAssignment.assignedBy.lastName }}
            </p>
            <p>
              <strong>Assignment Type:</strong>
              {{
                testAssignment.isManualAssignment
                  ? 'Manual Assignment'
                  : 'Automatic Assignment'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- No Tests Message -->
      <div
        class="no-tests-message"
        *ngIf="!loading && assignedTests.length === 0 && !errorMessage"
      >
        <div class="message-content">
          <i class="pi pi-info-circle"></i>
          <h3>No Tests Assigned</h3>
          <p *ngIf="authorizationStatus === 'not_submitted'">
            You haven't submitted a test authorization request yet.
          </p>
          <p *ngIf="authorizationStatus === 'pending'">
            Your test authorization request is pending approval.
          </p>
          <p *ngIf="authorizationStatus === 'rejected'">
            Your test authorization request was rejected. Please contact an
            administrator.
          </p>
          <p *ngIf="authorizationStatus === 'approved'">
            You are approved for testing, but no tests have been assigned yet.
            Please contact an administrator.
          </p>
          <a routerLink="/dashboard" class="btn btn-secondary"
            >Return to Dashboard</a
          >
        </div>
      </div>

      <!-- Error Message -->
      <div class="error-message" *ngIf="errorMessage">
        <i class="pi pi-exclamation-triangle"></i>
        <h3>Unable to Load Tests</h3>
        <p>{{ errorMessage }}</p>
        <button (click)="loadAssignedTests()" class="btn btn-secondary">
          Try Again
        </button>
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
        margin-bottom: 30px;
      }

      .test-card {
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s, box-shadow 0.2s;
        border-left: 4px solid #3b82f6;
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
        min-height: 4.5em;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }

      .test-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
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

      .assignment-info {
        margin-bottom: 30px;
      }

      .info-card {
        background-color: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 12px;
        padding: 24px;
      }

      .info-card h3 {
        color: #0369a1;
        margin: 0 0 16px;
        font-size: 18px;
      }

      .assignment-details p {
        margin: 8px 0;
        color: #374151;
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
        border: none;
      }

      .btn-primary {
        background-color: #3b82f6;
        color: white;
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

      .no-tests-message,
      .error-message {
        text-align: center;
        padding: 40px;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .message-content i,
      .error-message i {
        font-size: 48px;
        color: #64748b;
        margin-bottom: 16px;
      }

      .error-message i {
        color: #ef4444;
      }

      .message-content h3,
      .error-message h3 {
        color: #1e293b;
        margin-bottom: 12px;
      }

      .message-content p,
      .error-message p {
        color: #64748b;
        margin-bottom: 24px;
        line-height: 1.6;
      }

      @media (max-width: 768px) {
        .tests-list {
          grid-template-columns: 1fr;
        }

        .description {
          min-height: auto;
        }

        .tests-container {
          padding: 20px 10px;
        }
      }
    `,
  ],
})
export class TestsListComponent implements OnInit {
  assignedTests: any[] = [];
  testAssignment: any = null;
  authorizationStatus: string = 'not_submitted';
  loading: boolean = true;
  errorMessage: string = '';

  constructor(
    private userService: UserService,
    private testService: TestService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadAssignedTests();
  }

  loadAssignedTests() {
    this.loading = true;
    this.errorMessage = '';
    this.assignedTests = [];

    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId) {
      this.errorMessage = 'User not authenticated. Please log in again.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Get user's test assignment
    this.userService
      .getUserTestAssignment(currentUserId)
      .pipe(
        switchMap((response) => {
          if (!response.success || !response.data) {
            throw new Error('No test assignment found');
          }

          this.testAssignment = response.data;

          // Collect all test IDs (main + additional)
          const testIds: string[] = [];

          if (response.data.assignedTestId) {
            testIds.push(response.data.assignedTestId);
          }

          if (
            response.data.additionalTestIds &&
            response.data.additionalTestIds.length > 0
          ) {
            testIds.push(...response.data.additionalTestIds);
          }

          if (testIds.length === 0) {
            throw new Error('No test IDs found in assignment');
          }

          // Fetch all assigned tests
          const testRequests = testIds.map((testId, index) =>
            this.testService.getTestById(testId).pipe(
              catchError((error) => {
                console.error(`Error loading test ${testId}:`, error);
                return of(null); // Return null for failed requests
              })
            )
          );

          return forkJoin(testRequests);
        }),
        catchError((error) => {
          console.error('Error loading test assignment:', error);

          // Handle specific error cases
          if (error.message.includes('not approved')) {
            this.authorizationStatus = 'pending'; // or extract from error
          } else if (error.message.includes('No test assignment')) {
            this.authorizationStatus = 'approved'; // approved but no assignment
          }

          return of([]); // Return empty array on error
        })
      )
      .subscribe({
        next: (testResponses) => {
          // Filter out null responses and extract test data
          this.assignedTests = testResponses
            .filter((response: any) => response?.success && response?.data)
            .map((response: any, index: number) => ({
              ...response.data,
              isMainTest: index === 0, // First test is the main test
            }));

          console.log('Loaded assigned tests:', this.assignedTests);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error in loadAssignedTests:', error);
          this.errorMessage =
            error.message || 'Failed to load assigned tests. Please try again.';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // TrackBy function for better performance
  trackByTestId(index: number, test: any): string {
    return test._id || test.id || index.toString();
  }
}
