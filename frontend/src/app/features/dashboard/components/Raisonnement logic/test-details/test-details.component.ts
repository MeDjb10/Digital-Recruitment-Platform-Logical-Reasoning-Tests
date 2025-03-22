import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TestManagementService } from '../../../../../core/services/test-management.service';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-test-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="test-details-container" *ngIf="test">
      <div class="test-header">
        <div class="test-info">
          <h1>{{ test.name }}</h1>
          <p class="description">{{ test.description }}</p>
          <div class="metadata">
            <span class="badge difficulty-{{ test.difficulty }}">{{
              test.difficulty
            }}</span>
            <span class="meta-item"
              ><i class="pi pi-clock"></i> {{ test.duration }} minutes</span
            >
            <span class="meta-item"
              ><i class="pi pi-list"></i>
              {{ test.totalQuestions }} questions</span
            >
          </div>
        </div>
        <div class="actions">
          <button
            pButton
            label="Edit Test"
            icon="pi pi-pencil"
            class="p-button-outlined"
            [routerLink]="[
              '/dashboard/RaisonnementLogique/Tests/edit',
              test.id
            ]"
          ></button>
          <button
            pButton
            label="Preview Test"
            icon="pi pi-eye"
            class="p-button-outlined"
          ></button>
          <button
            pButton
            label="Delete"
            icon="pi pi-trash"
            class="p-button-outlined p-button-danger"
            (click)="confirmDeleteTest()"
          ></button>
        </div>
      </div>

      <div class="questions-section">
        <div class="section-header">
          <h2>Questions</h2>
          <button
            pButton
            label="Add New Question"
            icon="pi pi-plus"
            [routerLink]="[
              '/dashboard/RaisonnementLogique/Tests',
              test.id,
              'questions',
              'create'
            ]"
          ></button>
        </div>

        <div class="questions-list" *ngIf="questions.length > 0">
          <div
            class="question-card"
            *ngFor="let question of questions; let i = index"
          >
            <div class="question-header">
              <span class="question-number">Question {{ i + 1 }}</span>
              <span class="badge difficulty-{{ question.difficulty }}">{{
                question.difficulty
              }}</span>
            </div>
            <h3>{{ question.title || 'Untitled Question' }}</h3>
            <p>{{ question.instruction }}</p>
            <p class="pattern">
              <strong>Pattern:</strong> {{ question.pattern }}
            </p>
            <div class="card-actions">
              <button
                pButton
                icon="pi pi-pencil"
                label="Edit"
                class="p-button-sm p-button-outlined"
                [routerLink]="[
                  '/dashboard/RaisonnementLogique/Tests',
                  test.id,
                  'questions',
                  question.id,
                  'edit'
                ]"
              ></button>
              <button
                pButton
                icon="pi pi-trash"
                label="Delete"
                class="p-button-sm p-button-outlined p-button-danger"
                (click)="confirmDeleteQuestion(question.id)"
              ></button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="questions.length === 0">
          <p>This test has no questions yet.</p>
          <button
            pButton
            label="Add First Question"
            icon="pi pi-plus"
            [routerLink]="[
              '/dashboard/RaisonnementLogique/Tests',
              test.id,
              'questions',
              'create'
            ]"
          ></button>
        </div>
      </div>
    </div>

    <div class="loading-container" *ngIf="loading">
      <div class="spinner"></div>
      <p>Loading test details...</p>
    </div>

    <!-- PrimeNG Components -->
    <p-toast></p-toast>
    <p-confirmDialog
      header="Confirm Deletion"
      icon="pi pi-exclamation-triangle"
    ></p-confirmDialog>
  `,
  styles: [
    `
      .test-details-container {
        padding: 1.5rem;
      }

      .test-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .test-info {
        flex: 1;
      }

      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
        color: #1e293b;
      }

      .description {
        color: #64748b;
        margin-bottom: 1rem;
      }

      .metadata {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .difficulty-easy {
        background: #d1fae5;
        color: #047857;
      }

      .difficulty-medium {
        background: #e0f2fe;
        color: #0369a1;
      }

      .difficulty-hard {
        background: #fef3c7;
        color: #b45309;
      }

      .difficulty-expert {
        background: #fee2e2;
        color: #b91c1c;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: #64748b;
        font-size: 0.875rem;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
      }

      .questions-section {
        margin-top: 2rem;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .section-header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #334155;
      }

      .questions-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
      }

      .question-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        padding: 1.25rem;
        position: relative;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
      }

      .question-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
      }

      .question-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .question-number {
        font-weight: 600;
        color: #64748b;
        font-size: 0.875rem;
      }

      .question-card h3 {
        margin: 0 0 0.5rem;
        font-size: 1.125rem;
        color: #1e293b;
      }

      .question-card p {
        margin: 0 0 0.5rem;
        color: #475569;
        font-size: 0.9375rem;
      }

      .pattern {
        font-size: 0.875rem;
        background: #f8fafc;
        padding: 0.5rem;
        border-radius: 4px;
        margin-top: 0.75rem;
      }

      .card-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .empty-state {
        text-align: center;
        padding: 3rem 0;
        background: #f8fafc;
        border-radius: 8px;
      }

      .empty-state p {
        margin-bottom: 1rem;
        color: #64748b;
        font-size: 1rem;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 70vh;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid #e2e8f0;
        border-top-color: #3b82f6;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class TestDetailsComponent implements OnInit {
  test: any;
  questions: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testManagementService: TestManagementService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const testId = params.get('testId');
      if (testId) {
        this.loadTest(testId);
      }
    });
  }

  loadTest(testId: string) {
    this.loading = true;
    this.testManagementService.getTestById(testId).subscribe(
      (test) => {
        this.test = test;
        this.loadQuestions(testId);
      },
      (error) => {
        console.error('Error loading test:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load test details. Please try again.',
        });
      }
    );
  }

  loadQuestions(testId: string) {
    this.testManagementService.getQuestionsByTestId(testId).subscribe(
      (questions) => {
        this.questions = questions;
        this.loading = false;
      },
      (error) => {
        console.error('Error loading questions:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load questions. Please try again.',
        });
      }
    );
  }

  confirmDeleteQuestion(questionId: string) {
    this.confirmationService.confirm({
      message:
        'Are you sure you want to delete this question? This action cannot be undone.',
      accept: () => {
        this.deleteQuestion(questionId);
      },
    });
  }

  confirmDeleteTest() {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the test "${this.test.name}"? This will permanently remove all associated questions.`,
      accept: () => {
        this.deleteTest(this.test.id);
      },
    });
  }

  deleteQuestion(questionId: string) {
    this.testManagementService.deleteQuestion(questionId).subscribe(
      () => {
        this.questions = this.questions.filter((q) => q.id !== questionId);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Question deleted successfully',
        });
      },
      (error) => {
        console.error('Error deleting question:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete question. Please try again.',
        });
      }
    );
  }

  deleteTest(testId: string) {
    this.testManagementService.deleteTest(testId).subscribe(
      () => {
        this.router.navigate(['/dashboard/RaisonnementLogique/Tests']);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Test deleted successfully',
        });
      },
      (error) => {
        console.error('Error deleting test:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete test. Please try again.',
        });
      }
    );
  }
}
