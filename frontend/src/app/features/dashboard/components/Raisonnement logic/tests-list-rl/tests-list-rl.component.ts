import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TestManagementService } from '../../../../../core/services/test-management.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Test } from '../../../../../core/models/test.model';


@Component({
  selector: 'app-tests-list-rl',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="tests-container">
      <div class="header">
        <h1>Logical Reasoning Tests</h1>
        <div class="header-actions">
          <button
            pButton
            label="Create New Test"
            icon="pi pi-plus"
            [routerLink]="['/dashboard/RaisonnementLogique/Tests/create']"
          ></button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <p-progressSpinner></p-progressSpinner>
        <p>Loading tests...</p>
      </div>

      <div class="tests-list" *ngIf="!loading && tests.length > 0">
        <p-table
          [value]="tests"
          styleClass="p-datatable-sm"
          [paginator]="tests.length > 10"
          [rows]="10"
          [rowHover]="true"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Questions</th>
              <th>Duration</th>
              <th>Difficulty</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-test>
            <tr>
              <td>
                <div class="test-name">
                  <span class="name">{{ test.name }}</span>
                  <span class="description">{{ test.description }}</span>
                </div>
              </td>
              <td>{{ test.totalQuestions }}</td>
              <td>{{ test.duration }} min</td>
              <td>
                <span class="status-badge difficulty-{{ test.difficulty }}">
                  {{ test.difficulty }}
                </span>
              </td>
              <td>
                <span
                  class="status-badge"
                  [ngClass]="{
                    'status-active': test.isActive,
                    'status-inactive': !test.isActive
                  }"
                >
                  {{ test.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div class="actions-cell">
                  <button
                    pButton
                    pRipple
                    icon="pi pi-eye"
                    [routerLink]="[
                      '/dashboard/RaisonnementLogique/Tests',
                      test.id
                    ]"
                    class="p-button-rounded p-button-text"
                    title="View Details"
                  ></button>

                  <button
                    pButton
                    pRipple
                    icon="pi pi-pencil"
                    [routerLink]="[
                      '/dashboard/RaisonnementLogique/Tests/edit',
                      test.id || test._id
                    ]"
                    class="p-button-rounded p-button-text"
                    title="Edit"
                  ></button>

                  <button
                    pButton
                    pRipple
                    icon="pi pi-trash"
                    (click)="confirmDelete(test)"
                    class="p-button-rounded p-button-text p-button-danger"
                    title="Delete"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="empty-message">
                No tests found. Create your first test by clicking the "Create
                New Test" button.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <div class="empty-state" *ngIf="!loading && tests.length === 0">
        <div class="empty-image">
          <i class="pi pi-list" style="font-size: 3rem"></i>
        </div>
        <h2>No Tests Found</h2>
        <p>Get started by creating your first logical reasoning test</p>
        <button
          pButton
          label="Create New Test"
          icon="pi pi-plus"
          [routerLink]="['/dashboard/RaisonnementLogique/Tests/create']"
        ></button>
      </div>
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
      .tests-container {
        padding: 1.5rem;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .header h1 {
        margin: 0;
        font-size: 1.5rem;
        color: #1e293b;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 3rem 0;
      }

      .loading p {
        margin-top: 1rem;
        color: #64748b;
      }

      .tests-list {
        margin-bottom: 2rem;
      }

      .test-name {
        display: flex;
        flex-direction: column;
      }

      .test-name .name {
        font-weight: 500;
        color: #1e293b;
      }

      .test-name .description {
        font-size: 0.875rem;
        color: #64748b;
        margin-top: 0.25rem;
      }

      .status-badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: capitalize;
      }

      .difficulty-easy {
        background-color: #d1fae5;
        color: #047857;
      }

      .difficulty-medium {
        background-color: #e0f2fe;
        color: #0369a1;
      }

      .difficulty-hard {
        background-color: #fef3c7;
        color: #b45309;
      }

      .difficulty-expert {
        background-color: #fee2e2;
        color: #b91c1c;
      }

      .status-active {
        background-color: #dcfce7;
        color: #16a34a;
      }

      .status-inactive {
        background-color: #f1f5f9;
        color: #64748b;
      }

      .actions-cell {
        display: flex;
        gap: 0.25rem;
      }

      .empty-message {
        text-align: center;
        padding: 1.5rem;
        color: #64748b;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        background-color: #f8fafc;
        border-radius: 0.5rem;
        text-align: center;
      }

      .empty-image {
        width: 6rem;
        height: 6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #e2e8f0;
        border-radius: 50%;
        margin-bottom: 1.5rem;
        color: #64748b;
      }

      .empty-state h2 {
        margin: 0 0 0.5rem;
        color: #1e293b;
      }

      .empty-state p {
        margin: 0 0 1.5rem;
        color: #64748b;
      }
    `,
  ],
})
export class TestsListRLComponent implements OnInit {
  tests: Test[] = [];
  loading = true;

  constructor(
    private testService: TestManagementService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadTests();
  }

  loadTests(): void {
    this.loading = true;
    this.testService.getAllTests().subscribe(
      (tests) => {
        // Filter only logical reasoning tests if needed
        this.tests = tests.filter(
          (test) => test.category === 'logical'
        );
        this.loading = false;
      },
      (error) => {
        console.error('Error loading tests:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tests. Please try again.',
        });
        this.loading = false;
      }
    );
  }

  confirmDelete(test: Test): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the test "${test.name}"? This will permanently remove all associated questions.`,
      accept: () => {
        this.deleteTest(test._id);
      },
    });
  }

  deleteTest(testId: string): void {
    this.testService.deleteTest(testId).subscribe(
      () => {
        this.tests = this.tests.filter((t) => t._id !== testId);
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
