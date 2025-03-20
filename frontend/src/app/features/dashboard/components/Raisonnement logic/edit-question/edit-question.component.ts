import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Router } from "@angular/router";
import { TestManagementService } from "../../../../../core/services/test-management.service";
import { DominoLayoutBuilderComponent } from "../../../../candidate/canvaTest/domino-layout-builder/domino-layout-builder.component";

@Component({
  selector: 'app-edit-question',
  standalone: true,
  imports: [DominoLayoutBuilderComponent, CommonModule],
  template: `
    <div class="edit-question-container">
      <div *ngIf="loading" class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading question...</p>
      </div>

      <app-domino-layout-builder
        *ngIf="!loading && question"
        [initialQuestion]="question"
        [testId]="testId"
        mode="edit"
        [returnUrl]="'/dashboard/RaisonnementLogique/Tests/' + testId"
        (save)="onQuestionSaved($event)"
        (cancel)="onCancel()"
      >
      </app-domino-layout-builder>

      <div *ngIf="!loading && !question" class="error-message">
        <p>
          Question not found. It may have been deleted or you don't have access.
        </p>
        <button (click)="goBack()">Go Back</button>
      </div>
    </div>
  `,
  styles: [
    `
      .edit-question-container {
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
export class EditQuestionComponent implements OnInit {
  testId: string = '';
  questionId: string = '';
  question: any = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testManagementService: TestManagementService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const testId = params.get('testId');
      const questionId = params.get('questionId');

      if (testId && questionId) {
        this.testId = testId;
        this.questionId = questionId;
        this.loadQuestion();
      } else {
        this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
      }
    });
  }

  loadQuestion() {
    this.loading = true;
    this.testManagementService.getQuestionById(this.questionId).subscribe(
      (question) => {
        this.question = question;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading question:', error);
        this.loading = false;
      }
    );
  }

  onQuestionSaved(question: any) {
    // Navigate back to test details
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }

  onCancel() {
    // Navigate back to test details
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }

  goBack() {
    this.router.navigate(['/dashboard/RaisonnementLogique/Tests', this.testId]);
  }
}
