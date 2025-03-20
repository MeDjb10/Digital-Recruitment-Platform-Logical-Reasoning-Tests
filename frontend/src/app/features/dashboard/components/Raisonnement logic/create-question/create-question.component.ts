import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DominoLayoutBuilderComponent } from '../../../../candidate/canvaTest/domino-layout-builder/domino-layout-builder.component';
import { TestManagementService } from '../../../../../core/services/test-management.service';

@Component({
  selector: 'app-create-question',
  standalone: true,
  imports: [CommonModule, DominoLayoutBuilderComponent],
  template: `
    <div class="create-question-container">
      <div *ngIf="loading" class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading test information...</p>
      </div>

      <app-domino-layout-builder
        *ngIf="!loading && testId"
        [testId]="testId"
        mode="create"
        [returnUrl]="'/dashboard/RaisonnementLogique/Tests/' + testId"
        (save)="onQuestionSaved($event)"
        (cancel)="onCancel()"
      ></app-domino-layout-builder>

      <div *ngIf="!loading && !testId" class="error-message">
        <p>Test not found. Please check the test ID and try again.</p>
        <button (click)="goBack()">Go Back</button>
      </div>
    </div>
  `,
  styles: [
    `
      .create-question-container {
        height: 100%;
      }

      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 50vh;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid #e2e8f0;
        border-top-color: #3b82f6;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .error-message {
        text-align: center;
        padding: 2rem;
        margin: 2rem auto;
        max-width: 400px;
        background: #fee2e2;
        border-radius: 8px;
        color: #b91c1c;
      }

      .error-message button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    `,
  ],
})
export class CreateQuestionComponent implements OnInit {
  testId: string | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testService: TestManagementService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const testId = params.get('testId');
      if (testId) {
        this.testId = testId;
        this.verifyTest(testId);
      } else {
        this.loading = false;
      }
    });
  }

  verifyTest(testId: string): void {
    this.testService.getTestById(testId).subscribe({
      next: (test) => {
        if (test) {
          this.loading = false;
        } else {
          this.testId = null;
          this.loading = false;
        }
      },
      error: () => {
        this.testId = null;
        this.loading = false;
      },
    });
  }

  onQuestionSaved(question: any): void {
    // Question was successfully saved via the layout builder
    // Will be redirected by the layout builder based on returnUrl
  }

  onCancel(): void {
    this.goBack();
  }

  goBack(): void {
    if (this.testId) {
      this.router.navigate([
        '/dashboard/RaisonnementLogique/Tests',
        this.testId,
      ]);
    } else {
      this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
    }
  }
}
